'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Player } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Edit2, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PlayersPage() {
    const { player: currentUser } = useAuth();
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const { t } = useTranslation('common');

    // Form State
    const [formData, setFormData] = useState({ username: '', isAdmin: false, isEnabled: false });

    const fetchPlayers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'players'));
            const list = querySnapshot.docs.map(doc => doc.data() as Player);
            setPlayers(list);
        } catch (error) {
            console.error("Error fetching players", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const handleEdit = (player: Player) => {
        setSelectedPlayer(player);
        setFormData({ username: player.username, isAdmin: player.isAdmin, isEnabled: player.isEnabled ?? true });
        setIsEditOpen(true);
    };

    const handleDelete = async (playerId: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'players', playerId));
            setPlayers(players.filter(p => p.id !== playerId));
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlayer) return;
        try {
            const ref = doc(db, 'players', selectedPlayer.id);
            await updateDoc(ref, {
                username: formData.username,
                isAdmin: formData.isAdmin,
                isEnabled: formData.isEnabled
            });
            setIsEditOpen(false);
            fetchPlayers();
        } catch (error) {
            console.error("Error updating", error);
        }
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Players Management</h1>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {players.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={p.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                                            alt={p.username}
                                            className="h-8 w-8 rounded-full bg-gray-100"
                                        />
                                        <span className="font-medium text-gray-900">{p.username}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {p.isAdmin ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                                            <Shield className="h-3 w-3" /> Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                            <UserIcon className="h-3 w-3" /> Player
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {(p.isEnabled ?? true) ? (
                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                            Enabled
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                                            Disabled
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {new Date(p.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {currentUser?.isAdmin && (
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            {/* Prevent deleting yourself to avoid lockout, ideally */}
                                            {p.id !== currentUser.id && (
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(p.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="Edit Player"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                        label="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isAdmin"
                            checked={formData.isAdmin}
                            onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700">
                            Grant Admin Privileges
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isEnabled"
                            checked={formData.isEnabled}
                            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <label htmlFor="isEnabled" className="text-sm font-medium text-gray-700">
                            Enable Player (allow content creation)
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
