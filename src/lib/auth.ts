import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || undefined;

if (!secret && process.env.NODE_ENV !== "test") {
  console.warn("[Auth] AUTH_SECRET fehlt – Anmeldung kann fehlschlagen. Setze AUTH_SECRET in .env");
}

const baseUrl = process.env.NEXTAUTH_URL || "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: secret || "handwerker-software-secret-key-2024",
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Anmeldedaten",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.isActive) return null;

          const { compare } = await import("bcryptjs");
          const isValid = await compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          };
        } catch (err) {
          console.error("[Auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
});
