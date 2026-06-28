import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, Plus, X } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Button } from '@/components/ui/button';
import { Section, StatusBadge } from '@/components/kit';

type Report = {
  id: string;
  name: string;
  description: string;
  type: 'Standard' | 'Incident';
};

const SAMPLE_REPORTS: Report[] = [
  { id: 'r1', name: 'Hourly Report', description: 'Hourly Report', type: 'Standard' },
  { id: 'r2', name: 'Vehicle Inspection Report', description: 'Vehicle Inspection Report', type: 'Standard' },
  { id: 'r3', name: 'Equipment Inspection Report', description: 'Equipment Inspection Report', type: 'Standard' },
  { id: 'r4', name: 'General Incident report', description: 'General incident report with an o...', type: 'Incident' },
  { id: 'r5', name: 'Detailed Incident Report', description: 'Detailed Incident Report', type: 'Incident' },
  { id: 'r6', name: 'Parking Violation', description: 'This report is used to check the p...', type: 'Incident' },
];

export default function PostSiteAssignReports({ site }: { site?: any }) {
  const [reports] = useState<Report[]>(SAMPLE_REPORTS);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement | null>(null);

  const [rowMenuOpen, setRowMenuOpen] = useState<Record<string, boolean>>({});
  const [confirmUnassign, setConfirmUnassign] = useState<{ open: boolean; id?: string }>({ open: false });
  const containerRef = useRef<HTMLDivElement | null>(null);
  useScrollToTopOnMount(containerRef);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function toggleSelect(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }));
  }

  function handleAction(action: string) {
    setActionOpen(false);
    if (action === 'Unassign') {
      // if multiple selected, open confirm for bulk - for now show confirmation
      setConfirmUnassign({ open: true });
    }
  }

  function openRowMenu(id: string) {
    setRowMenuOpen(r => ({ ...r, [id]: !r[id] }));
  }

  function handleRowUnassign(id?: string) {
    setRowMenuOpen({});
    setConfirmUnassign({ open: true, id });
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <Section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div ref={actionRef} className="relative">
            <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-card text-sm inline-flex items-center gap-2">
              Action
              <MoreVertical size={14} />
            </button>

            {actionOpen && (
              <div className="absolute mt-2 bg-card border rounded-md shadow-lg z-10 w-40">
                <button onClick={() => handleAction('Unassign')} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Unassign</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"><Search size={16} /></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Reports" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button variant="brand" onClick={() => { setAssignOpen(true); setAssignTarget(null); }}>
              <Plus size={16} />
              <span>Assign Report</span>
            </Button>
          </div>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" /></th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {reports.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase())).map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-4"><input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-4 py-4 text-sm text-foreground">{r.name}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{r.description}</td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={r.type === 'Standard' ? 'green' : 'red'}>{r.type}</StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-right relative">
                    <button onClick={() => openRowMenu(r.id)} className="p-2 rounded-full hover:bg-muted/30"><MoreVertical size={16} /></button>

                    {rowMenuOpen[r.id] && (
                      <div className="absolute right-0 mt-2 w-44 bg-card border rounded-md shadow-lg z-20">
                        <button onClick={() => { /* edit placeholder */ setAssignOpen(true); setAssignTarget(r.id); setRowMenuOpen({}); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Edit</button>
                        <button onClick={() => handleRowUnassign(r.id)} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Unassign</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList items={reports} renderCard={(r: Report) => (
              <div>
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.type}</div>
              </div>
            )} loading={false} />
          </div>
        </div>
      </Section>

      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignOpen(false)} />
          <div className="w-full sm:ml-auto sm:max-w-lg bg-card rounded-t-lg sm:rounded-md shadow-lg overflow-hidden m-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Custom Report</h3>
              <button onClick={() => setAssignOpen(false)} className="p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6">
              <label className="text-sm text-foreground/70">Assign Report*</label>
              <div className="mt-2 border rounded-md">
                <div className="px-3 py-2">
                  <input placeholder="Search..." className="w-full outline-none" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={() => setAssignOpen(false)}>Assign</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmUnassign.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmUnassign({ open: false })} />
          <div className="bg-card rounded-md shadow-lg w-full max-w-xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-600">!</div>
                <div>
                  <h4 className="text-lg font-semibold">Confirm Action</h4>
                  <p className="text-sm text-foreground/70 mt-1">Are you sure you want to unassign?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setConfirmUnassign({ open: false })} className="px-4 py-2 rounded-full bg-card border">Cancel</button>
              <button onClick={() => setConfirmUnassign({ open: false })} className="px-4 py-2 rounded-full bg-red-600 text-white">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
