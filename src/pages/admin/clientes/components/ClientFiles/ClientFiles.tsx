import React, { useState, useRef, useEffect } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Search, ChevronDown, Plus, X, Paperclip } from 'lucide-react';
import ClientsLayout from '@/layouts/ClientsLayout';
import AppLayout from '@/layouts/app-layout';
import MobileCardList from '@/components/responsive/MobileCardList';
import securityGuardService from '@/lib/api/securityGuardService';
import api from '@/lib/api';
import { toast } from 'sonner';

type Props = { client?: any };

export default function ClientFiles({ client }: Props) {
  const actionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
  const [searchQuery, setSearchQuery] = useState('');
  const [filesData, setFilesData] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleOpenUpload = () => {
    setShowUpload(true);
    setUploadFiles([]);
    setDragOver(false);
  };
  const handleCloseUpload = () => setShowUpload(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) setActionOpen(false);
    };
    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionOpen]);

  const handleSubmitUpload = () => {
    (async () => {
      if (uploadFiles.length === 0) { setShowUpload(false); return; }

      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) { toast.error('Missing tenantId'); return; }

      const createdFiles: any[] = [];

      for (const f of uploadFiles) {
        // Validate type and size (<= 3MB)
        if (!(f.type === 'application/pdf' || f.type.startsWith('image/'))) {
          toast.error(`Tipo no permitido: ${f.name}`);
          continue;
        }
        if (f.size > 3 * 1024 * 1024) {
          toast.error(`Archivo mayor a 3MB: ${f.name}`);
          continue;
        }

        const storageId = f.type === 'application/pdf' ? 'notesPdf' : 'notesImages';
        try {
          setUploadProgress((p) => ({ ...p, [f.name]: 0 }));
          const uploaded = await securityGuardService.uploadFileToStorageWithProgress(f, storageId, (percent) => {
            setUploadProgress((p) => ({ ...p, [f.name]: percent }));
          });

          const payload = {
            name: uploaded.name,
            mimeType: f.type,
            sizeInBytes: f.size,
            storageId: storageId,
            // prefer encrypted token when available
            fileToken: uploaded.fileToken || null,
            publicUrl: uploaded.publicUrl || null,
            notableType: 'clientAccount',
            notableId: client?.id,
          };

          const resp: any = await api.post(`/tenant/${tenantId}/attachments`, payload);
          const created = resp && (resp as any).data ? (resp as any).data : resp;

          createdFiles.push({ id: created.id, name: created.name, date: new Date().toISOString().slice(0,10), addedBy: 'You' });
          setUploadProgress((p) => ({ ...p, [f.name]: 100 }));
        } catch (err) {
          console.error('Upload/create failed', err);
          toast.error(`Fallo al subir ${f.name}`);
          setUploadProgress((p) => ({ ...p, [f.name]: 0 }));
        }
      }

      if (createdFiles.length) setFilesData((prev) => [...createdFiles, ...prev]);
      setUploadFiles([]);
      setTimeout(() => setUploadProgress({}), 500);
      setShowUpload(false);
    })();
  };

  const removeUploadFile = (idx: number) => setUploadFiles((prev) => prev.filter((_, i) => i !== idx));

  useScrollToTopOnMount(containerRef);

  return (

  <div ref={containerRef} className="min-h-screen flex flex-col">
      <div className="bg-card border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="px-3 py-2 border rounded-md bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/30 min-w-[100px]"
            >
              {actionSelection}
              <ChevronDown size={16} />
            </button>
            {actionOpen && (
              <div className="absolute left-0 mt-1 bg-card border rounded-md shadow-lg z-10 w-full">
                <button onClick={() => { setActionSelection('Delete'); setActionOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted">Delete</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-lg">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button onClick={handleOpenUpload} className="px-6 py-2 bg-primary text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus size={18} />
            Upload New Files
          </button>
        </div>

        <div className="mt-6 md:block hidden flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left"><input type="checkbox" className="rounded" /></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">File</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Added By</th>
              </tr>
            </thead>
            <tbody>
              {filesData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-32 h-32">
                        <svg viewBox="0 0 200 200" className="w-full h-full text-primary/10">
                          <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                          <circle cx="85" cy="100" r="8" fill="white" />
                          <circle cx="115" cy="100" r="8" fill="white" />
                          <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-foreground">No results found</h3>
                        <p className="text-sm text-muted-foreground mt-1">We couldn't find<br />any items matching<br />your search</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filesData.map((f, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-foreground"><input type="checkbox" /></td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.date}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.file}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.addedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 md:hidden">
          <MobileCardList
            items={filesData}
            loading={false}
            emptyMessage={'No results found'}
            renderCard={(f: any) => (
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.date}</div>
                </div>
                <div>
                  <div className="text-sm text-foreground">{f.addedBy}</div>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center" onClick={handleCloseUpload}>
          <div className="absolute inset-0 bg-black opacity-30" onClick={handleCloseUpload} />
          <div className="w-full sm:w-96 bg-card rounded-t-lg sm:rounded-md flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <button onClick={handleCloseUpload} className="text-muted-foreground hover:text-foreground/70"><X /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false);
                  const files = Array.from(e.dataTransfer?.files || [] as File[]);
                  if (files.length) setUploadFiles((prev) => [...prev, ...files]);
                }}
                className={`w-full border-dashed rounded-md p-8 mb-8 text-center ${dragOver ? 'border-2 border-border bg-muted/30' : 'border border-border'}`}>
                {uploadFiles.length > 0 ? (
                  <div className="flex justify-center">
                    <div className="bg-muted rounded-md px-3 py-2 text-sm text-foreground w-full min-w-0 overflow-hidden">
                      <span className="block truncate">{uploadFiles.map((f) => f.name).join(', ')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Drop files here..</div>
                )}
              </div>

              <div className="text-center my-6 text-muted-foreground">Or Select</div>

              <div className="flex items-center gap-3 mt-6">
                <div className="flex-1 relative min-w-0">
                  <div className="w-full border rounded-md px-3 py-2 text-sm flex items-center justify-between min-w-0">
                    <span className="block truncate text-sm text-foreground">{uploadFiles.length > 0 ? uploadFiles.map((f) => f.name).join(', ') : 'Choose files No files selected'}</span>
                    <span className="text-muted-foreground ml-3"><Paperclip /></span>
                  </div>
                  <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setUploadFiles((prev) => [...prev, ...files]); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {uploadFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Files to upload</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-sm min-w-0">
                        <span className="truncate mr-4 block min-w-0">{f.name}</span>
                        <button
                          onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 p-1 rounded hover:bg-red-500/10"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-card">
              <button onClick={() => { setUploadFiles([]); setShowUpload(false); }} className="px-4 py-2 text-foreground border rounded-md hover:bg-muted/30">Cancel</button>
              <button onClick={() => { handleSubmitUpload(); }} className="px-4 py-2 bg-primary text-white rounded-md">Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
