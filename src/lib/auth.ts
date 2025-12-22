import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authPrisma } from "@/lib/auth-db";
import type { UserRole } from "@prisma/client";

// Extend the session type to include role
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}

// Optional: Domain restriction configuration
const ALLOWED_DOMAINS = process.env.ALLOWED_EMAIL_DOMAINS?.split(",").filter(Boolean) || [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(authPrisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    // Control sign-in: optionally restrict to specific domains
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        // Domain restriction (optional)
        if (ALLOWED_DOMAINS.length > 0) {
          const emailDomain = user.email.split("@")[1];
          if (!ALLOWED_DOMAINS.includes(emailDomain)) {
            return false; // Reject sign-in
          }
        }
        return true;
      }
      return true;
    },
    // Add role to session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch user role from database
        const dbUser = await authPrisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role || "USER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
  trustHost: true,
});
