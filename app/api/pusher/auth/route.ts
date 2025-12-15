import { NextResponse } from "next/server";
import Pusher from "pusher";

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

export async function POST(req: Request) {
    const contentType = req.headers.get("content-type") || "";

    let socket_id = "";
    let channel_name = "";
    let name = "Player";

    // Pusher envoie souvent du x-www-form-urlencoded
    if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await req.text();
        const params = new URLSearchParams(body);
        socket_id = params.get("socket_id") ?? "";
        channel_name = params.get("channel_name") ?? "";
        name = params.get("name") ?? "Player";
    } else {
        // fallback
        const formData = await req.formData();
        socket_id = String(formData.get("socket_id") ?? "");
        channel_name = String(formData.get("channel_name") ?? "");
        name = String(formData.get("name") ?? "Player");
    }

    if (!socket_id || !channel_name) {
        return NextResponse.json(
            { error: "Missing socket_id or channel_name" },
            { status: 400 }
        );
    }

    const presenceData = {
        user_id: socket_id,
        user_info: { name },
    };

    const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
    return NextResponse.json(auth);
}
