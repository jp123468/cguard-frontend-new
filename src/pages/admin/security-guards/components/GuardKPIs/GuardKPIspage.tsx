import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, X, Mail, MessageCircle, ChevronLeft, ChevronRight, Edit, Trash, FileText, File, Upload, MoreVertical } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { toast } from 'sonner';
import KpiBarChart from '@/components/KpiBarChart';
import KpiService from '@/services/kpi.service';


type Props = {
  guard?: any;
};

export default function GuardIndicators({ guard }: Props) {
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Acción');
  const [searchQuery, setSearchQuery] = useState('');
  const [kpiData, setKpiData] = useState<any[]>([]); // Vacío inicialmente, sin resultados
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    frequency: '',
    description: '',
    standardReports: true,
    standardReportsNumber: '',
    incidentReports: true,
    incidentReportsNumber: '',
    routeReports: true,
    routeReportsNumber: '',
    taskReports: true,
    taskReportsNumber: '',
    verificationReports: true,
    verificationReportsNumber: '',
    emailNotification: false,
    emails: [] as string[],
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    if (!currentEmail.trim()) {
      setEmailError('Por favor ingresa un correo electrónico');
      return;
    }

    if (!validateEmail(currentEmail)) {
      setEmailError('Correo electrónico no válido');
      return;
    }

    if (formData.emails.includes(currentEmail)) {
      setEmailError('Este correo ya ha sido agregado');
      return;
    }

    setFormData({
      ...formData,
      emails: [...formData.emails, currentEmail]
    });
    setCurrentEmail('');
    setEmailError('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter(email => email !== emailToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleAddKPI = () => {
    setEditingId(null);
    setFormData({
      frequency: '',
      description: '',
      standardReports: true,
      standardReportsNumber: '',
      incidentReports: true,
      incidentReportsNumber: '',
      routeReports: true,
      routeReportsNumber: '',
      taskReports: true,
      taskReportsNumber: '',
      verificationReports: true,
      verificationReportsNumber: '',
      emailNotification: false,
      emails: [] as string[],
    });
    setShowModal(true);
  };

  const loadKpis = async () => {
    try {
      const monthStr = selectedMonth ? `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}` : undefined;
      const params: any = { scope: 'guard', guard: guard?.id, month: monthStr };
      if (searchQuery && searchQuery.trim().length > 0) {
        params.description = searchQuery.trim();
      }
      const res: any = await KpiService.list(params);
      setKpiData(res.rows || res);
    } catch (error) {
      console.error('Error loading KPIs', error);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const prevMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonth(d);
  };

  const formatMonth = (d: Date) => {
    return d.toLocaleString(undefined, { month: 'long' });
  };

  const formatDate = (value: any) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      return d.toLocaleString();
    } catch {
      return '';
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      frequency: '',
      description: '',
      standardReports: true,
      standardReportsNumber: '',
      incidentReports: true,
      incidentReportsNumber: '',
      routeReports: true,
      routeReportsNumber: '',
      taskReports: true,
      taskReportsNumber: '',
      verificationReports: true,
      verificationReportsNumber: '',
      emailNotification: false,
      emails: [] as string[],
    });
  };

  const handleExportPdf = (kpi: any) => {
    try {
      // If KPI provides a direct URL to the PDF, open it
      if (kpi?.pdfUrl) {
        window.open(kpi.pdfUrl, '_blank');
        toast.success('PDF abierto');
        setMenuOpenId(null);
        return;
      }

      // If KPI provides a base64 encoded PDF, convert and open
      if (kpi?.pdfBase64) {
        const byteCharacters = atob(kpi.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success('PDF generado');
        setMenuOpenId(null);
        return;
      }

      // Otherwise, request PDF from backend endpoint
      (async () => {
        try {
          const blob = await KpiService.getPdf(kpi.id);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          toast.success('PDF generado');
        } catch (err) {
          console.error('Error fetching PDF', err);
          toast.error('No se pudo generar/obtener el PDF');
        } finally {
          setMenuOpenId(null);
        }
      })();
    } catch (e) {
      console.error('Error opening PDF', e);
      toast.error('Error al abrir el PDF');
      setMenuOpenId(null);
    }
  };

  const handleExportExcel = (kpi: any) => {
    try {
      (async () => {
        try {
          const blob = await KpiService.getExcel(kpi.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `kpi-${kpi.id}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          toast.success('Excel descargado');
        } catch (err) {
          console.error('Error fetching Excel', err);
          toast.error('No se pudo generar/obtener el Excel');
        } finally {
          setMenuOpenId(null);
        }
      })();
    } catch (e) {
      console.error('Error exporting Excel', e);
      toast.error('Error al exportar Excel');
      setMenuOpenId(null);
    }
  };

  const handleSubmitKPI = async () => {
    const toNumber = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));

    const payload = {
      frequency: formData.frequency,
      description: formData.description,
      standardReports: !!formData.standardReports,
      standardReportsNumber: toNumber(formData.standardReportsNumber),
      incidentReports: !!formData.incidentReports,
      incidentReportsNumber: toNumber(formData.incidentReportsNumber),
      routeReports: !!formData.routeReports,
      routeReportsNumber: toNumber(formData.routeReportsNumber),
      taskReports: !!formData.taskReports,
      taskReportsNumber: toNumber(formData.taskReportsNumber),
      verificationReports: !!formData.verificationReports,
      verificationReportsNumber: toNumber(formData.verificationReportsNumber),
      emailNotification: !!formData.emailNotification,
      emails: formData.emails,
      scope: 'guard',
      guardId: guard?.id,
      guard: guard?.id,
    };

    try {
      if (editingId) {
        await KpiService.update(editingId, { data: payload });
        toast.success('KPI actualizado correctamente');
      } else {
        await KpiService.create({ data: payload });
        toast.success('KPI creado correctamente');
      }
      await loadKpis();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving KPI', error);
      toast.error('Error al guardar el KPI');
    }
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard?.id]);

  // Reload when month or search query changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      loadKpis();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, searchQuery, guard?.id]);

  // Close menu when clicking outside (matches PostSiteKPIs behavior)
  useEffect(() => {
    const onDocClick = (e: any) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('[data-kpi-menu]') || target.closest('[data-kpi-menu-button]')) return;
      setMenuOpenId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.indicadores">
        <div className="space-y-4">
          
          <div className="bg-white border rounded-lg p-6 shadow-sm min-h-[560px]">
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Left: Action Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => setActionOpen(!actionOpen)}
                  className="ml-2 px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50"
                >
                  {actionSelection}
                  <ChevronDown size={16} />
                </button>
                {actionOpen && (
                  <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                    <button
                      onClick={() => {
                        setActionOpen(false);
                        if (!selectedIds || selectedIds.length === 0) {
                          toast.error('Debes seleccionar al menos un KPI');
                          return;
                        }
                        setDeleteModalOpen(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-xs">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar KPI"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Right: Add Button */}
              <button
                onClick={handleAddKPI}
                className="ml-2 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-orange-700 transition-colors"
              >
                <Plus size={16} />
                Añadir Nuevo KPI
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[520px] pb-12">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={kpiData.length > 0 && selectedIds.length === kpiData.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(kpiData.map((k) => k.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Agregado por</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      <button className="hover:text-gray-900">↕</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kpiData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-32 h-32">
                            <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                              <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                              <circle cx="85" cy="100" r="8" fill="white" />
                              <circle cx="115" cy="100" r="8" fill="white" />
                              <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                              <path d="M 60 60 L 70 50 M 140 60 L 150 50 M 80 40 L 90 30 M 120 40 L 110 30" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-700">No se encontraron resultados</h3>
                            <p className="text-sm text-gray-500 mt-1">No pudimos encontrar<br />ningún elemento que<br />coincida con su búsqueda</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    kpiData.map((kpi, idx) => (
                      <React.Fragment key={kpi.id || idx}>
                        <tr onClick={() => setExpandedId(expandedId === kpi.id ? null : kpi.id)} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedIds.includes(kpi.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds([...selectedIds, kpi.id]);
                                else setSelectedIds(selectedIds.filter((id) => id !== kpi.id));
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{kpi.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(kpi.dateTime)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{kpi.addedBy}</td>
                          <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === kpi.id ? null : kpi.id); }}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded mr-2"
                              title="Options"
                              data-kpi-menu-button
                            >
                              <MoreVertical size={16} />
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === kpi.id ? null : kpi.id); }}
                              title={expandedId === kpi.id ? 'Collapse' : 'Expand'}
                              className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            >
                              {expandedId === kpi.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {menuOpenId === kpi.id && (
                              <div data-kpi-menu={"kpi-" + (kpi.id || idx)} className="absolute right-4 top-full translate-y-2 w-44 min-w-[11rem] bg-white border rounded shadow-lg z-50 py-1 divide-y divide-gray-100 overflow-hidden">
                              <button onClick={() => { setEditingId(kpi.id); setFormData({
                                frequency: kpi.frequency || '',
                                description: kpi.description || '',
                                standardReports: !!kpi.standardReports,
                                standardReportsNumber: kpi.standardReportsNumber || '',
                                incidentReports: !!kpi.incidentReports,
                                incidentReportsNumber: kpi.incidentReportsNumber || '',
                                routeReports: !!kpi.routeReports,
                                routeReportsNumber: kpi.routeReportsNumber || '',
                                taskReports: !!kpi.taskReports,
                                taskReportsNumber: kpi.taskReportsNumber || '',
                                verificationReports: !!kpi.verificationReports,
                                verificationReportsNumber: kpi.verificationReportsNumber || '',
                                emailNotification: !!kpi.emailNotification,
                                emails: kpi.emails || [],
                              }); setShowModal(true); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-700"><Edit size={16} />Edit</div>
                              </button>

                              <button onClick={() => { setToDeleteId(kpi.id); setDeleteModalOpen(true); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                <div className="flex items-center gap-2 text-sm text-red-600"><Trash size={16} />Delete</div>
                              </button>

                              <button onClick={() => { handleExportPdf(kpi); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-700"><FileText size={16} /> Export as PDF</div>
                              </button>

                              <button onClick={() => { handleExportExcel(kpi); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-700"><File size={16} /> Export as Excel</div>
                              </button>

                              <button onClick={() => { toast.success('Email report not implemented'); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-700"><Mail size={16} /> Email Report</div>
                              </button>
                            </div>
                            )}
                          </div>
                          </td>
                        </tr>

                        {expandedId === kpi.id && (
                          <tr className="bg-white">
                            <td colSpan={5} className="p-4">
                              <div className="space-y-4 min-h-[360px]">
                                <div className="flex items-start justify-between">
                                  <div><strong>DESCRIPTION :</strong> <span className="ml-4">{kpi.description}</span></div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <button onClick={(e) => { e.stopPropagation(); prevMonth(); loadKpis(); }} className="p-1 rounded hover:bg-gray-100"><ChevronLeft size={16} /></button>
                                    <div className="px-3 py-1 border rounded">{formatMonth(selectedMonth)}</div>
                                    <button onClick={(e) => { e.stopPropagation(); nextMonth(); loadKpis(); }} className="p-1 rounded hover:bg-gray-100"><ChevronRight size={16} /></button>
                                  </div>
                                </div>

                                <div>
                                  {(() => {
                                    const metrics: any[] = [];
                                    const actualVal = Number(kpi.actual || 0);
                                    if (kpi.standardReportsNumber !== undefined && kpi.standardReportsNumber !== null && Number(kpi.standardReportsNumber) > 0) {
                                      metrics.push({ name: 'Standard Reports', target: Number(kpi.standardReportsNumber), actual: actualVal });
                                    }
                                    if (kpi.taskReportsNumber !== undefined && kpi.taskReportsNumber !== null && Number(kpi.taskReportsNumber) > 0) {
                                      metrics.push({ name: 'Task Reports', target: Number(kpi.taskReportsNumber), actual: actualVal });
                                    }
                                    if (kpi.incidentReportsNumber !== undefined && kpi.incidentReportsNumber !== null && Number(kpi.incidentReportsNumber) > 0) {
                                      metrics.push({ name: 'Incident Reports', target: Number(kpi.incidentReportsNumber), actual: actualVal });
                                    }
                                    if (kpi.routeReportsNumber !== undefined && kpi.routeReportsNumber !== null && Number(kpi.routeReportsNumber) > 0) {
                                      metrics.push({ name: 'Route Reports', target: Number(kpi.routeReportsNumber), actual: actualVal });
                                    }
                                    if (kpi.verificationReportsNumber !== undefined && kpi.verificationReportsNumber !== null && Number(kpi.verificationReportsNumber) > 0) {
                                      metrics.push({ name: 'Checklist Reports', target: Number(kpi.verificationReportsNumber), actual: actualVal });
                                    }

                                    return (
                                      <>
                                        <table className="w-full border-collapse border">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border px-4 py-2">Name</th>
                                              <th className="border px-4 py-2">Target</th>
                                              <th className="border px-4 py-2">Actual</th>
                                              <th className="border px-4 py-2">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {metrics.length === 0 ? (
                                              <tr>
                                                <td className="border px-4 py-2" colSpan={4}>No targets defined</td>
                                              </tr>
                                            ) : (
                                              metrics.map((m) => (
                                                <tr key={m.name}>
                                                  <td className="border px-4 py-2 font-semibold">{m.name.toUpperCase()}</td>
                                                  <td className="border px-4 py-2">{m.target}</td>
                                                  <td className="border px-4 py-2">{m.actual}</td>
                                                  <td className={`border px-4 py-2 ${m.actual >= m.target ? 'text-green-600' : 'text-red-600'}`}>{m.actual >= m.target ? 'Achieved' : 'Not Achieved'}</td>
                                                </tr>
                                              ))
                                            )}
                                          </tbody>
                                        </table>

                                        <div className="w-full">
                                          <KpiBarChart data={metrics.map((m) => ({ name: m.name, target: m.target, actual: m.actual }))} width={720} height={300} />
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div
              className="fixed inset-0 z-50"
              onClick={handleCloseModal}
            >
              <div
                className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                  <h2 className="text-lg font-semibold text-gray-800">Añadir Nuevos KPIs (Indicadores Clave de Rendimiento)</h2>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Frecuencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Seleccionar frecuencia</option>
                      <option value="diario">Diario</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ingrese la descripción"
                      className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={4}
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    {/* Informes Estándar */}
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <label className="text-sm font-medium text-gray-700">Informes Estándar</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.standardReports}
                          onChange={(e) => setFormData({ ...formData, standardReports: e.target.checked })}
                          className="rounded w-5 h-5"
                        />
                        <input
                          type="number"
                          min={0}
                          value={formData.standardReportsNumber}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const sanitized = v === '' ? '' : String(Math.max(0, Number(v)));
                            setFormData({ ...formData, standardReportsNumber: sanitized });
                          }}
                          disabled={!formData.standardReports}
                          placeholder="Definir un Número"
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Informes de Incidentes */}
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <label className="text-sm font-medium text-gray-700">Informes de Incidentes</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.incidentReports}
                          onChange={(e) => setFormData({ ...formData, incidentReports: e.target.checked })}
                          className="rounded w-5 h-5"
                        />
                        <input
                          type="number"
                          min={0}
                          value={formData.incidentReportsNumber}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const sanitized = v === '' ? '' : String(Math.max(0, Number(v)));
                            setFormData({ ...formData, incidentReportsNumber: sanitized });
                          }}
                          disabled={!formData.incidentReports}
                          placeholder="Definir un Número"
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Informes de Recorridos */}
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <label className="text-sm font-medium text-gray-700">Informes de Recorridos por el Sitio</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.routeReports}
                          onChange={(e) => setFormData({ ...formData, routeReports: e.target.checked })}
                          className="rounded w-5 h-5"
                        />
                        <input
                          type="number"
                          min={0}
                          value={formData.routeReportsNumber}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const sanitized = v === '' ? '' : String(Math.max(0, Number(v)));
                            setFormData({ ...formData, routeReportsNumber: sanitized });
                          }}
                          disabled={!formData.routeReports}
                          placeholder="Definir un Número"
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Informes de Tareas */}
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <label className="text-sm font-medium text-gray-700">Informes de Tareas</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.taskReports}
                          onChange={(e) => setFormData({ ...formData, taskReports: e.target.checked })}
                          className="rounded w-5 h-5"
                        />
                        <input
                          type="number"
                          min={0}
                          value={formData.taskReportsNumber}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const sanitized = v === '' ? '' : String(Math.max(0, Number(v)));
                            setFormData({ ...formData, taskReportsNumber: sanitized });
                          }}
                          disabled={!formData.taskReports}
                          placeholder="Definir un Número"
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Informes de Listas de Verificación */}
                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <label className="text-sm font-medium text-gray-700">Informes de Listas de Verificación</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.verificationReports}
                          onChange={(e) => setFormData({ ...formData, verificationReports: e.target.checked })}
                          className="rounded w-5 h-5"
                        />
                        <input
                          type="number"
                          min={0}
                          value={formData.verificationReportsNumber}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const sanitized = v === '' ? '' : String(Math.max(0, Number(v)));
                            setFormData({ ...formData, verificationReportsNumber: sanitized });
                          }}
                          disabled={!formData.verificationReports}
                          placeholder="Definir un Número"
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Notification */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-sm font-medium text-gray-700">Enviar Informe KPI por Correo Electrónico</label>
                      <input
                        type="checkbox"
                        checked={formData.emailNotification}
                        onChange={(e) => setFormData({ ...formData, emailNotification: e.target.checked })}
                        className="rounded w-5 h-5 ml-auto accent-orange-600"
                      />
                    </div>

                    {formData.emailNotification && (
                      <div className="space-y-3">
                        {/* Email chips */}
                        {formData.emails && formData.emails.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.emails.map((email) => (
                              <div key={email} className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                                <span>{email}</span>
                                <button
                                  onClick={() => handleRemoveEmail(email)}
                                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Email input with add button */}
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={currentEmail}
                              onChange={(e) => {
                                setCurrentEmail(e.target.value);
                                setEmailError('');
                              }}
                              onKeyPress={handleKeyPress}
                              placeholder="Nuevo Correo Electrónico..."
                              className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${emailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-orange-500'
                                }`}
                            />
                            <button
                              onClick={handleAddEmail}
                              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                            >
                              Agregar
                            </button>
                          </div>
                          {emailError && (
                            <p className="text-xs text-red-500">{emailError}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitKPI}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700"
                  >
                    AÑADIR
                  </button>
                </div>
              </div>
            </div>
          )}
          {deleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setDeleteModalOpen(false); setToDeleteId(null); }}>
              <div className="absolute inset-0 bg-black opacity-30" />
              <div className="relative w-96 bg-white rounded shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-700">¿Estás seguro de que deseas eliminar {toDeleteId ? 'este KPI' : `${selectedIds.length} KPI(s)`}? Esta acción no se puede deshacer.</p>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-white">
                  <button onClick={() => { setDeleteModalOpen(false); setToDeleteId(null); }} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button onClick={async () => {
                    try {
                      if (toDeleteId) {
                        await KpiService.destroy(toDeleteId);
                        toast.success('KPI eliminado');
                      } else if (selectedIds.length > 0) {
                        await Promise.all(selectedIds.map((id) => KpiService.destroy(id)));
                        toast.success('KPIs eliminados');
                      } else {
                        toast.error('No hay elementos seleccionados');
                        return;
                      }
                      await loadKpis();
                    } catch (e) {
                      console.error(e);
                      toast.error('Error al eliminar KPI(s)');
                    } finally {
                      setDeleteModalOpen(false);
                      setToDeleteId(null);
                      setSelectedIds([]);
                    }
                  }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Eliminar</button>
                </div>
              </div>
            </div>
          )}
          </div>
      </GuardsLayout>
    </AppLayout>
  );
}
