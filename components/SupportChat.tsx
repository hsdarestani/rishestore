"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { id: string; sender: string; text: string; createdAt: string };

function sessionId() {
  if (typeof window === "undefined") return "";
  const key = "rishe_chat_session_v2";
  let value = localStorage.getItem(key);
  if (!value) {
    const id = crypto.randomUUID().replace(/-/g, "").toUpperCase();
    value = "USER_" + id;
    localStorage.setItem(key, value);
  }
  return value;
}

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  async function load() {
    const sid = sessionId();
    if (!sid) return;
    const response = await fetch("/api/chat?session=" + encodeURIComponent(sid), { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setConfigured(Boolean(data.configured));
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true); setError(""); setText("");
    const optimistic: Message = { id: "local-" + Date.now(), sender: "user", text: value, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId(), text: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "پیام ارسال نشد.");
      setConfigured(Boolean(data.delivered));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "پیام ارسال نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="support-chat-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="rishe-support-chat">
      <span>؟</span><b>سوالی دارید؟ پشتیبانی آنلاین</b>
    </button>
    <section id="rishe-support-chat" className={"support-chat " + (open ? "open" : "")} aria-hidden={!open}>
      <header><div><strong>پشتیبانی آنلاین ریشه</strong><span>پاسخ از تیم ریشه</span></div><button onClick={() => setOpen(false)} aria-label="بستن">×</button></header>
      <div className="support-chat-messages" ref={box}>
        {!messages.length && <div className="chat-message admin">سلام! چطور می‌تونم کمکتون کنم؟</div>}
        {messages.map((m) => <div key={m.id} className={"chat-message " + (m.sender === "user" ? "user" : "admin")}>{m.text}</div>)}
        {!configured && <div className="chat-message system">اگر پاسخ آنلاین در دسترس نبود، می‌توانید از لینک بله در فوتر هم پیام بدهید.</div>}
      </div>
      <form onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام خود را بنویسید…" maxLength={1200} /><button disabled={busy}>{busy ? "…" : "ارسال"}</button></form>
      {error && <small>{error}</small>}
    </section>
  </>;
}
