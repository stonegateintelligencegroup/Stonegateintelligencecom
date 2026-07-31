import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Send, ArrowLeft, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  id: number;
  content: string;
  createdAt: string;
  senderId: number;
  senderName: string | null;
  senderRole: string | null;
}

export default function ClientMessages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`${BASE}/api/portal/client/messages`, { credentials: "include" });
      if (res.ok) setMessages(await res.json());
    } catch { setError("Could not load messages."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE}/api/portal/client/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send.");
      setContent("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/portal/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-foreground">Secure Messages</span>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 py-8 max-w-3xl flex flex-col">
        {error && <div className="flex items-center gap-3 text-red-400 text-sm mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm mb-1">No messages yet</p>
              <p className="text-xs">Send a message to start a secure conversation with your investigative team.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
            {messages.map(msg => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-3 ${isMe ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"}`}>
                    <p className={`text-xs mb-1 ${isMe ? "text-primary/70" : "text-muted-foreground"}`}>
                      {isMe ? "You" : (msg.senderName ?? "Stonegate")} · {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={send} className="flex gap-3 mt-auto pt-4 border-t border-white/8">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
            rows={2}
            placeholder="Type a secure message… (Enter to send)"
            className="flex-1 bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs px-5 rounded transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
