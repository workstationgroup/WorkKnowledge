import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  logger: {
    error(error: unknown) {
      const msg = error instanceof Error
        ? `${error.name}: ${error.message} | cause: ${JSON.stringify((error as Error & { cause?: unknown }).cause ?? "none")}`
        : JSON.stringify(error);
      prisma.setting.upsert({ where: { key: "auth_last_error" }, update: { value: msg }, create: { key: "auth_last_error", value: msg } }).catch(() => {});
    },
  },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      // Use tenant-specific issuer so the OIDC discovery doc has the real issuer URL
      // (no {tenantid} placeholder), making iss validation pass.
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
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
