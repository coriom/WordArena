"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function makeRoomId() {
    // Code "W-7K3P" (crypto, pas Math.random)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);

    let out = "W-";
    for (let i = 0; i < 4; i++) out += chars[bytes[i] % chars.length];
    return out;
}

function normalizeRoomId(input: string) {
    const v = input.trim().toUpperCase().replace(/\s+/g, "");
    // Autorise "W7K3P" -> "W-7K3P"
    if (/^W[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(v)) {
        return `W-${v.slice(1)}`;
    }
    return v;
}

function isValidRoomId(v: string) {
    return /^W-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(v);
}

export default function Home() {
    const router = useRouter();
    const [roomCode, setRoomCode] = useState("");
    const normalized = useMemo(() => normalizeRoomId(roomCode), [roomCode]);
    const ok = useMemo(() => isValidRoomId(normalized), [normalized]);

    const createMulti = () => {
        const id = makeRoomId();
        // host=1 pour marquer le MJ (MVP)
        router.push(`/room/${id}?host=1`);
    };

    const joinMulti = () => {
        if (!ok) return;
        router.push(`/room/${normalized}`);
    };

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-4xl font-bold">WordArena</h1>
                    <p className="mt-2 text-gray-600">Solo ou multijoueur (MVP).</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        className="rounded bg-black px-4 py-3 text-white"
                        onClick={() => router.push("/play")}
                    >
                        Partie solo
                    </button>

                    <button
                        className="rounded border px-4 py-3"
                        onClick={createMulti}
                    >
                        Créer une partie multijoueur
                    </button>
                </div>

                <div className="rounded-xl border p-4 space-y-3">
                    <div className="font-semibold">Rejoindre une partie</div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            className="w-full rounded border px-3 py-2 font-mono"
                            placeholder="W-7K3P"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                        />
                        <button
                            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                            disabled={!ok}
                            onClick={joinMulti}
                        >
                            Rejoindre
                        </button>
                    </div>

                    <div className="text-sm text-gray-600">
                        {roomCode.length > 0 && !ok ? (
                            <span>Code invalide (format attendu: <span className="font-mono">W-7K3P</span>)</span>
                        ) : (
                            <span>Entre un code (format: <span className="font-mono">W-7K3P</span>).</span>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
