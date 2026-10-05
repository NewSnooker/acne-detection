import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { isGoogleEnabled } from "./auth/google";
import { authorizeCredentials } from "./auth/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    // ลงทะเบียน Google เฉพาะเมื่อมี GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET
    ...(isGoogleEnabled()
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    // ตรวจอีเมลและรหัสผ่านใน lib/auth/credentials.ts
    Credentials({ authorize: authorizeCredentials }),
  ],
});
