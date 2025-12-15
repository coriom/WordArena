"use client";

import { useRouter } from "next/navigation";

function makeRoomId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "W-";
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export default function Home() {
    const router = useRouter();

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-4xl font-bold">WordArena</h1>
                    <p className="mt-2 text-gray-600">
                        Compétition d’écriture. Solo ou en lobby multijoueur.
                    </p>
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
                        onClick={() => router.push(`/room/${makeRoomId()}`)}
                    >
                        Créer une partie multijoueur
                    </button>
                </div>

                <div className="rounded-xl border p-4">
                    <div className="font-semibold">Rejoindre une partie</div>
                    <p className="mt-1 text-sm text-gray-600">
                        Colle un lien du type <span className="font-mono">/room/W-7K3P</span> dans ton
                        navigateur.
                    </p>
                </div>
            </div>
        </main>
    );
}
