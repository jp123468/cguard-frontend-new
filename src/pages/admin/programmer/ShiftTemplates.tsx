import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, EllipsisVertical, X, Edit, Trash2, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import shiftTemplateService, {
  type ShiftTemplate,
  type ShiftTemplateInput,
} from "@/lib/api/shiftTemplateService";
import { securityGuardService } from "@/lib/api/securityGuardService";
import { postSiteService } from "@/lib/api/postSiteService";

const NONE = "__none__";

const emptyForm = {
  templateName: "",
  startTime: "",
  endTime: "",
  repeatShift: "",
  repeatBy: "",
  postSiteId: "",
  skillSet: "",
  department: "",
  guardId: "",
  breakDuration: "",
  note: "",
  category: "",
};

export default function ShiftTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [guards, setGuards] = useState<{ id: string; name: string }[]>([]);
  const [postSites, setPostSites] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({ ...emptyForm });
  const [filters, setFilters] = useState({ category: "" });

  // ── data loading ───────────────────────────────────────────────────────────
  const loadTemplates = useCallback(() => {
    setLoading(true);
    shiftTemplateService
      .list({ "filter[category]": filters.category || undefined })
      .then((r) => setTemplates(r.rows || []))
      .catch((e) => toast.error(e?.message || "Error al cargar plantillas"))
      .finally(() => setLoading(false));
  }, [filters.category]);
  useEffect(loadTemplates, [loadTemplates]);

  // Guards + post sites for the dropdowns and for resolving names in the table.
  useEffect(() => {
    securityGuardService
      .list({ limit: "500" })
      .then((res: any) => {
        const rows = Array.isArray(res) ? res : res?.rows ?? [];
        setGuards(
          rows.map((g: any) => ({
            id: g.id,
            name: g.fullName || g.name || g.email || "—",
          })),
        );
      })
      .catch(() => {});
    postSiteService
      .list({}, { limit: 500, offset: 0 })
      .then((res) => {
        const rows = res?.rows ?? [];
        setPostSites(rows.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  const guardName = (id: string | null) => guards.find((g) => g.id === id)?.name || "—";
  const postSiteName = (id: string | null) => postSites.find((p) => p.id === id)?.name || "—";

  // ── form handlers ──────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  };

  const openEdit = (t: ShiftTemplate) => {
    setEditingId(t.id);
    setForm({
      templateName: t.templateName || "",
      startTime: t.startTime || "",
      endTime: t.endTime || "",
      repeatShift: t.repeatShift || "",
      repeatBy: t.repeatBy || "",
      postSiteId: t.postSiteId || "",
      skillSet: t.skillSet || "",
      department: t.department || "",
      guardId: t.guardId || "",
      breakDuration: t.breakDuration || "",
      note: t.note || "",
      category: t.category || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.templateName.trim() || !form.startTime || !form.endTime) {
      toast.error("Título, hora de inicio y hora de fin son obligatorios");
      return;
    }
    const payload: ShiftTemplateInput = {
      templateName: form.templateName.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      repeatShift: form.repeatShift || null,
      repeatBy: form.repeatBy || null,
      postSiteId: form.postSiteId || null,
      guardId: form.guardId || null,
      skillSet: form.skillSet || null,
      department: form.department || null,
      breakDuration: form.breakDuration || null,
      note: form.note || null,
      category: form.category || null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await shiftTemplateService.update(editingId, payload);
        toast.success("Plantilla actualizada");
      } else {
        await shiftTemplateService.create(payload);
        toast.success("Plantilla creada");
      }
      setIsFormOpen(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      loadTemplates();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await shiftTemplateService.remove(id);
      toast.success("Plantilla eliminada");
      loadTemplates();
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  };

  const filteredTemplates = templates.filter((t) =>
    !searchQuery || t.templateName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: "Panel de control", path: "/dashboard" },
          { label: "Plantillas de turno" },
        ]}
      />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar Plantilla de Turno"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
                <SheetTrigger asChild>
                  <Button className="bg-[#C8860A] hover:bg-[#B37809] text-white" onClick={openNew}>
                    Nueva Plantilla de Turno
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader className="relative">
                    <SheetTitle>
                      {editingId ? "Editar Plantilla de Turno" : "Nueva Plantilla de Turno"}
                    </SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsFormOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid gap-2">
                      <Label>Título del Turno*</Label>
                      <Input
                        value={form.templateName}
                        onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Hora de Inicio*</Label>
                        <Input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Hora de Fin*</Label>
                        <Input
                          type="time"
                          value={form.endTime}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Repetir Turno</Label>
                        <Select value={form.repeatShift} onValueChange={(v) => setForm({ ...form, repeatShift: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diario</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Repetir Por</Label>
                        <Select value={form.repeatBy} onValueChange={(v) => setForm({ ...form, repeatBy: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Día</SelectItem>
                            <SelectItem value="week">Semana</SelectItem>
                            <SelectItem value="month">Mes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Puesto de seguridad</Label>
                      <Select
                        value={form.postSiteId || NONE}
                        onValueChange={(v) => setForm({ ...form, postSiteId: v === NONE ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin asignar</SelectItem>
                          {postSites.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Conjunto de Habilidades</Label>
                      <Select value={form.skillSet} onValueChange={(v) => setForm({ ...form, skillSet: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Básico</SelectItem>
                          <SelectItem value="advanced">Avanzado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Departamento</Label>
                      <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="security">Seguridad</SelectItem>
                          <SelectItem value="admin">Administración</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Vigilante</Label>
                      <Select
                        value={form.guardId || NONE}
                        onValueChange={(v) => setForm({ ...form, guardId: v === NONE ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin asignar</SelectItem>
                          {guards.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Descansos</Label>
                      <Select value={form.breakDuration} onValueChange={(v) => setForm({ ...form, breakDuration: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30min">30 minutos</SelectItem>
                          <SelectItem value="1hour">1 hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nota</Label>
                      <Textarea
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="special">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1 bg-[#C8860A] hover:bg-[#B37809] text-white"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Guardando…" : editingId ? "Actualizar" : "Guardar"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10"
                        onClick={() => setIsFormOpen(false)}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="text-[#C8860A] border-[#C8860A]/30 hover:bg-[#C8860A]/10 hover:text-[#C8860A]">
                    <Filter className="h-4 w-4 mr-2" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader className="relative">
                    <SheetTitle>Filtros</SheetTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetHeader>
                  <div className="space-y-6 py-4">
                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select
                        value={filters.category || NONE}
                        onValueChange={(v) => setFilters({ ...filters, category: v === NONE ? "" : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Todas</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="special">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox /></TableHead>
                <TableHead className="font-bold text-foreground">Nombre de la Plantilla</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Inicio</TableHead>
                <TableHead className="font-bold text-foreground">Hora de Fin</TableHead>
                <TableHead className="font-bold text-foreground">Puesto de seguridad</TableHead>
                <TableHead className="font-bold text-foreground">Vigilante</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[300px] text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-[#C8860A]" />
                      <p className="text-sm">Cargando plantillas…</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-[300px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <h3 className="text-lg font-medium text-foreground mb-1">No hay plantillas</h3>
                      <p className="text-sm max-w-xs">
                        Crea tu primera plantilla de turno con el botón de arriba.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEdit(template)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="text-[#C8860A] font-medium">{template.templateName}</TableCell>
                    <TableCell>{template.startTime}</TableCell>
                    <TableCell>{template.endTime}</TableCell>
                    <TableCell>{postSiteName(template.postSiteId)}</TableCell>
                    <TableCell>{guardName(template.guardId)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(template)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(template.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
