import React, { useEffect, useRef, useState } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Search, ChevronDown, Plus, EllipsisVertical, Eye, Archive, MapPin } from 'lucide-react';
import { postSiteService } from '@/lib/api/postSiteService';
import { stationService } from '@/lib/api/stationService';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MobileCardList from '@/components/responsive/MobileCardList';
import { ServiceTypeBadge } from '@/components/post-sites/ServiceTypeBadge';
import { useTranslation } from 'react-i18next';
import { useClientSelection } from '@/contexts/ClientSelectionContext';
import { Section, EmptyState, StatusBadge, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';

export default function ClientPostSites({ client }: { client: any }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSelectedClient } = useClientSelection();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>(t('clientPostSites.action'));
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // archiving state for modal confirmation
  const [archiveTargetIds, setArchiveTargetIds] = useState<string[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (client?.postSites && Array.isArray(client.postSites) && client.postSites.length > 0) {
          if (mounted) setRows(client.postSites);
          } else if (client?.id) {
          const resp = await stationService.list({ clientId: client.id }, { limit: 100, offset: 0 });
          if (mounted) setRows(resp.rows || []);
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [client]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) setActionOpen(false);
    };
    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionOpen]);

  const filtered = rows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.name || r.companyName || '').toLowerCase().includes(q) || (r.contactEmail || r.email || '').toLowerCase().includes(q) || (r.contactPhone || r.phone || '').toLowerCase().includes(q);
  });

  useScrollToTopOnMount(containerRef);

  return (
    <div ref={containerRef}>
      <Section title={t('clientPostSites.headers.postSite')} icon={<MapPin />}>
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-auto" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="px-3 py-2 border rounded-md bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/30 w-full sm:min-w-[100px] justify-center transition-colors"
            >
              {actionSelection}
              <ChevronDown size={16} />
            </button>
            {actionOpen && (
              <div className="absolute left-0 mt-1 bg-card border rounded-md shadow-lg z-50 w-44">
                <button onClick={() => { setActionOpen(false); if (selectedIds.length === 0) { toast.error(t('clientPostSites.selectAtLeastOne') || 'Selecciona al menos un sitio'); return; } setArchiveTargetIds(selectedIds); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted">{t('clientPostSites.archive')}</button>
              </div>
            )}
          </div>

          <div className="w-full sm:flex-1 flex justify-center">
            <div className="relative w-full max-w-lg">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('clientPostSites.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <Button
            variant="brand"
            onClick={() => { setSelectedClient(client); navigate('/post-sites/new'); }}
            className="w-full gap-2 rounded-full sm:w-auto"
          >
            <Plus className="size-4" />
            {t('clientPostSites.newPostSite')}
          </Button>
        </div>

        <div className="md:block hidden overflow-x-auto rounded-xl border">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '48px' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '48px' }} />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filtered.map((r) => r.id));
                      else setSelectedIds([]);
                    }}
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('clientPostSites.headers.postSite')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('clientPostSites.headers.email')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('clientPostSites.headers.phoneNumber')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('clientPostSites.headers.status')}</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <EmptyState
                      icon={<MapPin />}
                      title={t('clientPostSites.noResult.title')}
                      description={t('clientPostSites.noResult.description')}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds((p) => Array.from(new Set([...p, s.id])));
                          else setSelectedIds((p) => p.filter((id) => id !== s.id));
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground"><div className="truncate max-w-full">{s.companyName ?? s.name}</div></td>
                    <td className="px-3 py-2"><ServiceTypeBadge value={s.serviceType} /></td>
                    <td className="px-3 py-2 text-sm text-foreground"><div className="truncate max-w-full">{s.contactEmail ?? s.email ?? '-'}</div></td>
                    <td className="px-3 py-2 text-sm text-foreground"><div className="truncate">{s.contactPhone ?? s.phone ?? '-'}</div></td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(s.status === 'active' || s.active === true) ? (
                        <StatusBadge tone="green">{t('common.active')}</StatusBadge>
                      ) : (
                        <StatusBadge tone="slate">{t('common.inactive')}</StatusBadge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground relative overflow-visible">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button aria-label="Open menu" className="p-2 rounded-full hover:bg-muted"><EllipsisVertical className="h-5 w-5 text-muted-foreground" /></button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1 rounded-md shadow-lg z-50">
                          <Link to={`/post-sites/${s.id}`} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-muted/30"><Eye className="h-4 w-4" />{` ${t('clientPostSites.viewDetails')}`}</Link>
                          <button onClick={() => { setArchiveTargetIds([s.id]); /* close popover visually */ (document.activeElement as HTMLElement | null)?.blur(); setSelectedIds((p) => p.filter((id) => id !== s.id)); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-muted/30"><Archive className="h-4 w-4" />{` ${t('clientPostSites.archive')}`}</button>
                        </PopoverContent>
                      </Popover>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden">
          <MobileCardList
            items={filtered}
            loading={false}
            emptyMessage={t('clientPostSites.noResult.title')}
            renderCard={(s: any) => (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{s.companyName ?? s.name}</div>
                    <div className="text-xs text-muted-foreground">{(s.client && (s.client.name || s.client.companyName)) || (s.clientAccount && (s.clientAccount.name || s.clientAccount.companyName)) || '-'}</div>
                    <div className="text-xs text-muted-foreground">{s.contactEmail ?? s.email ?? '-'}</div>
                  </div>
                  <div className="text-right">
                    <div>
                      {s.status === 'active' ? (
                        <StatusBadge tone="green">{t('common.active')}</StatusBadge>
                      ) : (
                        <StatusBadge tone="slate">{t('common.inactive')}</StatusBadge>
                      )}
                    </div>
                    <div className="mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button aria-label="Open menu" className="p-2 rounded-full hover:bg-muted"><EllipsisVertical className="h-5 w-5 text-muted-foreground" /></button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1 rounded-md shadow-lg z-50">
                          <Link to={`/post-sites/${s.id}`} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-muted/30"><Eye className="h-4 w-4" />{` ${t('clientPostSites.viewDetails')}`}</Link>
                          <button onClick={() => { setArchiveTargetIds([s.id]); (document.activeElement as HTMLElement | null)?.blur(); setSelectedIds((p) => p.filter((id) => id !== s.id)); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-muted/30"><Archive className="h-4 w-4" />{` ${t('clientPostSites.archive')}`}</button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* Archive confirmation modal (bottom-sheet on mobile) */}
        <Modal
          open={archiveTargetIds.length > 0}
          onOpenChange={(o) => { if (!o) setArchiveTargetIds([]); }}
          title={t('clientPostSites.confirmArchiveTitle', { count: archiveTargetIds.length })}
          icon={<Archive />}
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setArchiveTargetIds([])}>{t('common.cancel')}</Button>
              <Button
                variant="destructive"
                disabled={archiveLoading}
                onClick={async () => {
                  setArchiveLoading(true);
                  try {
                    const results = await Promise.all(archiveTargetIds.map(async (id) => {
                      try {
                        const station = await stationService.get(id);
                        const guardsCount = station?.guardsCount ?? (Array.isArray(station?.assignedGuards) ? station.assignedGuards.length : 0);
                        if (guardsCount > 0) {
                          return { id, ok: false, reason: 'linked_guards' };
                        }
                        await stationService.update(id, { status: 'inactive' } as any);
                        return { id, ok: true };
                      } catch (e) {
                        return { id, ok: false, reason: 'error' };
                      }
                    }));

                    const successes = results.filter(r => r.ok).map(r => r.id);
                    const linked = results.filter(r => !r.ok && r.reason === 'linked_guards').map(r => r.id);
                    const errors = results.filter(r => !r.ok && r.reason === 'error').map(r => r.id);

                    if (successes.length > 0) {
                      setRows(prev => prev.filter(r => !successes.includes(r.id)));
                      setSelectedIds(prev => prev.filter(id => !successes.includes(id)));
                      toast.success(successes.length === archiveTargetIds.length ? t('clientPostSites.archivedAll') : t('clientPostSites.archivedPartial', { count: successes.length }));
                    }
                    if (linked.length > 0) {
                      toast.error(t('clientPostSites.cannotArchiveLinkedGuards', { count: linked.length }));
                    }
                    if (errors.length > 0) {
                      toast.error(t('clientPostSites.archivePartialError'));
                    }
                  } catch (err) {
                    toast.error(t('clientPostSites.archiveError'));
                  } finally {
                    setArchiveLoading(false);
                    setArchiveTargetIds([]);
                  }
                }}
              >{archiveLoading ? t('clientPostSites.archiving') : t('clientPostSites.archive')}</Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground text-center">{t('clientPostSites.confirmArchiveDescription', { count: archiveTargetIds.length })}</p>
        </Modal>
      </Section>
    </div>
  );
}
