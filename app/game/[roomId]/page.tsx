"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Pusher from "pusher-js";

function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type StartPayload = {
    startAt: number;
    durationSec: number;
    theme: string;
};

export default function GamePage() {
    const router = useRouter();
    const params = useParams<{ roomId: string }>();
    const roomId = params.roomId;

    const [joined, setJoined] = useState(false);

    const [theme, setTheme] = useState("Thème libre");
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const [locked, setLocked] = useState(false);
    const [text, setText] = useState("");

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<any>(null);
    const tickRef = useRef<number | null>(null);

    const startedRef = useRef(false);

    const channelName = useMemo(() => `presence-room-${roomId}`, [roomId]);

    const clearTick = () => {
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = null;
    };

    const startTimerFromPayload = (payload: StartPayload) => {
        if (startedRef.current) return;
        startedRef.current = true;

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
                clearTick();
            }
        };

        tick();
        clearTick();
        tickRef.current = window.setInterval(tick, 250);
    };

    const disconnect = () => {
        try {
            clearTick();
            if (channelRef.current) channelRef.current.unbind_all();
            if (pusherRef.current) pusherRef.current.disconnect();
        } catch {
        } finally {
            channelRef.current = null;
            pusherRef.current = null;
        }
    };

    const join = () => {
        if (joined) return;

        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!key || !cluster) return;

        const pusher = new Pusher(key, {
            cluster,
            authEndpoint: "/api/pusher/auth",
            // Pas besoin du pseudo ici (on fera mieux ensuite en le passant depuis le lobby)
        });

        const channel = pusher.subscribe(channelName);

        channel.bind("client-start-game", (payload: StartPayload) => {
            sessionStorage.setItem(`wordarena_start_${roomId}`, JSON.stringify(payload));
            startedRef.current = false;
            startTimerFromPayload(payload);
        });

        channel.bind("pusher:subscription_succeeded", () => {
            setJoined(true);
        });

        pusherRef.current = pusher;
        channelRef.current = channel;
    };

    useEffect(() => {
        // Auto-join dès l'arrivée sur /game
        join();

        // Si le lobby a stocké le start payload, on démarre direct
        const raw = sessionStorage.getItem(`wordarena_start_${roomId}`);
        if (raw) {
            try {
                const payload = JSON.parse(raw) as StartPayload;
                startTimerFromPayload(payload);
            } catch {
            }
        }

        return () => disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                    <div className="rounded-xl border p-4 text-sm text-gray-600">
                        Connexion à la partie…
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
