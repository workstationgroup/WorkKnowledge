import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "EMPLOYEE";
      canManageLessons: boolean;
    } & DefaultSession["user"];
  }
}
