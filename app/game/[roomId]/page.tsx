"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Pusher from "pusher-js";

function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GamePage() {
    const router = useRouter();
    const params = useParams<{ roomId: string }>();
    const roomId = params.roomId;

    const [name, setName] = useState("Player");
    const [joined, setJoined] = useState(false);

    const [theme, setTheme] = useState("Thème libre");
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [locked, setLocked] = useState(false);
    const [text, setText] = useState("");

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<any>(null);
    const tickRef = useRef<number | null>(null);

    const channelName = useMemo(() => `presence-room-${roomId}`, [roomId]);

    const disconnect = () => {
        try {
            if (tickRef.current) window.clearInterval(tickRef.current);
            tickRef.current = null;
            if (channelRef.current) channelRef.current.unbind_all();
            if (pusherRef.current) pusherRef.current.disconnect();
        } catch {
        } finally {
            channelRef.current = null;
            pusherRef.current = null;
        }
    };

    useEffect(() => {
        return () => disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const join = () => {
        if (joined) return;

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: "/api/pusher/auth",
            auth: { params: { name } },
        });

        const channel = pusher.subscribe(channelName);

        // Quand on reçoit start, on démarre le timer (sync)
        channel.bind("client-start-game", (payload: { startAt: number; durationSec: number; theme: string }) => {
            setTheme(payload.theme || "Thème libre");
            setLocked(false);

            const startAt = payload.startAt;
            const duration = payload.durationSec;

            const tick = () => {
                const now = Date.now();
                const elapsed = Math.max(0, Math.floor((now - startAt) / 1000));
                const left = Math.max(0, duration - elapsed);
                setSecondsLeft(left);

                if (left <= 0) {
                    setLocked(true);
                    if (tickRef.current) window.clearInterval(tickRef.current);
                    tickRef.current = null;
                }
            };

            // première mise à jour tout de suite
            tick();
            if (tickRef.current) window.clearInterval(tickRef.current);
            tickRef.current = window.setInterval(tick, 250);
        });

        channel.bind("pusher:subscription_succeeded", () => {
            setJoined(true);
        });

        pusherRef.current = pusher;
        channelRef.current = channel;
    };

    const goHome = () => {
        disconnect();
        router.push("/");
    };

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold">Game: {roomId}</h1>
                        <p className="text-sm text-gray-600">
                            Timer + thème sont définis par le MJ. Ton texte reste privé.
                        </p>
                    </div>

                    <button onClick={goHome} className="rounded border px-3 py-2">
                        Home
                    </button>
                </div>

                {!joined ? (
                    <div className="space-y-3 rounded-xl border p-4">
                        <label className="block text-sm text-gray-700">Pseudo</label>
                        <input
                            className="w-full rounded border px-3 py-2"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <button onClick={join} className="rounded bg-black px-3 py-2 text-white">
                            Rejoindre la partie
                        </button>
                        <p className="text-sm text-gray-600">
                            Attends que le MJ clique Start (ou rejoins le lobby si besoin).
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border p-4 flex items-center justify-between">
                            <div className="text-4xl font-mono">{formatTime(secondsLeft)}</div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Thème</div>
                                <div className="font-semibold">{theme}</div>
                            </div>
                        </div>

                        <textarea
                            className="h-[55vh] w-full resize-none rounded-xl border p-4 text-base leading-relaxed"
                            placeholder="Écris ici..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={locked}
                        />

                        {locked && (
                            <div className="rounded-xl border p-4">
                                <div className="font-semibold">Temps écoulé ✅</div>
                                <div className="text-sm text-gray-600">
                                    (MVP) Ton texte est verrouillé. Prochaine étape : envoyer les textes au MJ puis afficher les résultats à tous.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
