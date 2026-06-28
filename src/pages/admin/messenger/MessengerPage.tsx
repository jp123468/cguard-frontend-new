import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { MessageSquareText, Send, Plus, Search, Loader2, X, Check, CheckCheck, Paperclip, Play, Trash2, Users, Mic, UserPlus, RefreshCw, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/kit";
import { messageService, type MessageAttachment, type GroupMember } from "@/lib/api/messageService";
import securityGuardService from "@/lib/api/securityGuardService";
import { postSiteService } from "@/lib/api/postSiteService";
import { clientService } from "@/lib/api/clientService";
import { useFileUrl } from "@/lib/fileUrl";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirmDialog";

/**
 * Renders one message attachment (image/video). The attachment `url` is a raw
 * privateUrl, so resolve a token-based download URL via `useFileUrl`. Extracted
 * as a component because the attachments are rendered inside a `.map()`, where
 * hooks can't be called directly.
 */
function MessageAttachmentView({ att }: { att: MessageAttachment }) {
  const url = useFileUrl(att.url);
  if (att.type === "video") {
    return (
      <video src={url || undefined} controls preload="metadata" className="max-h-72 max-w-full rounded-lg bg-black/20" />
    );
  }
  if (att.type === "audio") {
    return <audio src={url || undefined} controls preload="metadata" className="w-56 max-w-full" />;
  }
  return (
    <a href={url || "#"} target="_blank" rel="noreferrer">
      <img src={url || undefined} alt={att.name || "imagen"} loading="lazy" className="max-h-72 max-w-full rounded-lg object-cover" />
    </a>
  );
}

/** Thumbnail for a pending (just-uploaded) image attachment; same token logic. */
function PendingThumb({ att }: { att: MessageAttachment }) {
  const url = useFileUrl(att.url);
  return <img src={url || undefined} alt="" className="h-full w-full object-cover" />;
}

type Conversation = {
  id: string; recipientType: string; recipientUserId: string | null; recipientName: string;
  kind?: string; isGroup?: boolean; memberCount?: number | null;
  subject?: string | null; isOneWay?: boolean; lastMessageAt?: string | null; lastMessagePreview?: string | null; unreadCount?: number;
};
type Message = {
  id: string; senderUserId: string; senderType: string; senderName: string; body: string; createdAt: string;
  attachments?: MessageAttachment[] | null;
  receipt?: { deliveryStatus: string; readAt?: string | null } | null;
};

const fmtTime = (d?: string | null) => { try { return new Date(d as string).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

export default function MessengerPage({ scope = "operational" }: { scope?: "operational" | "client" }) {
  const isClient = scope === "client";
  const pageTitle = isClient ? "Mensajes de Clientes" : "Mensajes Operativos";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [pending, setPending] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

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

  // Operativos = chats with vigilantes/supervisores + grupos (recipientType !== "client").
  // Clientes = chats with customers (recipientType === "client").
  const visibleConversations = useMemo(
    () => conversations.filter((c) => (isClient ? c.recipientType === "client" : c.recipientType !== "client")),
    [conversations, isClient],
  );

  const onSelect = (c: Conversation) => { setSelected(c); setMessages([]); setMembersOpen(false); loadThread(c, true); };

  // Open a specific conversation when arrived via a notification (?conversation=<id>).
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("conversation");
    if (!cid || !conversations.length || selected?.id === cid) return;
    const conv = conversations.find((c) => c.id === cid);
    if (conv) onSelect(conv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const onSend = async () => {
    if (!selected || sending || uploading) return;
    const body = draft.trim();
    if (!body && pending.length === 0) return;
    const atts = pending;
    setSending(true);
    setDraft("");
    setPending([]);
    try {
      await messageService.sendMessage(selected.id, body, atts);
      await loadThread(selected);
      loadConversations();
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo enviar");
      setDraft(body);
      setPending(atts);
    } finally { setSending(false); }
  };

  const onDeleteConversation = async () => {
    if (!selected) return;
    if (!(await confirmDialog({ title: 'Eliminar conversación', message: `¿Eliminar la conversación con ${selected.recipientName}? Esta acción no se puede deshacer.`, confirmText: 'Eliminar', tone: 'danger' }))) return;
    const id = selected.id;
    try {
      await messageService.deleteConversation(id);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      setSelected(null);
      setMessages([]);
      toast.success("Conversación eliminada");
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo eliminar la conversación");
    }
  };

  // Record a voice note, upload it, and send it as an audio attachment.
  const onToggleRecord = async () => {
    if (!selected) return;
    if (recorder.recording) {
      try {
        const rec = await recorder.stop();
        if (!rec) return;
        setUploading(true);
        const att = await messageService.uploadAttachment(rec.file);
        await messageService.sendMessage(selected.id, "", [att]);
        await loadThread(selected);
        loadConversations();
      } catch (e: any) {
        toast.error(e?.data?.message || e?.message || "No se pudo enviar la nota de voz");
      } finally { setUploading(false); }
      return;
    }
    try { await recorder.start(); }
    catch (e: any) { toast.error(e?.message || "No se pudo acceder al micrófono"); }
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        if (!/^image\/|^video\/|^audio\//.test(file.type)) { toast.error(`${file.name}: solo imágenes, videos o audio`); continue; }
        if (file.size > 100 * 1024 * 1024) { toast.error(`${file.name}: máximo 100 MB`); continue; }
        const att = await messageService.uploadAttachment(file);
        setPending((p) => [...p, att]);
      }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo subir el archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: "Panel de control", path: "/dashboard" }, { label: "Mensajería" }, { label: pageTitle }]} />
      <div className="p-4 lg:p-6 space-y-4">
        <PageHeader
          icon={<MessageSquareText />}
          title={pageTitle}
          subtitle={isClient ? "Conversaciones con tus clientes." : "Conversaciones con vigilantes, supervisores y grupos por puesto."}
          actions={
            <button onClick={() => setComposeOpen(true)} className="cg-gradient-brand inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:shadow-lg hover:brightness-[1.04]">
              <Plus size={15} /> Nuevo
            </button>
          }
        />
        <div className="flex h-[calc(100vh-240px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Conversation list */}
          <aside className="flex w-full max-w-xs flex-col border-r border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
              <h2 className="text-sm font-bold text-foreground">{pageTitle}</h2>
              <button onClick={() => setComposeOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-[#C8860A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B37809]">
                <Plus size={14} /> Nuevo
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {loadingList ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : visibleConversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">{isClient ? "Sin mensajes de clientes todavía." : "Sin conversaciones. Crea una con \"Nuevo\"."}</p>
              ) : (
                visibleConversations.map((c) => (
                  <button key={c.id} onClick={() => onSelect(c)} className={`flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left hover:bg-muted/40 ${selected?.id === c.id ? "bg-muted/60" : ""}`}>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#C8860A]/15 text-xs font-bold text-[#C8860A]">
                      {c.isGroup ? <Users size={16} /> : (c.recipientName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{c.recipientName}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.lastMessagePreview || (c.isGroup ? `Grupo · ${c.memberCount || 0} miembros` : c.recipientType === "guard" ? "Vigilante" : "Cliente")}</p>
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
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[#C8860A]/15 text-xs font-bold text-[#C8860A]">{selected.isGroup ? <Users size={16} /> : (selected.recipientName || "?").slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{selected.recipientName}</p>
                    <p className="text-[11px] text-muted-foreground">{selected.isGroup ? `Grupo · ${selected.memberCount || 0} miembros` : selected.recipientType === "guard" ? "Vigilante" : "Cliente"}{selected.isOneWay ? " · Solo lectura" : ""}</p>
                  </div>
                  {selected.isGroup && (
                    <button
                      onClick={() => setMembersOpen(true)}
                      title="Miembros del grupo"
                      className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={onDeleteConversation}
                    title={selected.isGroup ? "Eliminar grupo" : "Eliminar conversación"}
                    className={`${selected.isGroup ? "" : "ml-auto"} grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div ref={threadRef} className="flex-1 space-y-2 overflow-auto p-4">
                  {messages.map((m) => {
                    const mine = m.senderType === "staff";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-[#C8860A] text-white" : "bg-muted text-foreground"}`}>
                          {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.senderName}</p>}
                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div className="mb-1 grid gap-1.5">
                              {m.attachments.map((a, i) => (
                                <MessageAttachmentView key={i} att={a} />
                              ))}
                            </div>
                          )}
                          {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                          <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                            {fmtTime(m.createdAt)}
                            {mine && (m.receipt?.deliveryStatus === "read" ? <CheckCheck size={12} /> : <Check size={12} />)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border p-3">
                  {pending.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {pending.map((a, i) => (
                        <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                          {a.type === "video" ? (
                            <div className="flex h-full w-full items-center justify-center bg-black/60 text-white"><Play size={18} /></div>
                          ) : a.type === "audio" ? (
                            <div className="flex h-full w-full items-center justify-center bg-[#C8860A]/15 text-[#C8860A]"><Mic size={18} /></div>
                          ) : (
                            <PendingThumb att={a} />
                          )}
                          <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl bg-black/70 text-white"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading || recorder.recording} title="Adjuntar imagen, video o audio" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-input text-muted-foreground hover:text-foreground disabled:opacity-50">
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    {recorder.recording ? (
                      <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#C8860A]/40 bg-[#C8860A]/10 px-3.5 py-2 text-sm">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                        <span className="font-mono text-foreground">{String(Math.floor(recorder.elapsedMs / 60000)).padStart(2, "0")}:{String(Math.floor((recorder.elapsedMs % 60000) / 1000)).padStart(2, "0")}</span>
                        <span className="text-muted-foreground">Grabando nota de voz…</span>
                        <button onClick={() => recorder.cancel()} title="Cancelar" className="ml-auto text-muted-foreground hover:text-red-600"><X size={16} /></button>
                      </div>
                    ) : (
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        placeholder="Escribe un mensaje…"
                        rows={1}
                        className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20"
                      />
                    )}
                    {recorder.supported && !draft.trim() && pending.length === 0 && (
                      <button
                        onClick={onToggleRecord}
                        disabled={uploading}
                        title={recorder.recording ? "Detener y enviar" : "Grabar nota de voz"}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-50 ${recorder.recording ? "bg-red-500 hover:bg-red-600" : "bg-[#C8860A] hover:bg-[#B37809]"}`}
                      >
                        {recorder.recording ? <Send size={16} /> : <Mic size={16} />}
                      </button>
                    )}
                    {(!recorder.supported || draft.trim() || pending.length > 0) && (
                      <button onClick={onSend} disabled={sending || uploading || recorder.recording || (!draft.trim() && pending.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C8860A] text-white hover:bg-[#B37809] disabled:opacity-50">
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {composeOpen && (
        <ComposeDialog
          scope={scope}
          onClose={() => setComposeOpen(false)}
          onSent={(conv) => { setComposeOpen(false); loadConversations(); const c = conv as Conversation; setSelected(c); loadThread(c, true); }}
        />
      )}

      {membersOpen && selected?.isGroup && (
        <MembersPanel
          conversation={selected}
          onClose={() => setMembersOpen(false)}
          onChanged={() => loadConversations()}
        />
      )}
    </AppLayout>
  );
}

function ComposeDialog({ scope, onClose, onSent }: { scope: "operational" | "client"; onClose: () => void; onSent: (conv: any) => void }) {
  const isClient = scope === "client";
  const [mode, setMode] = useState<"direct" | "group">("direct");
  // Direct mode
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [body, setBody] = useState("");
  // Group mode
  const [groupName, setGroupName] = useState("");
  const [siteQ, setSiteQ] = useState("");
  const [siteResults, setSiteResults] = useState<{ id: string; label: string }[]>([]);
  const [site, setSite] = useState<{ id: string; label: string } | null>(null);
  const [oneWay, setOneWay] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (mode !== "direct") return;
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      try {
        if (isClient) {
          const res: any = await clientService.autocomplete(q.trim(), 15);
          const rows = Array.isArray(res) ? res : (res?.rows || []);
          if (active) setResults(rows.filter((r: any) => r && r.id).map((r: any) => ({ id: r.id, label: r.label || r.name || "Cliente" })));
        } else {
          const res = await securityGuardService.autocomplete(q.trim(), 15);
          const rows = Array.isArray(res) ? res : (res?.rows || []);
          if (active) setResults(rows.filter((r: any) => r && r.id && !String(r.id).startsWith("sg:")).map((r: any) => ({ id: r.id, label: r.label || r.name || "Vigilante" })));
        }
      } catch { /* ignore */ }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q, mode]);

  useEffect(() => {
    if (mode !== "group") return;
    let active = true;
    const t = setTimeout(async () => {
      if (!siteQ.trim()) { setSiteResults([]); return; }
      try {
        const res: any = await postSiteService.autocomplete(siteQ.trim());
        const rows = Array.isArray(res) ? res : (res?.rows || res?.data || []);
        if (active) setSiteResults(rows.filter((r: any) => r && r.id).map((r: any) => ({ id: r.id, label: r.label || r.companyName || r.name || "Puesto" })));
      } catch { /* ignore */ }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [siteQ, mode]);

  const sendDirect = async () => {
    if (!picked || !body.trim() || sending) return;
    setSending(true);
    try {
      const res = await messageService.createConversation({ recipientType: isClient ? "client" : "guard", recipientId: picked.id, body: body.trim() });
      onSent(res?.conversation || res);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo enviar");
    } finally { setSending(false); }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !site || sending) return;
    setSending(true);
    try {
      const res = await messageService.createGroup({
        name: groupName.trim(), anchorType: "postSite", anchorId: site.id, isOneWay: oneWay, body: body.trim() || undefined,
      });
      const c = res?.conversation || {};
      onSent({
        id: c.id, kind: "group", isGroup: true, recipientType: "guard", recipientName: c.subject || groupName.trim(),
        subject: c.subject, isOneWay: c.isOneWay, memberCount: (res?.members || []).length,
      });
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || "No se pudo crear el grupo");
    } finally { setSending(false); }
  };

  const Tab = ({ id, icon, label }: { id: "direct" | "group"; icon: ReactNode; label: string }) => (
    <button
      onClick={() => setMode(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === id ? "bg-[#C8860A] text-white" : "text-muted-foreground hover:bg-muted"}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-bold text-foreground">Nuevo</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-3 p-4">
          {/* Groups are an operational feature (vigilantes by puesto); clients only get direct chats. */}
          {!isClient && (
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              <Tab id="direct" icon={<UserCircle2 size={14} />} label="Directo" />
              <Tab id="group" icon={<Users size={14} />} label="Grupo" />
            </div>
          )}

          {mode === "direct" ? (
            <>
              {picked ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{picked.label}</span>
                  <button onClick={() => setPicked(null)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isClient ? "Buscar cliente…" : "Buscar vigilante…"} className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
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
            </>
          ) : (
            <>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nombre del grupo" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
              {site ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">Puesto: {site.label}</span>
                  <button onClick={() => setSite(null)} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={siteQ} onChange={(e) => setSiteQ(e.target.value)} placeholder="Buscar puesto/sitio…" className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
                  </div>
                  {siteResults.length > 0 && (
                    <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-border">
                      {siteResults.map((r) => (
                        <button key={r.id} onClick={() => { setSite(r); setSiteResults([]); setSiteQ(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/50">{r.label}</button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Los vigilantes asignados a este puesto se añaden automáticamente y el grupo se mantiene al día con las asignaciones.</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={oneWay} onChange={(e) => setOneWay(e.target.checked)} className="h-4 w-4 rounded border-input text-[#C8860A] focus:ring-[#C8860A]/30" />
                Solo anuncios (los miembros no pueden responder)
              </label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Primer mensaje (opcional)…" rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
          {mode === "direct" ? (
            <button onClick={sendDirect} disabled={!picked || !body.trim() || sending} className="flex items-center gap-2 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
            </button>
          ) : (
            <button onClick={createGroup} disabled={!groupName.trim() || !site || sending} className="flex items-center gap-2 rounded-xl bg-[#C8860A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B37809] disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Crear grupo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Slide-over panel: list group members, add (guard autocomplete), remove, resync. */
function MembersPanel({ conversation, onClose, onChanged }: { conversation: Conversation; onClose: () => void; onChanged: () => void }) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);

  const load = useCallback(async () => {
    try { const res = await messageService.listMembers(conversation.id); setMembers(res?.rows || []); }
    catch (e: any) { toast.error(e?.data?.message || e?.message || "No se pudieron cargar los miembros"); }
    finally { setLoading(false); }
  }, [conversation.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      try {
        const res = await securityGuardService.autocomplete(q.trim(), 15);
        const rows = Array.isArray(res) ? res : (res?.rows || []);
        if (active) setResults(rows.filter((r: any) => r && r.id && !String(r.id).startsWith("sg:")).map((r: any) => ({ id: r.id, label: r.label || r.name || "Vigilante" })));
      } catch { /* ignore */ }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  const addMember = async (userId: string) => {
    setBusy(true);
    try { const res = await messageService.addMembers(conversation.id, [userId]); setMembers(res?.rows || []); setQ(""); setResults([]); onChanged(); }
    catch (e: any) { toast.error(e?.data?.message || e?.message || "No se pudo añadir"); }
    finally { setBusy(false); }
  };
  const removeMember = async (userId: string) => {
    setBusy(true);
    try { const res = await messageService.removeMember(conversation.id, userId); setMembers(res?.rows || []); onChanged(); }
    catch (e: any) { toast.error(e?.data?.message || e?.message || "No se pudo quitar"); }
    finally { setBusy(false); }
  };
  const resync = async () => {
    setBusy(true);
    try { const res = await messageService.resyncMembers(conversation.id); setMembers(res?.rows || []); onChanged(); toast.success("Miembros actualizados desde las asignaciones"); }
    catch (e: any) { toast.error(e?.data?.message || e?.message || "No se pudo sincronizar"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">{conversation.recipientName}</h3>
            <p className="text-[11px] text-muted-foreground">{members.length} miembros</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="border-b border-border p-3">
          <div className="relative">
            <UserPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Añadir vigilante…" disabled={busy} className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm focus:border-[#C8860A] focus:outline-none focus:ring-2 focus:ring-[#C8860A]/20" />
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-border">
              {results.map((r) => (
                <button key={r.id} onClick={() => addMember(r.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/50">{r.label}</button>
              ))}
            </div>
          )}
          <button onClick={resync} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-input py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50">
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Sincronizar con asignaciones
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/40">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#C8860A]/15 text-[10px] font-bold text-[#C8860A]">{(m.name || "?").slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.participantType === "staff" ? "Operador" : "Vigilante"}{m.role === "admin" ? " · Admin" : ""}{m.source === "auto" ? " · Auto" : ""}</p>
                </div>
                {m.role !== "admin" && (
                  <button onClick={() => removeMember(m.userId)} disabled={busy} title="Quitar" className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><X size={14} /></button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
