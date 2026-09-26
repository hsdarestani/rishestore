import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

const SESSION_RE = /^USER_[A-F0-9]{16,64}$/i;

function normalizeSession(value: unknown) {
  const id = String(value || "").trim();
  if (!SESSION_RE.test(id)) throw new Error("INVALID_SESSION");
  return id;
}

async function sendToBale(sessionId: string, text: string) {
  const token = String(process.env.BALE_BOT_TOKEN || "").trim();
  const chatId = String(process.env.BALE_ADMIN_CHAT_ID || "").trim();
  if (!token || !chatId) return { delivered: false };

  const response = await fetch("https://tapi.bale.ai/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "💬 پیام جدید از سایت\nشناسه: #" + sessionId + "\n\nمتن پیام:\n" + text,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({} as any));
  const externalId = payload?.result?.message_id ? String(payload.result.message_id) : null;
  return { delivered: response.ok, externalId };
}

export async function GET(request: NextRequest) {
  const sessionId = normalizeSession(request.nextUrl.searchParams.get("session"));
  const session = await db.chatSession.findUnique({ where: { publicId: sessionId } });
  if (!session) return NextResponse.json({ messages: [], configured: Boolean(process.env.BALE_BOT_TOKEN && process.env.BALE_ADMIN_CHAT_ID) });

  const messages = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt,
    })),
    configured: Boolean(process.env.BALE_BOT_TOKEN && process.env.BALE_ADMIN_CHAT_ID),
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const sessionId = normalizeSession(body.sessionId);
    const message = String(body.text || "").trim().slice(0, 1200);
    if (!message) return NextResponse.json({ error: "پیام خالی است." }, { status: 400 });

    const user = await getCurrentUser();
    const session = await db.chatSession.upsert({
      where: { publicId: sessionId },
      create: { publicId: sessionId, userId: user?.id || null, status: "open" },
      update: { userId: user?.id || undefined, status: "open" },
    });

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await db.chatMessage.count({
      where: { sessionId: session.id, sender: "user", createdAt: { gt: oneMinuteAgo } },
    });
    if (recent >= 10) return NextResponse.json({ error: "تعداد پیام‌ها زیاد است؛ کمی بعد دوباره امتحان کنید." }, { status: 429 });

    const saved = await db.chatMessage.create({
      data: { sessionId: session.id, sender: "user", text: message },
    });

    const bale = await sendToBale(sessionId, message);
    if (bale.delivered) {
      await db.chatMessage.update({
        where: { id: saved.id },
        data: { deliveredAt: new Date(), externalId: bale.externalId || undefined },
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true, delivered: bale.delivered });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ارسال پیام انجام نشد." }, { status: 400 });
  }
}
