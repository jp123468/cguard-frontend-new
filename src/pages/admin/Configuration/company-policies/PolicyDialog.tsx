"use client";

import { useMemo, useState } from "react";
import { X, Bold, Italic, Underline, Quote, List, ListOrdered, Type } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";

type Guard = { id: string; name: string };
type SkillSet = { id: string; name: string };
type Department = { id: string; name: string };

const MOCK_DEPTS: Department[] = [
  { id: "ops", name: "Operaciones" },
  { id: "rh", name: "Recursos Humanos" },
  { id: "leg", name: "Legal" },
];

const MOCK_SKILLS: SkillSet[] = [
  { id: "armas", name: "Manejo de armas" },
  { id: "cctv", name: "CCTV" },
  { id: "primeros", name: "Primeros auxilios" },
];

const MOCK_GUARDS: Guard[] = [
  { id: "g1", name: "Juan Pérez" },
  { id: "g2", name: "Ana Torres" },
  { id: "g3", name: "Carlos Rivas" },
  { id: "g4", name: "María León" },
];

export type PolicyForm = {
  title: string;
  content: string;
  departmentId?: string;
  skillSetId?: string;
  guards: string[];
};

export default function PolicyDialog({
  open,
  onOpenChange,
  onSubmit,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: PolicyForm) => void;
  onDraft: (data: PolicyForm) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dept, setDept] = useState<string | undefined>();
  const [skill, setSkill] = useState<string | undefined>();
  const [guards, setGuards] = useState<string[]>([]);

  const selectedGuards = useMemo(() => MOCK_GUARDS.filter((g) => guards.includes(g.id)), [guards]);

  const reset = () => {
    setTitle("");
    setContent("");
    setDept(undefined);
    setSkill(undefined);
    setGuards([]);
  };

  const payload: PolicyForm = { title, content, departmentId: dept, skillSetId: skill, guards };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Agregar Política de Empresa</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          <Input placeholder="Título*" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="border rounded-md">
            <div className="flex items-center gap-2 p-2 border-b bg-muted/40 text-muted-foreground">
              <Button size="sm" type="button" variant="ghost"><Bold className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><Italic className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><Underline className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><Quote className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><List className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><ListOrdered className="h-4 w-4" /></Button>
              <Button size="sm" type="button" variant="ghost"><Type className="h-4 w-4" /></Button>
            </div>
            <Textarea
              className="min-h-[220px] rounded-none border-0 focus-visible:ring-0"
              placeholder="Escribir aquí"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Departamento</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_DEPTS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Conjunto de Habilidades</Label>
              <Select value={skill} onValueChange={setSkill}>
                <SelectTrigger>
                  <SelectValue placeholder="Conjunto de Habilidades" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_SKILLS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Seleccionar Guardias Específicos</Label>
              <GuardMultiSelect value={guards} onChange={setGuards} />
              {selectedGuards.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedGuards.map((g) => (
                    <Badge key={g.id} variant="secondary" className="px-2 py-1">
                      {g.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDraft(payload)}
              className="bg-muted text-foreground"
            >
              Guardar como borrador
            </Button>
            <Button onClick={() => onSubmit(payload)} disabled={!title.trim()}>
              Guardar
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">
                <X className="mr-2 h-4 w-4" /> Cerrar
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GuardMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const picked = MOCK_GUARDS.filter((g) => value.includes(g.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {picked.length ? (
            <span className="truncate">{picked.map((g) => g.name).join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">Seleccionar guardias…</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[360px]">
        <Command>
          <CommandInput placeholder="Buscar guardia…" />
          <CommandList>
            <CommandGroup>
              {MOCK_GUARDS.map((g) => {
                const isChecked = value.includes(g.id);
                return (
                  <CommandItem
                    key={g.id}
                    onSelect={() => {
                      if (isChecked) onChange(value.filter((id) => id !== g.id));
                      else onChange([...value, g.id]);
                    }}
                  >
                    <input className="mr-2" type="checkbox" readOnly checked={isChecked} />
                    {g.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
