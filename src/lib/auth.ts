import { NextAuthOptions, DefaultSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: Role;
            username: string | null;
            isGuest: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: Role;
        username: string | null;
        isGuest: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role;
        username: string | null;
        isGuest: boolean;
    }
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                }),
            ]
            : []),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                isGuest: { label: "Guest", type: "text" }, // "true" or "false"
            },
            async authorize(credentials) {
                if (!credentials?.username) return null;

                // GUEST LOGIN LOGIC
                if (credentials.isGuest === "true") {
                    // Ensure user doesn't exist or find existing guest?
                    // Actually, Guest login usually creates a new user or finds one.
                    // For simplicity, if logging in as guest, we might just create a user if not exists, 
                    // BUT we need unique usernames.
                    // If user inputs JUST username for guest.

                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username }
                    });

                    if (user) {
                        if (user.isGuest) return user;
                        // If exists but not guest, require password (fail this strategy)
                        throw new Error("Username already taken by a registered user.");
                    }

                    // Create new guest user
                    const newUser = await prisma.user.create({
                        data: {
                            username: credentials.username,
                            name: credentials.username,
                            role: "PLAYER",
                            isGuest: true,
                            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${credentials.username}`
                        }
                    });
                    return newUser;
                }

                // REGISTERED USER LOGIN LOGIC
                const user = await prisma.user.findUnique({
                    where: { username: credentials.username }
                });

                if (!user || !user.password) { // If no password, maybe google user
                    // If user exists but has no password (e.g. Google user tried credential login, or created as guest previously?)
                    // If it was guest, we might allow 'claiming' the account, but that's complex.
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password || "", user.password);

                if (!isValid) {
                    return null;
                }

                return user;
            }
        }),
    ],
    callbacks: {
        async session({ token, session }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.username = token.username;
                session.user.isGuest = token.isGuest;
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.username = user.username;
                token.isGuest = user.isGuest;
            }
            return token;
        },
    },
    pages: {
        signIn: "/auth/signin", // Custom signin page
    },
};
