import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      // No custom issuer — defaults to /common/ which avoids UUID regex bug in the provider.
      // Tenant restriction is enforced in the signIn callback below.
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "microsoft-entra-id") return false;

      const email = user.email;
      const name = user.name ?? email ?? "Unknown";
      if (!email) return false;

      // Auto-create user on first sign-in; first user becomes ADMIN
      const count = await prisma.user.count();
      await prisma.user.upsert({
        where: { email },
        update: { name },
        create: {
          email,
          name,
          role: count === 0 ? "ADMIN" : "EMPLOYEE",
        },
      });

      return true;
    },

    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
});
