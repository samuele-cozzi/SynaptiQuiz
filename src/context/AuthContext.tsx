'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    signOut as firebaseSignOut
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Player } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null; // Firebase User
    player: Player | null; // Our App Player
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithUsername: (username: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // If logged in, find the associated player
                await fetchPlayerProfile(firebaseUser);
            } else {
                setPlayer(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const fetchPlayerProfile = async (firebaseUser: User) => {
        // 1. Try to find player by Auth ID (direct linkage)
        const playerDocRef = doc(db, 'players', firebaseUser.uid);
        const playerDoc = await getDoc(playerDocRef);

        if (playerDoc.exists()) {
            setPlayer(playerDoc.data() as Player);
        } else {
            // If no player doc exists for this UID, we might need to create it (Google Auth does this)
            // BUT for Username auth, we handle it inside loginWithUsername usually.
            // If we are here via Google Auth and it's 1st time:
            if (!playerDoc.exists() && !firebaseUser.isAnonymous) {
                // Create new player for Google User
                const playersRef = collection(db, 'players');
                const q = query(playersRef);
                const snapshot = await getDocs(q);
                const isFirstPlayer = snapshot.empty;

                const newPlayer: Player = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || 'Player',
                    avatarUrl: firebaseUser.photoURL || '',
                    isAdmin: isFirstPlayer, // First player is admin logic
                    email: firebaseUser.email || undefined,
                    createdAt: Date.now(),
                };
                await setDoc(playerDocRef, newPlayer);
                setPlayer(newPlayer);
            }
        }
    };

    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error("Google login error", error);
            throw error;
        }
    };

    const loginWithUsername = async (username: string) => {
        try {
            if (!username.trim()) return;

            // "Without password" logic:
            // 1. Sign in anonymously to get a secure token allow Firestore access
            if (!user) {
                await signInAnonymously(auth);
            }

            // 2. Check if username exists in 'players'
            const playersRef = collection(db, 'players');
            const q = query(playersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Player exists: Login as them (Insecure Mode as requested)
                const existingPlayer = querySnapshot.docs[0].data() as Player;
                setPlayer(existingPlayer);
                // Note: The Firebase User UID (anon) might NOT match the Player ID if the player was created before.
                // If we strictly want to be that player, we just use local state 'player'.
                // However, permissions rely on User UID. 
                // For this app, simply "User is authenticated" (Active User) + "Player Profile" (Logic) is enough for game logic.
                // Admin checks rely on player.isAdmin.
                return;
            }

            // 3. Player does not exist: Create new player
            // We use the CURRENT User UID (which is the anon one)
            // This binds the username to this Device's Anon ID essentially.
            const currentUid = auth.currentUser?.uid;
            if (!currentUid) throw new Error("No auth user found");

            // Check if this UID is already another player? (Edge case)
            const playerDocRef = doc(db, 'players', currentUid);

            // First player check for Admin assignment
            const allPlayersSnapshot = await getDocs(collection(db, 'players'));
            const isFirstPlayer = allPlayersSnapshot.empty;

            const newPlayer: Player = {
                id: currentUid,
                username: username,
                isAdmin: isFirstPlayer,
                createdAt: Date.now(),
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` // Auto avatar
            };

            await setDoc(playerDocRef, newPlayer);
            setPlayer(newPlayer);

        } catch (error) {
            console.error("Username login error", error);
            throw error;
        }
    };

    const logout = async () => {
        await firebaseSignOut(auth);
        setPlayer(null);
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, player, loading, loginWithGoogle, loginWithUsername, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
