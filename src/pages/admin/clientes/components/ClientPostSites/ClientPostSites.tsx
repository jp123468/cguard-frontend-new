import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Plus, EllipsisVertical, Eye, Archive } from 'lucide-react';
import { postSiteService } from '@/lib/api/postSiteService';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function ClientPostSites({ client }: { client: any }) {
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
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
          const resp = await postSiteService.list({ clientId: client.id }, { limit: 100, offset: 0 });
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 min-w-[100px]"
            >
              {actionSelection}
              <ChevronDown size={16} />
            </button>
            {actionOpen && (
              <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-44">
                <button onClick={() => { setActionOpen(false); if (selectedIds.length === 0) { toast.error('Selecciona al menos un sitio'); return; } setArchiveTargetIds(selectedIds); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Archive</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-lg">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search post site"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <Link to="/post-sites/new" className="px-6 py-2 bg-orange-600 text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors">
            <Plus size={16} />
            New Post Site
          </Link>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Post Site</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-40 h-40">
                        <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                          <rect x="30" y="60" width="140" height="100" fill="currentColor" rx="12" />
                          <circle cx="80" cy="95" r="8" fill="white" />
                          <circle cx="120" cy="95" r="8" fill="white" />
                          <path d="M 80 125 L 120 125" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-700">No Result Found</h3>
                        <p className="text-sm text-gray-500 mt-1">We can't find any item matching your search</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds((p) => Array.from(new Set([...p, s.id])));
                          else setSelectedIds((p) => p.filter((id) => id !== s.id));
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.companyName ?? s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{(s.client && (s.client.name || s.client.companyName)) || (s.clientAccount && (s.clientAccount.name || s.clientAccount.companyName)) || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.contactEmail ?? s.email ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.contactPhone ?? s.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.status === 'active' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-600 text-xs font-semibold">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 relative overflow-visible">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button aria-label="Open menu" className="p-2 rounded-full hover:bg-gray-100"><EllipsisVertical className="h-5 w-5 text-slate-400" /></button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1 rounded-md shadow-lg z-50">
                          <Link to={`/post-sites/${s.id}`} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50"><Eye className="h-4 w-4" />{` ${'View Details'}`}</Link>
                          <button onClick={() => { setArchiveTargetIds([s.id]); /* close popover visually */ (document.activeElement as HTMLElement | null)?.blur(); setSelectedIds((p) => p.filter((id) => id !== s.id)); }} className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50"><Archive className="h-4 w-4" />{` ${'Archive'}`}</button>
                        </PopoverContent>
                      </Popover>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Archive confirmation modal */}
        {archiveTargetIds.length > 0 && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setArchiveTargetIds([])} />
            <div className="bg-white rounded-md shadow-xl p-6 z-70 w-full max-w-md mx-auto max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-semibold mb-2 text-center">{`Archive ${archiveTargetIds.length > 1 ? 'Post Sites' : 'Post Site'}?`}</h3>
              <p className="text-sm text-gray-600 mb-4 text-center">{`Are you sure you want to archive the selected ${archiveTargetIds.length} site(s)? This will mark them as inactive.`}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setArchiveTargetIds([])} className="px-4 py-2 rounded-md border">Cancel</button>
                <button onClick={async () => {
                  setArchiveLoading(true);
                  try {
                    const results = await Promise.allSettled(archiveTargetIds.map(id => postSiteService.update(id, { status: 'inactive' } as any)));
                    const successes = results.reduce((acc, r, idx) => (r.status === 'fulfilled' ? acc.concat(archiveTargetIds[idx]) : acc), [] as string[]);
                    if (successes.length > 0) {
                      setRows(prev => prev.filter(r => !successes.includes(r.id)));
                      setSelectedIds(prev => prev.filter(id => !successes.includes(id)));
                      toast.success(successes.length === archiveTargetIds.length ? 'Sitio(s) archivado(s)' : `${successes.length} sitio(s) archivado(s)`);
                    }
                    const failures = results.filter(r => r.status === 'rejected');
                    if (failures.length > 0) {
                      toast.error('Error archiving some sites');
                    }
                  } catch (err) {
                    toast.error('Error archiving');
                  } finally {
                    setArchiveLoading(false);
                    setArchiveTargetIds([]);
                  }
                }} className="px-4 py-2 rounded-md bg-red-600 text-white">{archiveLoading ? 'Archiving...' : 'Archive'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
