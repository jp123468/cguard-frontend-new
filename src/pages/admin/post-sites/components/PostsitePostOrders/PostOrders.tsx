import React, { useState, useRef } from 'react';
import { Search, ChevronDown, Plus, X, ArrowUpDown, FileText } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { EmptyState } from '@/components/kit';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

export default function PostSiteOrders({ site }: { site?: any }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useScrollToTopOnMount(containerRef);

  return (
    <div ref={containerRef} className="space-y-4 animate-fade-up">
      <div className="cg-card p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setActionOpen(v => !v)}
              className="px-3 py-2 border rounded-full bg-card text-sm inline-flex items-center gap-2"
            >
              {actionSelection}
              <ChevronDown size={14} />
            </button>
            {actionOpen && (
              <div className="absolute mt-2 bg-card border rounded-md shadow-lg z-10 w-48">
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Archive</button>
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Delete</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Post Order"
                className="w-full h-10 rounded-full border pl-10 pr-4"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-3 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary/90">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus size={14} />
              </span>
              <span className="text-sm font-medium">New Post Order</span>
            </button>
          </div>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" /></th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Added By</th>
                <th className="px-4 py-3 text-right"> <button className="text-muted-foreground"><ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-8">
                  <EmptyState
                    icon={<FileText />}
                    title="No Result Found"
                    description="We can't find any item matching your search"
                  />
                </td>
              </tr>
            </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList items={[]} renderCard={(po: any) => (
              <div>
                <div className="text-sm font-semibold">{po.title || 'Post Order'}</div>
                <div className="text-xs text-muted-foreground">{po.date || '-'}</div>
              </div>
            )} />
          </div>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center">
          <div className="absolute inset-0 bg-black opacity-30 z-40" onClick={() => setShowModal(false)} />
          <div className="w-full sm:ml-auto sm:w-[680px] bg-card h-full sm:h-auto shadow-2xl p-6 overflow-auto relative z-50 rounded-t-lg sm:rounded-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 sticky top-0 bg-card z-10">
              <h3 className="text-lg font-semibold">New Post Order</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-foreground/70 mb-2">Copy From</label>
                <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)} className="w-full border rounded-md h-12 px-3">
                  <option value="">Select</option>
                  <option value="template-1">Template 1</option>
                  <option value="template-2">Template 2</option>
                </select>
              </div>

              <div className="text-center text-sm text-muted-foreground">Or Create New Post Order</div>

              <div>
                <label className="block text-sm text-foreground/70 mb-2">Title*</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-md h-12 px-3" placeholder="Title*" />
              </div>

              <div>
                <div className="border rounded-md">
                  <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                    <button className="p-2 rounded hover:bg-muted text-sm">B</button>
                    <button className="p-2 rounded hover:bg-muted text-sm">I</button>
                    <button className="p-2 rounded hover:bg-muted text-sm">U</button>
                    <div className="border-l h-6 mx-2" />
                    <select className="ml-auto text-sm bg-transparent">
                      <option>Normal</option>
                      <option>Heading</option>
                    </select>
                  </div>
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type Here" className="w-full min-h-[240px] p-4" />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t p-4 flex items-center justify-end gap-3">
                <button onClick={() => { /* submit logic */ setShowModal(false);} } className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">Add</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
