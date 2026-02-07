import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

import {
  Archive,
  ArrowLeft,
  MessageSquareText, MoreHorizontal, Paperclip, Plus, Search, Send, Users
} from "lucide-react";

/* ----------------------------- Tipos públicos ---------------------------- */
export type GuardUser = { id: string; name: string };
export type Site = { id: string; name: string };
export type Conversation = {
  id: string;
  title: string;
  isSite?: boolean;          // para el badge "Sitio de Publicación"
  kind?: "direct" | "group"; // para el badge "Chat individual"
};

export type MessengerProps = {
  /* Datos (sin mock) */
  inbox: Conversation[];                 // conversaciones normales
  archived: Conversation[];              // conversaciones archivadas
  guards: GuardUser[];                   // para modales
  sites: Site[];                         // para modales

  /* Handlers para conectar tu API */
  onSelectConversation?: (id: string) => void;
  onCreateMessage?: (target: { type: "user" | "site"; id: string }) => Promise<void> | void;
  onCreateGroup?: (payload: { name: string; siteId?: string; userIds: string[] }) => Promise<void> | void;
  onToggleOneWay?: (conversationId: string) => Promise<void> | void;
  onArchive?: (conversationId: string) => Promise<void> | void;
  onRestore?: (conversationId: string) => Promise<void> | void;
  onDelete?: (conversationId: string) => Promise<void> | void;
  onOpenDetails?: (conversationId: string) => void;

  /* Opcional: para deshabilitar envío cuando quieras solo vista */
  disableSendOnArchived?: boolean;
};

/* ------------------------------ UI helpers ------------------------------- */
function EmptyList({ label = "Sin chats" }: { label?: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="grid place-items-center gap-3">
        <div className="relative">
          <MessageSquareText className="h-16 w-16 text-slate-400 stroke-[1.5]" />
          <div className="absolute -top-1 -right-1 flex gap-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
          </div>
        </div>
        <p className="text-base font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="grid h-full place-items-center bg-slate-50/50">
      <div className="relative">
        <MessageSquareText className="h-24 w-24 text-slate-400 stroke-[1.5]" />
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="h-2 w-2 rounded-full bg-slate-400"></div>
          <div className="h-2 w-2 rounded-full bg-slate-400"></div>
          <div className="h-2 w-2 rounded-full bg-slate-400"></div>
        </div>
      </div>
    </div>
  );
}

function Composer({
  value, onChange, onSend, disabled,
}: { value: string; onChange: (v: string) => void; onSend: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-t bg-white p-4">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" title="Adjuntar">
        <Paperclip className="h-5 w-5" />
      </Button>
      <Input
        placeholder=""
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white border-slate-300 h-10 rounded-md focus-visible:ring-0 focus-visible:border-slate-400"
      />
      <Button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-transparent"
      >
        <Send className="h-6 w-6" />
      </Button>
    </div>
  );
}

/* ------------------------------- Modales -------------------------------- */
function NewMessageDialog({
  open, onOpenChange, guards, sites, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guards: GuardUser[];
  sites: Site[];
  onPick: (target: { type: "user" | "site"; id: string }) => void;
}) {
  const [q, setQ] = useState("");
  const guardsF = useMemo(
    () => guards.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())), [guards, q]
  );
  const sitesF = useMemo(
    () => sites.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())), [sites, q]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-base font-normal text-slate-700">Nuevo Mensaje</DialogTitle>
          <DialogDescription>
            Busca un guardia o un sitio para enviar un nuevo mensaje.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-600 font-medium">Seleccione el usuario o el sitio de publicación para enviar un nuevo mensaje</Label>
            <Input
              placeholder="Buscar usuario o sitio de publicación..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-white border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-500">Guardias</div>
            <div className=" border-t border-x border-b-0">
              <ScrollArea className="max-h-48">
                {guardsF.length === 0 && <div className="p-4 text-sm text-muted-foreground border-b">Sin resultados</div>}
                {guardsF.map((g) => (
                  <button
                    key={g.id}
                    className="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-slate-50"
                    onClick={() => onPick({ type: "user", id: g.id })}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1e293b] text-white text-xs">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-normal text-slate-600">{g.name}</div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-500">Sitios de publicación</div>
            <div className=" border-t border-x border-b-0">
              <ScrollArea className="max-h-48">
                {sitesF.length === 0 && <div className="p-4 text-sm text-muted-foreground border-b">Sin resultados</div>}
                {sitesF.map((s) => (
                  <button
                    key={s.id}
                    className="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-slate-50"
                    onClick={() => onPick({ type: "site", id: s.id })}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1e293b] text-white text-xs">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-normal text-slate-600">{s.name}</div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupDialog({
  open, onOpenChange, sites, guards, onCreate,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  sites: Site[]; guards: GuardUser[];
  onCreate: (payload: { name: string; siteId?: string; userIds: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState<string | undefined>(undefined);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const guardsF = useMemo(
    () => guards.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())), [guards, q]
  );

  const toggle = (id: string) => {
    const next = new Set(picked); next.has(id) ? next.delete(id) : next.add(id); setPicked(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-base font-normal text-slate-700">Nuevo grupo</DialogTitle>
          <DialogDescription>
            Crea un grupo seleccionando un sitio (opcional) y agregando guardias.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <Input
            placeholder="Nombre del Grupo*"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white border-slate-200"
          />

          <div className="space-y-2 relative">
            <Label className="text-xs text-slate-500 absolute -top-2 left-2 bg-white px-1 z-10">Seleccionar Sitio de Publicación</Label>
            <Select value={siteId ?? ""} onValueChange={(v) => setSiteId(v || undefined)}>
              <SelectTrigger className="w-full border-slate-200 text-slate-500 font-normal">
                <SelectValue placeholder="Seleccionar Sitio de Publicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Buscar usuario"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-white border-slate-200 text-slate-500"
          />

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-500">Guardias</div>
            <div className=" border-t border-x border-b-0">
              <ScrollArea className="max-h-60">
                {guardsF.length === 0 && <div className="p-4 text-sm text-muted-foreground border-b">Sin resultados</div>}
                {guardsF.map((g) => {
                  const isOn = picked.has(g.id);
                  return (
                    <div
                      key={g.id}
                      className="flex w-full items-center gap-3 border-b p-3 hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={isOn}
                        onCheckedChange={() => toggle(g.id)}
                        className="h-5 w-5 border-slate-400 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-600"
                      />
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1e293b] text-white text-xs">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-normal text-slate-600">{g.name}</div>
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => onCreate({ name: name.trim(), siteId, userIds: Array.from(picked) })}
              disabled={!name.trim() || picked.size === 0}
              variant="outline"
              className="text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              Crear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Componente main ---------------------------- */
export function Messenger({
  inbox, archived, guards, sites,
  onSelectConversation, onCreateMessage, onCreateGroup, onToggleOneWay, onArchive, onRestore, onDelete,
  disableSendOnArchived = true,
}: MessengerProps) {
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [query, setQuery] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [openNewMsg, setOpenNewMsg] = useState(false);
  const [openNewGroup, setOpenNewGroup] = useState(false);

  const source = view === "inbox" ? inbox : archived;
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return source.filter((c) => c.title.toLowerCase().includes(q));
  }, [source, query]);

  const current = filtered.find((c) => c.id === currentId) ?? null;

  const select = (id: string) => {
    setCurrentId(id);
    onSelectConversation?.(id);
  };

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-1 overflow-hidden rounded-lg border bg-white md:grid-cols-[360px_1fr]">
      {/* Sidebar */}
      <div className="flex h-full flex-col border-r bg-white">
        <div className="flex items-center justify-between border-b p-4 h-[60px]">
          {/* Header Sidebar */}
          {view === "inbox" ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded bg-slate-100"
                onClick={() => {
                  setView("archived");
                  setCurrentId(null);
                }}
                title="Archivados"
              >
                <Archive className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600 h-9">
                    <Plus className="h-4 w-4" />
                    Añadir Nuevo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setOpenNewMsg(true)} className="gap-2 cursor-pointer">
                    <MessageSquareText className="h-4 w-4 text-slate-500" /> Nuevo Mensaje
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenNewGroup(true)} className="gap-2 cursor-pointer">
                    <Users className="h-4 w-4 text-slate-500" /> Nuevo Grupo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 -ml-2"
                onClick={() => {
                  setView("inbox");
                  setCurrentId(null);
                }}
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <span className="font-medium text-slate-700">conversaciones archivadas</span>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar Chat.."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 text-slate-600 placeholder:text-slate-400"
            />
          </div>
        </div>

        <ScrollArea className="h-full">
          {filtered.length === 0 ? (
            <EmptyList label={view === "inbox" ? "Sin chats" : "Sin chats"} />
          ) : (
            <div className="">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 p-4 text-left hover:bg-slate-50 transition-colors ${currentId === c.id ? "bg-slate-50" : ""
                    }`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600 font-medium">
                    {c.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-orange-500 text-[15px]">{c.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.isSite && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 font-normal px-2 py-0.5 h-auto" variant="secondary">
                          Sitio de Publicación
                        </Badge>
                      )}
                      {c.kind === "direct" && (
                        <Badge className="bg-[#dcfce7] text-[#15803d] border-0 font-normal px-2 py-0.5 h-auto text-[11px]" variant="secondary">
                          Chat individual
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Panel derecho */}
      <div className="flex h-full flex-col bg-slate-50/30">
        {current ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-white px-4 py-3 h-[60px]">
              <div className="font-semibold text-slate-700">{current.title}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {view === "inbox" ? (
                    <>
                      <DropdownMenuItem onClick={() => current && onToggleOneWay?.(current.id)} className="cursor-pointer py-2.5">
                        Activar Conversación Unidireccional
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => current && onArchive?.(current.id)} className="cursor-pointer py-2.5">
                        Archivar Chat
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => current && onDelete?.(current.id)} className="cursor-pointer py-2.5">
                        Eliminar Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => current && onRestore?.(current.id)} className="cursor-pointer py-2.5">
                        Restaurar Chat
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mensajes */}
            <div className="flex-1 bg-slate-50/50">
              <ScrollArea className="h-full">{/* pinta tus mensajes aquí */}</ScrollArea>
            </div>

            {/* Composer */}
            {!(view === "archived" && disableSendOnArchived) && (
              <Composer
                value={msg}
                onChange={setMsg}
                onSend={() => {
                  setMsg("");
                }}
                disabled={!current}
              />
            )}
          </>
        ) : (
          <EmptyChat />
        )}
      </div>

      {/* Modales (solo tienen sentido en Bandeja) */}
      <NewMessageDialog
        open={openNewMsg}
        onOpenChange={setOpenNewMsg}
        guards={guards}
        sites={sites}
        onPick={(t) => {
          onCreateMessage?.(t);
          setOpenNewMsg(false);
        }}
      />
      <NewGroupDialog
        open={openNewGroup}
        onOpenChange={setOpenNewGroup}
        guards={guards}
        sites={sites}
        onCreate={(payload) => {
          onCreateGroup?.(payload);
          setOpenNewGroup(false);
        }}
      />
    </div>
  );
}
