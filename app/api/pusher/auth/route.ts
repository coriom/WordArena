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
    const formData = await req.formData();
    const socket_id = String(formData.get("socket_id"));
    const channel_name = String(formData.get("channel_name"));

    const name = String(formData.get("name") ?? "Player");

    const presenceData = {
        user_id: socket_id,
        user_info: { name },
    };

    const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
    return NextResponse.json(auth);
}
