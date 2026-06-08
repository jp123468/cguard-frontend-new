import { useEffect, useState } from "react";
import { PhoneCall, ShieldCheck, ShieldAlert, Siren, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { alarmService } from "@/lib/api/alarmService";

const ECV_EXEMPT = ["holdup", "panic", "fire", "medical"];

const OUTCOMES: { key: string; label: string }[] = [
  { key: "contacted", label: "Contactado" },
  { key: "no_answer", label: "Sin respuesta" },
  { key: "verified_real", label: "Verif. REAL" },
  { key: "verified_false", label: "Verif. FALSA" },
  { key: "cancel_passcode", label: "Cancelar (contraseña)" },
];
const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(OUTCOMES.map((o) => [o.key, o.label]));

/** Enhanced Call Verification panel: call the account contacts, log each outcome,
 *  and dispatch police once ECV is satisfied (exempt for hold-up/panic/fire). */
export default function AlarmECV({
  caseId, panelId, category, ecvSatisfied, calls = [], status, onChanged,
}: {
  caseId: string; panelId?: string | null; category?: string;
  ecvSatisfied?: boolean; calls?: any[]; status?: string; onChanged?: () => void;
}) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const exempt = ECV_EXEMPT.includes(category || "");
  const canDispatch = exempt || ecvSatisfied;
  const closed = status === "closed" || status === "resolved";

  useEffect(() => {
    if (panelId) alarmService.contacts(panelId).then((c) => setContacts(Array.isArray(c) ? c : [])).catch(() => {});
  }, [panelId]);

  const log = async (contact: any, outcome: string) => {
    setBusyKey(`${contact?.id || "x"}:${outcome}`);
    try {
      const r = await alarmService.logCall(caseId, {
        alarmContactId: contact?.id, contactName: contact?.name, phone: contact?.phone, outcome,
      });
      toast.success(`Llamada registrada — ${OUTCOME_LABEL[outcome]}`);
      if (r.ecvSatisfied) toast.success("ECV satisfecho — despacho policial habilitado");
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo registrar la llamada");
    } finally {
      setBusyKey(null);
    }
  };

  const dispatchPolice = async () => {
    setDispatching(true);
    try {
      const r = await alarmService.dispatchPolice(caseId, {});
      toast.success(r?.police?.message || "Despacho policial registrado");
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo despachar a la policía");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <PhoneCall className="size-4 text-[#C8860A]" /> Verificación (ECV)
        </div>
        {exempt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-600">
            <Siren className="size-3" /> Despacho inmediato (exento de ECV)
          </span>
        ) : ecvSatisfied ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-600">
            <ShieldCheck className="size-3" /> ECV satisfecho
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
            <ShieldAlert className="size-3" /> ECV pendiente ({calls.length}/2 llamadas)
          </span>
        )}
      </div>

      {!exempt && (
        <p className="mb-2 text-xs text-muted-foreground">
          Antes de despachar a la policía, intente contactar al menos 2 números de la lista (reduce falsas alarmas).
        </p>
      )}

      {!closed && (
        <div className="space-y-1.5">
          {contacts.length === 0 && <p className="text-xs text-muted-foreground">Sin contactos configurados para este panel.</p>}
          {contacts.map((ct) => (
            <div key={ct.id} className="rounded-lg border border-border/50 bg-background px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{ct.name}{ct.phone ? ` · ${ct.phone}` : ""}</span>
                <span className="text-[11px] text-muted-foreground">{ct.authority || ""}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => log(ct, o.key)}
                    disabled={busyKey === `${ct.id}:${o.key}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-[#C8860A] hover:text-foreground disabled:opacity-50"
                  >
                    {busyKey === `${ct.id}:${o.key}` ? <Loader2 className="size-3 animate-spin" /> : null}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {calls.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Registro de llamadas</div>
          {calls.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              {c.outcome === "verified_real" ? <Siren className="size-3 text-red-500" /> :
               c.outcome === "verified_false" || c.outcome === "cancel_passcode" ? <X className="size-3 text-green-600" /> :
               <Check className="size-3" />}
              <span className="text-foreground">{c.contactName || "Contacto"}</span>
              <span>· {OUTCOME_LABEL[c.outcome] || c.outcome}</span>
            </div>
          ))}
        </div>
      )}

      {!closed && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            onClick={dispatchPolice}
            disabled={!canDispatch || dispatching}
            className="gap-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            title={canDispatch ? "Despachar a la policía" : "Complete la ECV (2 llamadas) primero"}
          >
            {dispatching ? <Loader2 className="size-3.5 animate-spin" /> : <Siren className="size-3.5" />}
            Despachar policía
          </Button>
          {!canDispatch && <span className="text-[11px] text-amber-600">Requiere ECV</span>}
        </div>
      )}
    </Card>
  );
}
