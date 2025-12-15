"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";

type Member = { id: string; name: string };

type RoomSettings = {
    durationSec: number;
    theme: string;
};

export default function RoomPage() {
    const router = useRouter();
    const params = useParams<{ roomId: string }>();
    const search = useSearchParams();

    const roomId = params.roomId;
    const isHost = search.get("host") === "1"; // MVP (trust-based)

    const [name, setName] = useState("Player");
    const [joined, setJoined] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [status, setStatus] = useState<string>("");

    // Settings (host)
    const [minutes, setMinutes] = useState<number>(5);
    const [seconds, setSeconds] = useState<number>(0);
    const [theme, setTheme] = useState<string>("Thème libre");

    // Settings (synced view)
    const [roomSettings, setRoomSettings] = useState<RoomSettings>({
        durationSec: 300,
        theme: "Thème libre",
    });

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<any>(null);

    const channelName = useMemo(() => `presence-room-${roomId}`, [roomId]);

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const durationSec = useMemo(() => {
        const m = clamp(Number(minutes) || 0, 0, 240);
        const s = clamp(Number(seconds) || 0, 0, 59);
        return m * 60 + s;
    }, [minutes, seconds]);

    const disconnectPusher = () => {
        try {
            if (channelRef.current) channelRef.current.unbind_all();
            if (pusherRef.current) pusherRef.current.disconnect();
        } catch {
        } finally {
            channelRef.current = null;
            pusherRef.current = null;
        }
    };

    const goHome = () => {
        disconnectPusher();
        router.push("/");
    };

    const join = () => {
        if (joined) return;

        setStatus("Connexion...");
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: "/api/pusher/auth",
            auth: { params: { name } },
        });

        const channel = pusher.subscribe(channelName);

        channel.bind("pusher:subscription_succeeded", (data: any) => {
            const list: Member[] = [];
            data.members.each((m: any) => list.push({ id: m.id, name: m.info?.name ?? "Player" }));
            setMembers(list);
            setJoined(true);
            setStatus("Connecté ✅");
        });

        channel.bind("pusher:member_added", (member: any) => {
            setMembers((prev) => [...prev, { id: member.id, name: member.info?.name ?? "Player" }]);
        });

        channel.bind("pusher:member_removed", (member: any) => {
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
        });

        // Host -> others : settings
        channel.bind("client-room-settings", (payload: RoomSettings) => {
            setRoomSettings(payload);
        });

        // Host -> all : start game
        channel.bind("client-start-game", (payload: { startAt: number; durationSec: number; theme: string }) => {
            // on passe à la page game (tout le monde)
            router.push(`/game/${roomId}`);
        });

        channel.bind("pusher:subscription_error", () => setStatus("Erreur de connexion ❌"));

        pusherRef.current = pusher;
        channelRef.current = channel;
    };

    // Auto-join direct si tu veux (optionnel). Je laisse manuel avec bouton.
    useEffect(() => {
        return () => disconnectPusher();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pushSettings = () => {
        if (!isHost || !channelRef.current) return;
        const payload: RoomSettings = { durationSec, theme: theme.trim() || "Thème libre" };
        setRoomSettings(payload);
        channelRef.current.trigger("client-room-settings", payload);
    };

    const startGame = () => {
        if (!isHost || !channelRef.current) return;

        const payload = {
            // on démarre dans 3s pour sync
            startAt: Date.now() + 3000,
            durationSec: roomSettings.durationSec,
            theme: roomSettings.theme,
        };

        channelRef.current.trigger("client-start-game", payload);
        router.push(`/game/${roomId}`);
    };

    const effectiveSettings = isHost ? { durationSec, theme } : roomSettings;

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Room: {roomId} {isHost ? <span className="text-sm">(MJ)</span> : null}
                        </h1>
                        <p className="text-sm text-gray-600">
                            Partage le code : <span className="font-mono">{roomId}</span>
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
                            Rejoindre le lobby
                        </button>

                        {status && <p className="text-sm text-gray-600">{status}</p>}
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Paramètres de partie</div>
                                <div className="text-sm text-gray-600">
                                    Durée: <span className="font-mono">{effectiveSettings.durationSec}s</span> — Thème:{" "}
                                    <span className="font-mono">{(effectiveSettings.theme || "Thème libre")}</span>
                                </div>
                            </div>

                            {isHost ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                        <div>
                                            <label className="block text-sm text-gray-700">Minutes</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={240}
                                                className="w-full rounded border px-3 py-2"
                                                value={minutes}
                                                onChange={(e) => setMinutes(Number(e.target.value))}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-700">Secondes</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={59}
                                                className="w-full rounded border px-3 py-2"
                                                value={seconds}
                                                onChange={(e) => setSeconds(Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="text-sm text-gray-600">
                                            Total: <span className="font-mono">{durationSec}s</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700">Thème</label>
                                        <input
                                            className="w-full rounded border px-3 py-2"
                                            value={theme}
                                            onChange={(e) => setTheme(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={pushSettings} className="rounded border px-3 py-2">
                                            Appliquer / Sync
                                        </button>

                                        <button
                                            onClick={startGame}
                                            className="rounded bg-black px-3 py-2 text-white"
                                        >
                                            Start (MJ)
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    En attente du MJ… (seul le MJ peut lancer).
                                </p>
                            )}
                        </div>

                        <div className="rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Joueurs dans la room</div>
                                <div className="text-sm text-gray-600">{members.length}</div>
                            </div>

                            <ul className="mt-3 space-y-2">
                                {members.map((m) => (
                                    <li key={m.id} className="rounded border px-3 py-2">
                                        {m.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
