import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { Search, ChevronDown, Plus, X, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';

export default function GuardFilesPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filesData, setFilesData] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const { t } = useTranslation();
  const [actionSelection, setActionSelection] = useState<string>(() => t('guards.files.action.default', { defaultValue: 'Action' }));
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: any) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch((err: any) => {
        console.error('Error cargando guardia:', err);
        toast.error(t('guards.files.toasts.loadError', { defaultValue: 'Could not load guard' }));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.archivos">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Cargando...</div>
          </div>
        ) : guard ? (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-6 shadow-sm">
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
                      <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                        <button
                          onClick={() => { setActionSelection(t('guards.files.actions.delete', { defaultValue: 'Delete' })); setActionOpen(false); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          {t('guards.files.actions.delete', { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    )}
                </div>

                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('guards.files.searchPlaceholder', { defaultValue: 'Search files...' })}
                        className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none"
                      />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('guards.files.uploadButton', { defaultValue: 'Upload' })}</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div>
                  <div className="md:block hidden">
                    <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          aria-label="select all files"
                          checked={filesData.length > 0 && selectedFileIds.length === filesData.length}
                          onChange={(e) => { if (e.target.checked) setSelectedFileIds(filesData.map(f => f.id)); else setSelectedFileIds([]); }}
                          className="h-4 w-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.files.table.date', { defaultValue: 'Date' })}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.files.table.file', { defaultValue: 'File' })}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.files.table.addedBy', { defaultValue: 'Added By' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filesData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-32 h-32">
                              <svg viewBox="0 0 200 200" className="w-full h-full text-gray-100">
                                <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                                <circle cx="85" cy="100" r="8" fill="white" />
                                <circle cx="115" cy="100" r="8" fill="white" />
                                <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <h3 className="text-lg font-semibold text-gray-700">{t('guards.files.empty.title', { defaultValue: 'No Files Found' })}</h3>
                              <p className="text-sm text-gray-500 mt-1">{t('guards.files.empty.description', { defaultValue: 'Upload files using the button on the right' })}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filesData.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedFileIds.includes(f.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedFileIds((prev) => [...prev, f.id]); else setSelectedFileIds((prev) => prev.filter(id => id !== f.id));
                            }} className="h-4 w-4" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{f.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{f.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{f.addedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                  </div>
                </div>

                <div className="md:hidden">
                  <MobileCardList
                    items={filesData || []}
                    loading={false}
                    emptyMessage={t('guards.files.empty.title', { defaultValue: 'No Files Found' }) as string}
                    renderCard={(f: any) => (
                      <div className="p-4 bg-white border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold">{f.name}</div>
                            <div className="text-xs text-gray-500">{f.date}</div>
                          </div>
                          <div className="text-xs text-gray-500">{f.addedBy}</div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
              </div>
            </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">{t('guards.files.loadError', { defaultValue: 'Could not load guard' })}</div>
          </div>
        )}
          {/* Upload Files Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50" onClick={() => setShowUploadModal(false)}>
              <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                  <h3 className="text-lg font-semibold">{t('guards.files.modal.title', { defaultValue: 'Upload Files' })}</h3>
                  <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
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
                    className={`w-full border-dashed rounded-md p-8 mb-8 text-center ${dragOver ? 'border-2 border-gray-300 bg-gray-50' : 'border border-gray-200'}`}>
                    {uploadFiles.length > 0 ? (
                      <div className="flex justify-center">
                        <div className="bg-gray-100 rounded-md px-3 py-2 text-sm text-gray-700 w-full min-w-0 overflow-hidden">
                          <span className="block truncate">{uploadFiles.map((f) => f.name).join(', ')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">{t('guards.files.modal.dropHere', { defaultValue: 'Drop files here..' })}</div>
                    )}
                  </div>

                  <div className="text-center my-6 text-gray-500">{t('guards.files.modal.orSelect', { defaultValue: 'Or Select' })}</div>

                  <div className="flex items-center gap-3 mt-6">
                    <div className="flex-1 relative min-w-0">
                      <div className="w-full border rounded-md px-3 py-2 text-sm flex items-center justify-between min-w-0">
                        <span className="block truncate text-sm text-gray-700">{uploadFiles.length > 0 ? uploadFiles.map((f) => f.name).join(', ') : t('guards.files.modal.chooseFilesPlaceholder', { defaultValue: 'Choose files No files selected' })}</span>
                        <span className="text-gray-400 ml-3"><Paperclip /></span>
                      </div>
                      <input type="file" multiple onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; setUploadFiles((prev) => [...prev, ...files]); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  {uploadFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">{t('guards.files.modal.filesToUpload', { defaultValue: 'Files to upload' })}</h4>
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadFiles.map((f, i) => (
                          <li key={i} className="flex items-center justify-between text-sm min-w-0">
                            <span className="truncate mr-4 block min-w-0">{f.name}</span>
                            <button
                              onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 p-1 rounded hover:bg-red-50"
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

                <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
                  <button onClick={() => {
                    if (uploadFiles.length === 0) { setShowUploadModal(false); return; }
                    const newFiles = uploadFiles.map((f) => ({ id: Date.now().toString() + Math.random().toString(36).slice(2,7), name: f.name, date: new Date().toISOString().slice(0,10), addedBy: 'You' }));
                    setFilesData((prev) => [...newFiles, ...prev]);
                    setUploadFiles([]);
                    setShowUploadModal(false);
                  }} className="px-4 py-2 bg-orange-600 text-white rounded-md">{t('guards.files.modal.upload', { defaultValue: 'Upload' })}</button>
                </div>
              </div>
            </div>
          )}
      </GuardsLayout>
    </AppLayout>
  );
}
