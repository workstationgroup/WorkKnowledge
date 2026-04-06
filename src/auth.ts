import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { customFetch } from "@auth/core";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    // Use tenant-specific endpoint (single-tenant apps require this, per AADSTS50194).
    // customFetch patches the OIDC discovery issuer to work around a bug in the provider:
    // the callback code uses /(\w+)/ to capture the tenant segment, which stops at "-" in
    // a UUID, then replaces the partial match causing a doubled UUID in the re-discovery URL.
    // Fix: return "common" in the discovery issuer so the callback's replace("common", tid)
    // produces the correct tenant-specific URL.
    (() => {
      const provider = MicrosoftEntraID({
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any)[customFetch] = async (...args: Parameters<typeof fetch>) => {
        const url = new URL(args[0] instanceof Request ? args[0].url : (args[0] as string));
        if (url.pathname.endsWith(".well-known/openid-configuration")) {
          const response = await fetch(...args);
          const json = await response.clone().json() as Record<string, unknown>;
          const issuer = (json.issuer as string).replace(process.env.AZURE_TENANT_ID!, "common");
          return Response.json({ ...json, issuer });
        }
        return fetch(...args);
      };
      return provider;
    })(),
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
