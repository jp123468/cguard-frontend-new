import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, X, Mail, MessageCircle, ChevronLeft, ChevronRight, Edit, Trash, FileText, File, Upload, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import KpiService from '@/services/kpi.service';
import { ApiService } from '@/services/api/apiService';
import KpiBarChart from '@/components/KpiBarChart';
import { useTranslation } from "react-i18next";
import MobileCardList from '@/components/responsive/MobileCardList';
type Props = {
  site?: any;
};

export default function PostSiteKPIs({ site }: Props) {
  const { t } = useTranslation();
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>(t('actions.action', 'Actions'));
  const [searchQuery, setSearchQuery] = useState('');
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    frequency: '',
    description: '',
    standardReports: true,
    standardReportsNumber: '' as string | number,
    incidentReports: true,
    incidentReportsNumber: '' as string | number,
    routeReports: true,
    routeReportsNumber: '' as string | number,
    taskReports: true,
    taskReportsNumber: '' as string | number,
    verificationReports: true,
    verificationReportsNumber: '' as string | number,
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

    setFormData({ ...formData, emails: [...formData.emails, currentEmail] });
    setCurrentEmail('');
    setEmailError('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setFormData({ ...formData, emails: formData.emails.filter(email => email !== emailToRemove) });
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
      standardReportsNumber: '' as string | number,
      incidentReports: true,
      incidentReportsNumber: '' as string | number,
      routeReports: true,
      routeReportsNumber: '' as string | number,
      taskReports: true,
      taskReportsNumber: '' as string | number,
      verificationReports: true,
      verificationReportsNumber: '' as string | number,
      emailNotification: false,
      emails: [] as string[],
    });
    setShowModal(true);
  };

  const loadKpis = async () => {
    try {
      const monthStr = selectedMonth ? `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}` : undefined;
      const params: any = { scope: 'postSite', postSite: site?.id, month: monthStr };
      if (searchQuery && searchQuery.trim().length > 0) {
        params.description = searchQuery.trim();
      }
      const res: any = await KpiService.list(params);
      setKpiData(res.rows || res);
      await computeActualsForKpis(res.rows || res, selectedMonth);
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
    } catch (e) {
      return String(value);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleExportPdf = (kpi: any) => {
    try {
      // If KPI provides a direct URL to the PDF, open it
      if (kpi?.pdfUrl) {
        window.open(kpi.pdfUrl, '_blank');
        toast.success(t('postSites.KPI.toasts.pdfOpened', 'PDF opened'));
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
        toast.success(t('postSites.KPI.toasts.pdfGenerated', 'PDF generated'));
        setMenuOpenId(null);
        return;
      }

      // Otherwise, request PDF from backend endpoint
      (async () => {
        try {
          const blob = await KpiService.getPdf(kpi.id);
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          toast.success(t('postSites.KPI.toasts.pdfGenerated', 'PDF generated'));
        } catch (err) {
          console.error('Error fetching PDF from backend', err);
          toast.error(t('postSites.KPI.toasts.pdfError', 'Could not generate/get PDF'));
        } finally {
          setMenuOpenId(null);
        }
      })();
    } catch (e) {
      console.error('Error opening PDF', e);
      toast.error(t('postSites.KPI.toasts.pdfOpenError', 'Error opening PDF'));
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
          toast.success(t('postSites.KPI.toasts.excelDownloaded', 'Excel downloaded'));
        } catch (err) {
          console.error('Error fetching Excel from backend', err);
          toast.error(t('postSites.KPI.toasts.excelError', 'Could not generate/get Excel'));
        } finally {
          setMenuOpenId(null);
        }
      })();
    } catch (e) {
      console.error('Error exporting Excel', e);
      toast.error(t('postSites.KPI.toasts.excelExportError', 'Error exporting Excel'));
      setMenuOpenId(null);
    }
  };

  const handleSubmitKPI = async () => {
    const toNumber = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));

    const payload: any = {
      scope: 'postSite',
      postSiteId: site?.id,
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
      emails: formData.emails || [],
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
      setShowModal(false);
      setEditingId(null);
      setFormData({
        frequency: '',
        description: '',
        standardReports: true,
        standardReportsNumber: '' as string | number,
        incidentReports: true,
        incidentReportsNumber: '' as string | number,
        routeReports: true,
        routeReportsNumber: '' as string | number,
        taskReports: true,
        taskReportsNumber: '' as string | number,
        verificationReports: true,
        verificationReportsNumber: '' as string | number,
        emailNotification: false,
        emails: [] as string[],
      });
    } catch (error) {
      console.error('Error saving KPI', error);
    }
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id]);

  async function computeActualsForKpis(kpis: any[], monthDate?: Date) {
    try {
      if (!kpis || !kpis.length) return;
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) return;
      const month = monthDate || selectedMonth || new Date();
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0)).toISOString();
      const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0)).toISOString();

      const q = `?generatedDateRange[]=${encodeURIComponent(start)}&generatedDateRange[]=${encodeURIComponent(end)}&limit=10000`;
      const resp: any = await ApiService.get(`/tenant/${tenantId}/report${q}`);
      console.debug('[PostSiteKPIs] reports response:', resp);
      const rows = Array.isArray(resp?.rows) ? resp.rows : (Array.isArray(resp) ? resp : []);

      const countsByKpi: Record<string, number> = {};
      for (const kpi of kpis) {
        let cnt = 0;
        if (kpi.scope === 'guard' && kpi.guard && kpi.guard.id) {
          cnt = rows.filter((r: any) => r.createdById === kpi.guard.id || (r.createdBy && r.createdBy.id === kpi.guard.id)).length;
        } else if (kpi.scope === 'postSite' && kpi.postSite && kpi.postSite.id) {
          cnt = rows.filter((r: any) => String(r.stationId) === String(kpi.postSite.id) || (r.station && String(r.station.id) === String(kpi.postSite.id))).length;
        } else {
          cnt = rows.length;
        }
        countsByKpi[kpi.id] = cnt;
      }

      setKpiData((prev) => (prev || []).map((kk: any) => ({ ...kk, actual: countsByKpi[kk.id] ?? kk.actual ?? 0 })));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error computing KPI actuals client-side', e);
    }
  }

  // Reload when month or search query changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      loadKpis();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, searchQuery, site?.id]);

  // Close menu when clicking outside
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
      <div className="bg-white border rounded-lg p-6 shadow-sm min-h-[560px]">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative inline-block">
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="ml-2 px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50"
              data-kpi-menu-button
            >
              {actionSelection}
              <ChevronDown size={16} />
            </button>

            {actionOpen && (
              <div className="absolute mt-2 right-0 w-full bg-white border rounded shadow z-40 py-1" data-kpi-menu>
                <button
                  onClick={() => {
                    setActionOpen(false);
                    if (!selectedIds || selectedIds.length === 0) {
                      toast.error(t('postSites.KPI.toasts.selectAtLeastOne', 'You must select at least one KPI'));
                      return;
                    }
                    setDeleteModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >{t('actions.delete', 'Eliminar')}</button>
              </div>
            )}
          </div>

          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder={t('postSites.KPI.kpisearch', 'Buscar KPI')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            onClick={handleAddKPI}
            className="ml-2 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} />
            {t('postSites.KPI.kpiadded', 'Añadir Nuevo KPI')}
          </button>
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto relative min-h-[520px] pb-12">
            <table className="w-full min-h-[220px]">
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('postSites.KPI.kpitable.kpitype', 'Tipo')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('postSites.KPI.kpitable.kpidate', 'Fecha/Hora')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('postSites.KPI.kpitable.kpicreatedfor', 'Agregado por')}</th>
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
                        <h3 className="text-lg font-semibold text-gray-700">{t('clients.empty.title', 'No se encontraron resultados')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('clients.empty.description', 'No pudimos encontrar ningún elemento que coincida con su búsqueda')}</p>
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
                              <div className="flex items-center gap-2 text-sm text-gray-700"><Edit size={16} />{t('actions.edit', 'Edit')}</div>
                            </button>

                            <button onClick={() => { setToDeleteId(kpi.id); setDeleteModalOpen(true); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                              <div className="flex items-center gap-2 text-sm text-red-600"><Trash size={16} />{t('actions.delete', 'Delete')}</div>
                            </button>

                            <button onClick={() => { handleExportPdf(kpi); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-700"><FileText size={16} /> {t('postSites.KPI.exportPdf', 'Export as PDF')}</div>
                            </button>

                            <button onClick={() => { handleExportExcel(kpi); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-700"><File size={16} /> {t('postSites.KPI.exportExcel', 'Export as Excel')}</div>
                            </button>
                            <button onClick={() => { toast.success(t('postSites.KPI.emailNotImplemented', 'Email report not implemented')); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-700"><Mail size={16} /> {t('postSites.KPI.emailReport', 'Email Report')}</div>
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
                              <div><strong>{t('postSites.KPI.descriptionLabel', 'DESCRIPTION :')}</strong> <span className="ml-4">{kpi.description}</span></div>
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
                                  metrics.push({ key: 'standardReports', name: t('postSites.KPI.metrics.standardReports', 'Standard Reports'), target: Number(kpi.standardReportsNumber), actual: actualVal });
                                }
                                if (kpi.taskReportsNumber !== undefined && kpi.taskReportsNumber !== null && Number(kpi.taskReportsNumber) > 0) {
                                  metrics.push({ key: 'taskReports', name: t('postSites.KPI.metrics.taskReports', 'Task Reports'), target: Number(kpi.taskReportsNumber), actual: actualVal });
                                }
                                if (kpi.incidentReportsNumber !== undefined && kpi.incidentReportsNumber !== null && Number(kpi.incidentReportsNumber) > 0) {
                                  metrics.push({ key: 'incidentReports', name: t('postSites.KPI.metrics.incidentReports', 'Incident Reports'), target: Number(kpi.incidentReportsNumber), actual: actualVal });
                                }
                                if (kpi.routeReportsNumber !== undefined && kpi.routeReportsNumber !== null && Number(kpi.routeReportsNumber) > 0) {
                                  metrics.push({ key: 'routeReports', name: t('postSites.KPI.metrics.routeReports', 'Route Reports'), target: Number(kpi.routeReportsNumber), actual: actualVal });
                                }
                                if (kpi.verificationReportsNumber !== undefined && kpi.verificationReportsNumber !== null && Number(kpi.verificationReportsNumber) > 0) {
                                  metrics.push({ key: 'verificationReports', name: t('postSites.KPI.metrics.verificationReports', 'Checklist Reports'), target: Number(kpi.verificationReportsNumber), actual: actualVal });
                                }

                                return (
                                  <>
                                    <table className="w-full border-collapse border">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border px-4 py-2">{t('postSites.KPI.table.name', 'Name')}</th>
                                          <th className="border px-4 py-2">{t('postSites.KPI.table.target', 'Target')}</th>
                                          <th className="border px-4 py-2">{t('postSites.KPI.table.actual', 'Actual')}</th>
                                          <th className="border px-4 py-2">{t('postSites.KPI.table.status', 'Status')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {metrics.length === 0 ? (
                                          <tr>
                                            <td className="border px-4 py-2" colSpan={4}>{t('postSites.KPI.table.noTargets', 'No targets defined')}</td>
                                          </tr>
                                        ) : (
                                          metrics.map((m) => (
                                            <tr key={m.key}>
                                                <td className="border px-4 py-2 font-semibold">{m.name.toUpperCase()}</td>
                                                <td className="border px-4 py-2">{m.target}</td>
                                                <td className="border px-4 py-2">{m.actual}</td>
                                                <td className={`border px-4 py-2 ${m.actual >= m.target ? 'text-green-600' : 'text-red-600'}`}>{m.actual >= m.target ? t('postSites.KPI.status.achieved', 'Achieved') : t('postSites.KPI.status.notAchieved', 'Not Achieved')}</td>
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

          <div className="md:hidden">
            <MobileCardList items={kpiData} renderCard={(kpi: any) => (
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{kpi.type || 'KPI'}</div>
                  <div className="text-xs text-gray-500">{formatDate(kpi.dateTime) || '-'}</div>
                  <div className="text-sm text-gray-700 mt-2">{kpi.description}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(kpi.id); setShowModal(true); }} className="px-3 py-1 bg-gray-100 rounded text-sm">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); handleExportPdf(kpi); }} className="px-3 py-1 bg-gray-100 rounded text-sm">PDF</button>
                </div>
              </div>
            )} loading={false} />
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center" onClick={handleCloseModal}>
          <div className="absolute inset-0 bg-black/40 z-50" onClick={handleCloseModal} />

          <div className="w-full sm:ml-auto sm:max-w-md bg-white shadow-2xl overflow-y-auto rounded-t-lg sm:rounded-md relative z-60 pointer-events-auto max-h-[90vh] pb-28" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-800">{t('postSites.KPI.modal.title', 'Add New KPIs (Key Performance Indicators)')}</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.KPI.modal.frequency', 'Frequency')} <span className="text-red-500">*</span></label>
                <select
                  autoFocus
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">{t('postSites.KPI.modal.frequencyOptions.select', 'Select frequency')}</option>
                  <option value="diario">{t('postSites.KPI.modal.frequencyOptions.daily', 'Daily')}</option>
                  <option value="semanal">{t('postSites.KPI.modal.frequencyOptions.weekly', 'Weekly')}</option>
                  <option value="mensual">{t('postSites.KPI.modal.frequencyOptions.monthly', 'Monthly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSites.KPI.modal.description', 'Description')} <span className="text-red-500">*</span></label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('postSites.KPI.modal.descriptionPlaceholder', 'Enter description')}
                  className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.standardReports', 'Standard Reports')}</label>
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
                            const sanitized = v === '' ? '' : Math.max(0, Number(v));
                            setFormData({ ...formData, standardReportsNumber: sanitized });
                          }}
                          disabled={!formData.standardReports}
                          placeholder={t('postSites.KPI.modal.defineNumber', 'Define a Number')}
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.incidentReports', 'Incident Reports')}</label>
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
                            const sanitized = v === '' ? '' : Math.max(0, Number(v));
                            setFormData({ ...formData, incidentReportsNumber: sanitized });
                          }}
                          disabled={!formData.incidentReports}
                          placeholder={t('postSites.KPI.modal.defineNumber', 'Define a Number')}
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.routeReports', 'Route Reports')}</label>
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
                            const sanitized = v === '' ? '' : Math.max(0, Number(v));
                            setFormData({ ...formData, routeReportsNumber: sanitized });
                          }}
                          disabled={!formData.routeReports}
                          placeholder={t('postSites.KPI.modal.defineNumber', 'Define a Number')}
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.taskReports', 'Task Reports')}</label>
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
                            const sanitized = v === '' ? '' : Math.max(0, Number(v));
                            setFormData({ ...formData, taskReportsNumber: sanitized });
                          }}
                          disabled={!formData.taskReports}
                          placeholder={t('postSites.KPI.modal.defineNumber', 'Define a Number')}
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.verificationReports', 'Checklist Reports')}</label>
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
                            const sanitized = v === '' ? '' : Math.max(0, Number(v));
                            setFormData({ ...formData, verificationReportsNumber: sanitized });
                          }}
                          disabled={!formData.verificationReports}
                          placeholder={t('postSites.KPI.modal.defineNumber', 'Define a Number')}
                          className="w-32 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm font-medium text-gray-700">{t('postSites.KPI.modal.emailNotification', 'Send KPI report by email')}</label>
                  <input
                    type="checkbox"
                    checked={formData.emailNotification}
                    onChange={(e) => setFormData({ ...formData, emailNotification: e.target.checked })}
                    className="rounded w-5 h-5 ml-auto accent-orange-600"
                  />
                </div>

                {formData.emailNotification && (
                  <div className="space-y-3">
                    {formData.emails && formData.emails.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.emails.map((email) => (
                          <div key={email} className="flex items-center gap-2 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                            <span>{email}</span>
                            <button onClick={() => handleRemoveEmail(email)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={currentEmail}
                          onChange={(e) => { setCurrentEmail(e.target.value); setEmailError(''); }}
                          onKeyPress={handleKeyPress}
                          placeholder={t('postSites.KPI.modal.newEmailPlaceholder', 'New email...')}
                          className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${emailError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-orange-500'}`}
                        />
                        <button
                          onClick={handleAddEmail}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                        >
                          {t('postSites.KPI.modal.addEmail', 'Add')}
                        </button>
                      </div>
                      {emailError && (<p className="text-xs text-red-500">{emailError}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
              <button onClick={handleSubmitKPI} className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700">{t('postSites.KPI.modal.add', 'ADD')}</button>
            </div>
          </div>
        </div>
      )}

            {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setDeleteModalOpen(false); setToDeleteId(null); }}>
          <div className="absolute inset-0 bg-black opacity-30" />
          <div className="relative w-96 bg-white rounded shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-center">
                <h3 className="text-lg font-semibold text-center">{t('postSites.KPI.confirmDelete.title', 'Confirm deletion')}</h3>
              </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">{toDeleteId ? t('postSites.KPI.confirmDelete.messageSingle', 'Are you sure you want to delete this KPI? This action cannot be undone.') : t('postSites.KPI.confirmDelete.messageMultiple', 'Are you sure you want to delete {{count}} KPI(s)? This action cannot be undone.', { count: selectedIds.length })}</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-white">
              <button onClick={() => { setDeleteModalOpen(false); setToDeleteId(null); }} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">{t('actions.cancel', 'Cancel')}</button>
              <button onClick={async () => {
                try {
                  if (toDeleteId) {
                    await KpiService.destroy(toDeleteId);
                    toast.success(t('postSites.KPI.toasts.kpiDeleted', 'KPI deleted'));
                  } else if (selectedIds.length > 0) {
                    await Promise.all(selectedIds.map((id) => KpiService.destroy(id)));
                    toast.success(t('postSites.KPI.toasts.kpisDeleted', 'KPIs deleted'));
                  } else {
                    toast.error(t('postSites.KPI.toasts.noSelected', 'No items selected'));
                    return;
                  }
                  await loadKpis();
                } catch (e) {
                  console.error(e);
                  toast.error(t('postSites.KPI.toasts.deleteError', 'Error deleting KPI(s)'));
                } finally {
                  setDeleteModalOpen(false);
                  setToDeleteId(null);
                  setSelectedIds([]);
                }
              }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{t('actions.delete', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

