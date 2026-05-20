import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Users, Shield } from 'lucide-react';

type Props = { station: any; stationId: string; postSiteId: string };

export default function StationOverview({ station }: Props) {
  const { t } = useTranslation();

  if (!station) {
    return (
      <div className="text-muted-foreground text-sm">
        {t('station.overview.noData', 'No hay información del puesto')}
      </div>
    );
  }

  const name = station.name || station.stationName || '-';
  const description = station.description || '';
  const lat = station.latitud || station.latitude || '';
  const lng = station.longitud || station.longitude || '';
  const startTime = station.startingTimeInDay || '';
  const endTime = station.finishTimeInDay || '';
  const guardsCount =
    station.numberOfGuardsInStation ??
    (Array.isArray(station.assignedGuards) ? station.assignedGuards.length : '-');

  // Parse stationSchedule JSON array (same format as Stations.tsx jornadas)
  let jornadas: any[] = [];
  try {
    const raw = station.stationSchedule;
    if (Array.isArray(raw)) {
      jornadas = raw;
    } else if (raw && typeof raw === 'string' && raw.trim().startsWith('[')) {
      jornadas = JSON.parse(raw);
    }
  } catch {}

  const JORNADA_COLORS: Record<string, string> = {
    matutina:      'bg-amber-500/15 text-amber-700 border-amber-300',
    nocturna:      'bg-indigo-500/15 text-indigo-700 border-indigo-300',
    sacafranco:    'bg-emerald-500/15 text-emerald-600 border-emerald-300',
    personalizada: 'bg-muted text-foreground border-border',
  };

  const siteTours =
    Array.isArray(station.siteTours)
      ? station.siteTours.length
      : (station.siteTours?.count ?? 0);
  const tags =
    Array.isArray(station.siteTourTags)
      ? station.siteTourTags.length
      : (station.siteTourTags?.count ?? 0);

  const assignedGuards = Array.isArray(station.assignedGuards) ? station.assignedGuards : [];

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">{name}</h2>
        {description && <p className="text-sm text-foreground/70 mb-4">{description}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {(jornadas.length > 0 || startTime || endTime) && (
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-[#C8860A] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  {t('station.overview.schedule', 'Horario')}
                </div>
                {jornadas.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {jornadas.map((j: any, i: number) => {
                      const tipo = (j.tipo || j.Tipo || '').toLowerCase();
                      const nombre = j.nombre || j.Nombre || j.tipo || j.Tipo || '';
                      const start = j.startTime || j.StartTime || '';
                      const end = j.endTime || j.EndTime || '';
                      const count = j.guardsCount || j.GuardsCount || '';
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${JORNADA_COLORS[tipo] || JORNADA_COLORS.personalizada}`}
                        >
                          {nombre}
                          {start && end && (
                            <span className="font-mono opacity-70 ml-1">{start}–{end}</span>
                          )}
                          {count && count !== '1' && (
                            <span className="ml-1 opacity-60">×{count}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-foreground font-mono">
                    {startTime}{startTime && endTime ? ' – ' : ''}{endTime}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Users size={18} className="text-[#C8860A] mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                {t('station.overview.guardCount', 'Guardias requeridos')}
              </div>
              <div className="text-sm text-foreground">{guardsCount}</div>
            </div>
          </div>

          {(lat || lng) && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-[#C8860A] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                  {t('station.overview.location', 'Ubicación')}
                </div>
                <div className="text-sm text-foreground font-mono">{lat}, {lng}</div>
              </div>
            </div>
          )}

          {(siteTours > 0 || tags > 0) && (
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-[#C8860A] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                  {t('station.overview.siteTours', 'Rondas / Tags')}
                </div>
                <div className="text-sm text-foreground">
                  {siteTours} {t('station.overview.tours', 'rondas')} · {tags} {t('station.overview.tags', 'tags')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {assignedGuards.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-base font-semibold text-foreground mb-3">
            {t('station.overview.assignedGuards', 'Guardias Asignados')}
          </h3>
          <ul className="divide-y">
            {assignedGuards.slice(0, 8).map((g: any, i: number) => {
              const gname =
                g.fullName ||
                g.name ||
                `${g.firstName || ''} ${g.lastName || ''}`.trim() ||
                g.email ||
                String(g.id || i);
              return (
                <li key={g.id || i} className="py-2 text-sm text-foreground">
                  {gname}
                </li>
              );
            })}
          </ul>
          {assignedGuards.length > 8 && (
            <div className="text-xs text-muted-foreground mt-2">
              +{assignedGuards.length - 8} {t('station.overview.more', 'más')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
