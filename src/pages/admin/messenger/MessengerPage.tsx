import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { MessageSquareText, Send, Plus, Search, Loader2, X, Check, CheckCheck } from "lucide-react";
import { messageService } from "@/lib/api/messageService";
import securityGuardService from "@/lib/api/securityGuardService";
import { toast } from "sonner";

type Conversation = {
  id: string; recipientType: string; recipientUserId: string | null; recipientName: string;
  subject?: string | null; isOneWay?: boolean; lastMessageAt?: string | null; lastMessagePreview?: string | null; unreadCount?: number;
};
type Message = {
  id: string; senderUserId: string; senderType: string; senderName: string; body: string; createdAt: string;
  receipt?: { deliveryStatus: string; readAt?: string | null } | null;
};

const fmtTime = (d?: string | null) => { try { return new Date(d as string).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

export default function MessengerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await messageService.listConversations({ limit: 50 });
      setConversations(res?.rows || []);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudieron cargar las conversaciones");
    } finally { setLoadingList(false); }
  }, []);

  const loadThread = useCallback(async (conv: Conversation, markRead = false) => {
    try {
      const res = await messageService.listMessages(conv.id, { limit: 50 });
      // API returns newest-first; show oldest-first.
      setMessages((res?.rows || []).slice().reverse());
      if (markRead && (conv.unreadCount || 0) > 0) {
        await messageService.markRead(conv.id).catch(() => {});
        setConversations((cs) => cs.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
      }
      setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo cargar la conversación");
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  // Poll inbox + open thread for near-real-time sync.
  useEffect(() => {
    const id = setInterval(() => { loadConversations(); if (selected) loadThread(selected); }, 12000);
    return () => clearInterval(id);
  }, [loadConversations, loadThread, selected]);

  const onSelect = (c: Conversation) => { setSelected(c); setMessages([]); loadThread(c, true); };

  const onSend = async () => {
    if (!selected || !draft.trim() || sending) return;
    const body = draft.trim();
    setSending(true);
    setDraft("");
    try {
      await messageService.sendMessage(selected.id, body);
      await loadThread(selected);
      loadConversations();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo enviar");
      setDraft(body);
    } finally { setSending(false); }
  };

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: "Panel de control", path: "/dashboard" }, { label: "Mensajes" }]} />
      <div className="p-4 lg:p-6">
        <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-border bg-card">
          {/* Conversation list */}
          <aside className="flex w-full max-w-xs flex-col border-r border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
              <h2 className="text-sm font-bold text-foreground">Mensajes</h2>
              <button onClick={() => setComposeOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-[#C8860A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B37809]">
                <Plus size={14} /> Nuevo
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {loadingList ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">Sin conversaciones. Crea una con "Nuevo".</p>
              ) : (
                conversations.map((c) => (
                  <button key={c.id} onClick={() => onSelect(c)} className={`flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left hover:bg-muted/40 ${selected?.id === c.id ? "bg-muted/60" : ""}`}>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#C8860A]/15 text-xs font-bold text-[#C8860A]">
                      {(c.recipientName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{c.recipientName}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview || (c.recipientType === "guard" ? "Guardia" : "Cliente")}</p>
                    </div>
                    {(c.unreadCount || 0) > 0 && <span className="ml-1 grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Thread */}
          <section className="flex min-w-0 flex-1 flex-col">
            {!selected ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquareText className="mb-3 h-16 w-16 stroke-[1.25]" />
                <p className="text-sm">Selecciona una conversación o crea una nueva.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[#C8860A]/15 text-xs font-bold text-[#C8860A]">{(selected.recipientName || "?").slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{selected.recipientName}</p>
                    <p className="text-[11px] text-muted-foreground">{selected.recipientType === "guard" ? "Guardia" : "Cliente"}{selected.isOneWay ? " · Solo lectura" : ""}</p>
                  </div>
                </div>

                <div ref={threadRef} className="flex-1 space-y-2 overflow-auto p-4">
                  {messages.map((m) => {
                    const mine = m.senderType === "staff";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-[#C8860A] text-white" : "bg-muted text-foreground"}`}>
                          {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>}
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                            {fmtTime(m.createdAt)}
                            {mine && (m.receipt?.deliveryStatus === "read" ? <CheckCheck size={12} /> : <Check size={12} />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-end gap-2 border-t border-border p-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    placeholder="Escribe un mensaje…"
                    rows={1}
                    className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20"
                  />
                  <button onClick={onSend} disabled={sending || !draft.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C8860A] text-white hover:bg-[#B37809] disabled:opacity-50">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {composeOpen && (
        <ComposeDialog
          onClose={() => setComposeOpen(false)}
          onSent={(conv) => { setComposeOpen(false); loadConversations(); const c = conv as Conversation; setSelected(c); loadThread(c, true); }}
        />
      )}
    </AppLayout>
  );
}

function ComposeDialog({ onClose, onSent }: { onClose: () => void; onSent: (conv: any) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      try {
        const res = await securityGuardService.autocomplete(q.trim(), 15);
        const rows = Array.isArray(res) ? res : (res?.rows || []);
        if (active) setResults(rows.filter((r: any) => r && r.id && !String(r.id).startsWith("sg:")).map((r: any) => ({ id: r.id, label: r.label || r.name || "Guardia" })));
      } catch { /* ignore */ }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const send = async () => {
    if (!picked || !body.trim() || sending) return;
    setSending(true);
    try {
      const res = await messageService.createConversation({ recipientType: "guard", recipientId: picked.id, body: body.trim() });
      onSent(res?.conversation || res);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo enviar");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-bold text-foreground">Nuevo mensaje</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          {picked ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium text-foreground">{picked.label}</span>
              <button onClick={() => setPicked(null)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar guardia…" className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
              </div>
              {results.length > 0 && (
                <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-border">
                  {results.map((r) => (
                    <button key={r.id} onClick={() => { setPicked(r); setResults([]); setQ(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/50">{r.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensaje…" rows={4} className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={send} disabled={!picked || !body.trim() || sending} className="flex items-center gap-2 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
