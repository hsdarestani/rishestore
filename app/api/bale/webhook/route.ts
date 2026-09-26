import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const configuredSecret = String(process.env.BALE_WEBHOOK_SECRET || "").trim();
  if (configuredSecret) {
    const supplied = String(request.nextUrl.searchParams.get("secret") || "");
    if (supplied !== configuredSecret) return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const data = await request.json();
    const message = data?.message;
    const replyText = String(message?.text || "").trim();
    const originalText = String(message?.reply_to_message?.text || "");
    const externalId = message?.message_id ? "bale:" + String(message.message_id) : null;

    if (!replyText || !originalText) return NextResponse.json({ ok: true });

    const match = originalText.match(/شناسه:\s*#(USER_[A-F0-9]{16,64})/i);
    if (!match) return NextResponse.json({ ok: true });

    const publicId = match[1];
    const session = await db.chatSession.findUnique({ where: { publicId } });
    if (!session) return NextResponse.json({ ok: true });

    if (externalId) {
      const duplicate = await db.chatMessage.findUnique({ where: { externalId } });
      if (duplicate) return NextResponse.json({ ok: true });
    }

    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: "admin",
        text: replyText.slice(0, 2000),
        externalId,
        deliveredAt: new Date(),
      },
    });
    await db.chatSession.update({ where: { id: session.id }, data: { status: "open" } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
