import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientService } from '@/lib/api/clientService';
import GoogleMapEmbed from '@/components/GoogleMap/GoogleMapEmbed';
import { Section, EmptyState } from '@/components/kit';
import {
  Building2, Search, MapPin, Users, Clock, BarChart3, ChevronLeft, ChevronRight,
} from 'lucide-react';

type Sede = {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  active: boolean;
  stations: number;
  guards: number;
  required: number;
  coverage: number; // 0-100
  lat?: number;
  lng?: number;
  thumb?: string | null;
};

const riskTone = (r: string) => {
  const v = String(r || '').toLowerCase();
  return v.includes('alt') ? 'bg-red-500/12 text-red-600'
    : v.includes('med') ? 'bg-orange-500/12 text-orange-600'
    : v ? 'bg-emerald-500/12 text-emerald-600' : 'bg-muted text-muted-foreground';
};
const covTone = (c: number) => (c >= 95 ? 'bg-emerald-500' : c >= 70 ? 'bg-orange-500' : 'bg-red-500');
const markerRole = (s: Sede) => (!s.active ? 'muted' : s.coverage >= 95 ? 'ok' : s.coverage >= 70 ? 'warn' : 'crit');

export default function ClientPostSites({ client }: { client: any }) {
  const navigate = useNavigate();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [tz, setTz] = useState<string>('');
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState('todos');
  const [ciudad, setCiudad] = useState('todas');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client?.id) return;
      setLoading(true);
      const [op, ps, ov] = await Promise.all([
        clientService.getOperation(client.id).catch(() => ({ sites: [], looseStations: [] })),
        clientService.getClientPostSites(client.id, { limit: 999, offset: 0 }).catch(() => null),
        clientService.getClientOverview(client.id).catch(() => null),
      ]);
      if (!mounted) return;
      if (ov?.tenantTimezone) setTz(ov.tenantTimezone);
      const psRows: any[] = Array.isArray(ps) ? ps : (ps?.rows ?? []);
      const meta = new Map<string, any>();
      for (const r of psRows) {
        meta.set(String(r.id), {
          lat: r.latitud != null ? Number(r.latitud) : (r.latitude != null ? Number(r.latitude) : undefined),
          lng: r.longitud != null ? Number(r.longitud) : (r.longitude != null ? Number(r.longitude) : undefined),
          thumb: Array.isArray(r.placePictureUrl) ? r.placePictureUrl[0]?.downloadUrl : null,
          city: r.city, address: r.address, active: r.active,
        });
      }
      const list: Sede[] = (op?.sites || []).map((s: any, i: number) => {
        const guards = new Set<string>();
        (s.stations || []).forEach((st: any) => (st.guards || []).forEach((g: any) => guards.add(String(g.id))));
        const stations = (s.stations || []).length;
        const required = stations; // 1 fijo por estación
        const m = meta.get(String(s.id)) || {};
        const cov = required > 0 ? Math.min(100, Math.round((guards.size / required) * 100)) : 0;
        return {
          id: s.id, code: `SDE-${String(i + 1).padStart(3, '0')}`, name: s.name,
          address: s.address || m.address || '', city: s.city || m.city || '',
          active: s.active !== undefined ? !!s.active : !!m.active,
          stations, guards: guards.size, required, coverage: cov,
          lat: m.lat, lng: m.lng, thumb: m.thumb,
        };
      });
      setSedes(list);
      setSelectedId(list[0]?.id ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [client?.id]);

  const cities = useMemo(() => Array.from(new Set(sedes.map((s) => s.city).filter(Boolean))), [sedes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sedes.filter((s) => {
      if (q && !(`${s.name} ${s.address} ${s.code}`.toLowerCase().includes(q))) return false;
      if (estado === 'activa' && !s.active) return false;
      if (estado === 'inactiva' && s.active) return false;
      if (ciudad !== 'todas' && s.city !== ciudad) return false;
      return true;
    });
  }, [sedes, query, estado, ciudad]);

  const selected = sedes.find((s) => s.id === selectedId) || null;
  const risk = client?.riskLevel || '';
  const mapMarkers = filtered.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, label: s.name, role: markerRole(s) }));

  const selCtrl = 'h-9 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Left: table */}
      <div className="lg:col-span-2">
        <Section title="Sedes" icon={<Building2 />}>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar sede por nombre o dirección" className={`${selCtrl} h-9 w-full pl-8`} />
            </div>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selCtrl}>
              <option value="todos">Estado: Todos</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
            <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={selCtrl}>
              <option value="todas">Ciudad: Todas</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Building2 />} title="Sin sedes" description="Este cliente aún no tiene sedes registradas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Sede</th>
                    <th className="py-2 pr-3 font-medium">Dirección</th>
                    <th className="py-2 pr-3 font-medium">Ciudad</th>
                    {risk && <th className="py-2 pr-3 font-medium">Riesgo</th>}
                    <th className="py-2 pr-3 font-medium">Guardias</th>
                    <th className="py-2 pr-3 font-medium">Puestos</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`cursor-pointer border-b border-border/40 last:border-0 ${selectedId === s.id ? 'bg-primary/5' : 'hover:bg-accent/40'}`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            markerRole(s) === 'ok' ? 'bg-emerald-500' : markerRole(s) === 'warn' ? 'bg-orange-500' : markerRole(s) === 'crit' ? 'bg-red-500' : 'bg-slate-400'
                          }`}>{i + 1}</span>
                          {s.thumb ? (
                            <img src={s.thumb} alt="" className="h-8 w-8 shrink-0 rounded-lg border object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Building2 className="h-4 w-4" /></span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground"><span className="line-clamp-2">{s.address || '—'}</span></td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{s.city || '—'}</td>
                      {risk && <td className="py-2.5 pr-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${riskTone(risk)}`}>{risk}</span></td>}
                      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{s.guards} / {s.required}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{s.stations}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.active ? 'bg-emerald-500/12 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{s.active ? 'Activa' : 'Inactiva'}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {s.stations > 0 ? (
                          <div className="min-w-[90px]">
                            <div className="flex items-center justify-between text-[11px] font-medium"><span>{s.coverage}%</span></div>
                            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full ${covTone(s.coverage)}`} style={{ width: `${s.coverage}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <span>Mostrando {filtered.length} de {sedes.length} sedes</span>
              <div className="flex items-center gap-1">
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-input opacity-40" disabled><ChevronLeft className="h-4 w-4" /></button>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">1</span>
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-input opacity-40" disabled><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Right: map + selected details */}
      <div className="space-y-5">
        <Section title="Mapa de sedes" icon={<MapPin />}>
          {mapMarkers.length > 0 ? (
            <div className="h-[260px] overflow-hidden rounded-xl border">
              <GoogleMapEmbed
                lat={selected?.lat ?? mapMarkers[0].lat}
                lng={selected?.lng ?? mapMarkers[0].lng}
                markers={mapMarkers}
                zoom={11}
                mapType="roadmap"
                draggable
              />
            </div>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
              <MapPin className="h-5 w-5 opacity-50" /> Las sedes no tienen ubicación registrada
            </div>
          )}
        </Section>

        <Section title="Detalles de la sede seleccionada" icon={<Building2 />}>
          {!selected ? (
            <EmptyState icon={<Building2 />} title="Selecciona una sede" description="Toca una fila para ver su detalle." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {selected.thumb ? (
                  <img src={selected.thumb} alt="" className="h-16 w-16 shrink-0 rounded-xl border object-cover" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Building2 className="h-6 w-6" /></span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-foreground">{selected.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${selected.active ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${selected.active ? 'bg-emerald-500' : 'bg-red-500'}`} />{selected.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>{selected.code}</span>
                    {risk && <>· Nivel de riesgo: <span className={`rounded-full px-1.5 py-0.5 font-semibold capitalize ${riskTone(risk)}`}>{risk}</span></>}
                  </p>
                  {selected.address && <p className="mt-1 text-xs text-muted-foreground">{selected.address}{selected.city ? `, ${selected.city}` : ''}</p>}
                  {Number.isFinite(selected.lat) && <p className="text-xs text-muted-foreground">📍 {selected.lat!.toFixed(4)}, {selected.lng!.toFixed(4)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat icon={<Building2 className="h-4 w-4" />} label="Puestos" value={selected.stations} />
                <Stat icon={<Users className="h-4 w-4" />} label="Guardias asignados" value={`${selected.guards} / ${selected.required}`} />
                <Stat icon={<BarChart3 className="h-4 w-4" />} label="Cobertura" value={`${selected.coverage}%`} />
                <Stat icon={<Clock className="h-4 w-4" />} label="Zona horaria" value={tz || '—'} />
              </div>

              <button
                onClick={() => navigate(`/post-sites/${selected.id}/overview`)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15"
              >
                <BarChart3 className="h-4 w-4" /> Ver dashboard de la sede
              </button>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
      <p className="mt-0.5 font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
