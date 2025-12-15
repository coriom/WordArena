"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Pusher from "pusher-js";

type Member = { id: string; name: string };

export default function RoomPage() {
    const router = useRouter();
    const params = useParams<{ roomId: string }>();
    const roomId = params.roomId;

    const [name, setName] = useState("Player");
    const [joined, setJoined] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [status, setStatus] = useState<string>("");

    // Durée personnalisable (MVP UI)
    const [minutes, setMinutes] = useState<number>(5);
    const [seconds, setSeconds] = useState<number>(0);

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<any>(null);

    const channelName = useMemo(() => `presence-room-${roomId}`, [roomId]);

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    const durationSec = useMemo(() => {
        const m = clamp(Number(minutes) || 0, 0, 240); // max 4h pour éviter les abus
        const s = clamp(Number(seconds) || 0, 0, 59);
        return m * 60 + s;
    }, [minutes, seconds]);

    const join = async () => {
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
            data.members.each((m: any) => {
                list.push({ id: m.id, name: m.info?.name ?? "Player" });
            });
            setMembers(list);
            setJoined(true);
            setStatus("Connecté ✅");
        });

        channel.bind("pusher:member_added", (member: any) => {
            setMembers((prev) => [
                ...prev,
                { id: member.id, name: member.info?.name ?? "Player" },
            ]);
        });

        channel.bind("pusher:member_removed", (member: any) => {
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
        });

        channel.bind("pusher:subscription_error", () => {
            setStatus("Erreur de connexion (auth / clés ?) ❌");
        });

        pusherRef.current = pusher;
        channelRef.current = channel;
    };

    const disconnectPusher = () => {
        try {
            if (channelRef.current) channelRef.current.unbind_all();
            if (pusherRef.current) pusherRef.current.disconnect();
        } catch {
            // noop (MVP)
        } finally {
            channelRef.current = null;
            pusherRef.current = null;
        }
    };

    const goHome = () => {
        disconnectPusher();
        setJoined(false);
        setMembers([]);
        setStatus("");
        router.push("/");
    };

    const leave = () => {
        disconnectPusher();
        setJoined(false);
        setMembers([]);
        setStatus("");
    };

    return (
        <main className="min-h-screen p-6">
            <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold">Room: {roomId}</h1>
                        <p className="text-sm text-gray-600">
                            Lobby multijoueur (MVP). Partage le lien{" "}
                            <span className="font-mono">/room/{roomId}</span>
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={goHome} className="rounded border px-3 py-2">
                            Home
                        </button>

                        {joined && (
                            <button onClick={leave} className="rounded border px-3 py-2">
                                Quitter
                            </button>
                        )}
                    </div>
                </div>

                {!joined ? (
                    <div className="space-y-3 rounded-xl border p-4">
                        <label className="block text-sm text-gray-700">Pseudo</label>
                        <input
                            className="w-full rounded border px-3 py-2"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <button
                            onClick={join}
                            className="rounded bg-black px-3 py-2 text-white"
                        >
                            Rejoindre
                        </button>

                        {status && <p className="text-sm text-gray-600">{status}</p>}
                    </div>
                ) : (
                    <>
                        <div className="rounded-xl border p-4 space-y-3">
                            <div className="font-semibold">Paramètres de partie</div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="sm:col-span-1">
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

                                <div className="sm:col-span-1">
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

                                <div className="sm:col-span-1 text-sm text-gray-600">
                                    Durée totale :{" "}
                                    <span className="font-mono">{durationSec}s</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">
                                (MVP) Pour l’instant la durée n’est pas encore synchronisée aux
                                autres joueurs. Prochaine étape : envoyer ces paramètres via un
                                event “client-room-settings”.
                            </p>
                        </div>

                        <div className="rounded-xl border p-4">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Joueurs connectés</div>
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
