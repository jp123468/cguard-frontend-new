/**
 * Operación del cliente — el árbol sitio → estaciones en UNA vista.
 * Antes llegar a una estación desde el cliente eran 4-5 navegaciones
 * (Sitios de Servicio → sitio → tab Estaciones → estación); ahora el overview
 * del cliente muestra toda su operación con enlaces directos.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Shield, Plus, ChevronRight, MapPin, Clock } from "lucide-react";
import { Section, StatusBadge, SkeletonBlock, EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { clientService } from "@/lib/api/clientService";
import { useClientSelection } from "@/contexts/ClientSelectionContext";

type Station = {
    id: string;
    stationName: string;
    nickname?: string | null;
    postSiteId?: string | null;
    numberOfGuardsInStation?: number | string | null;
    startingTimeInDay?: string | null;
    finishTimeInDay?: string | null;
    isMobile?: boolean;
};
type Site = {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    active?: boolean;
    stations: Station[];
};

function StationChip({ st, siteId }: { st: Station; siteId?: string | null }) {
    const body = (
        <>
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-tight">
                    {st.stationName}
                    {st.nickname ? <span className="text-muted-foreground"> · {st.nickname}</span> : null}
                </span>
                {(st.startingTimeInDay || st.finishTimeInDay) && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {st.startingTimeInDay || "?"} – {st.finishTimeInDay || "?"}
                    </span>
                )}
            </span>
        </>
    );
    if (siteId) {
        return (
            <Link
                to={`/post-sites/${siteId}/stations/${st.id}/overview`}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
                {body}
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
        );
    }
    return (
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 opacity-90">
            {body}
        </div>
    );
}

export default function OperationTree({ client }: { client: any }) {
    const navigate = useNavigate();
    const { setSelectedClient } = useClientSelection();
    const [sites, setSites] = useState<Site[]>([]);
    const [loose, setLoose] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!client?.id) return;
        let mounted = true;
        setLoading(true);
        clientService
            .getOperation(client.id)
            .then((r) => {
                if (!mounted) return;
                setSites(r.sites as Site[]);
                setLoose(r.looseStations as Station[]);
            })
            .catch(() => {})
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [client?.id]);

    const newSite = () => {
        setSelectedClient(client);
        navigate("/post-sites/new");
    };

    return (
        <Section
            title="Operación"
            icon={<Building2 />}
            action={
                <Button variant="brand" size="sm" onClick={newSite}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nuevo sitio
                </Button>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    <SkeletonBlock className="h-20 w-full" />
                    <SkeletonBlock className="h-20 w-full" />
                </div>
            ) : sites.length === 0 && loose.length === 0 ? (
                <EmptyState
                    icon={<Building2 />}
                    title="Este cliente aún no tiene sitios de vigilancia"
                    description='Crea su primer sitio con "Nuevo sitio" — desde ahí defines estaciones, horarios y geocercas.'
                />
            ) : (
                <div className="space-y-4">
                    {sites.map((site) => (
                        <div key={site.id} className="rounded-2xl border bg-card/50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <Link
                                        to={`/post-sites/${site.id}/overview`}
                                        className="font-semibold hover:text-primary hover:underline underline-offset-2"
                                    >
                                        {site.name}
                                    </Link>
                                    {(site.address || site.city) && (
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{[site.address, site.city].filter(Boolean).join(", ")}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {site.active === false && <StatusBadge tone="slate">Inactivo</StatusBadge>}
                                    <Button asChild variant="outline" size="sm">
                                        <Link to={`/post-sites/${site.id}/stations/new`}>
                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                            Estación
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            {site.stations.length > 0 ? (
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {site.stations.map((st) => (
                                        <StationChip key={st.id} st={st} siteId={site.id} />
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-muted-foreground">
                                    Sin estaciones todavía — agrégala con el botón «Estación».
                                </p>
                            )}
                        </div>
                    ))}

                    {loose.length > 0 && (
                        <div className="rounded-2xl border border-dashed bg-card/30 p-4">
                            <p className="mb-2 text-sm font-medium text-muted-foreground">
                                Estaciones del cliente sin sitio asignado
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {loose.map((st) => (
                                    <StationChip key={st.id} st={st} siteId={st.postSiteId} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Section>
    );
}
