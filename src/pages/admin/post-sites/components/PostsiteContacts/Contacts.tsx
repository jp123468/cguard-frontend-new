import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { clientService } from '@/lib/api/clientService';
import { postSiteService } from '@/lib/api/postSiteService';
import { PhoneInput } from "@/components/phone/PhoneInput";
import { toast } from "sonner";
import { EllipsisVertical, Pencil, Trash, Plus } from 'lucide-react';


type Contact = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  postSite?: string;
  description?: string;
  allowGuard?: boolean;
};

export default function PostSiteContacts({ site }: { site?: any }) {
  const { t } = useTranslation();
  const initial: Contact[] = Array.isArray(site?.contacts) ? site.contacts : [];
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const drawerAllowGuard = useRef<boolean>(false);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
  const { id: paramsId } = useParams();
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});

  const isValidEmail = (email: string) => {
    // Improved email validation: stricter but not overly permissive.
    // Accepts common local-part characters and requires a valid domain with TLD of at least 2 chars.
    if (!email || !email.trim()) return false;
    const v = String(email).trim();
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    return re.test(v);
  };

  const isValidPhone = (phone: string) => {
    // Use libphonenumber-js to parse and validate.
    // Require a valid international-style phone (E.164) or a parseable number that is valid.
    if (!phone || !phone.trim()) return false;
    try {
      const p = parsePhoneNumberFromString(String(phone));
      if (!p) return false;
      if (!p.isValid()) return false;
      // Ensure E.164 formatted result has a sensible number of digits (7-15)
      const e164 = p.format('E.164') || '';
      const digits = e164.replace(/\D/g, '');
      return e164.startsWith('+') && digits.length >= 7 && digits.length <= 15;
    } catch (e) {
      return false;
    }
  };
  const canSubmit = !!form.name && !!form.email && !!form.mobile && !errors.email && !errors.mobile;

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(c => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.mobile || '').toLowerCase().includes(q));
  }, [contacts, query]);

  const getPostSiteLabel = (ps: any) => {
    if (!ps) return site?.name || '-';
    if (typeof ps === 'string') return ps;
    if (typeof ps === 'object') {
      return ps.name || ps.companyName || ps.label || String(ps.id || ps._id) || site?.name || '-';
    }
    return String(ps);
  };

  // Determine the postSite id: prefer URL param, fallback to site.id
  const postSiteId = paramsId || site?.id || site?.postSiteId || site?.id?.toString();

  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    async function loadContacts() {
      // Prefer loading via the client contacts endpoint and filter by postSite
      let clientId = site?.clientId || (site?.client && site.client.id) || resolvedClientId;
      // If we don't have a clientId yet but have a postSiteId, fetch the post site to resolve its client
      if (!clientId && postSiteId) {
        try {
          const ps = await postSiteService.get(postSiteId);
          if (!mounted) return;
          clientId = ps?.clientId || ps?.clientAccountId || (ps?.client && ps.client.id) || (ps?.clientAccount && ps.clientAccount.id) || undefined;
          if (clientId) setResolvedClientId(String(clientId));
        } catch (err) {
          console.warn('[PostSiteContacts] failed to fetch postSite to resolve clientId', err);
          toast.error(t('clients.contacts.loadPostSiteError', 'Error al cargar datos del puesto'));
        }
      }
      if (!clientId && !postSiteId) return;
      setLoading(true);
      try {
        if (clientId) {
          const resp = await clientService.getClientContacts(String(clientId), { limit: 9999, offset: 0 });
          if (!mounted) return;
          const rows = Array.isArray(resp?.rows) ? resp.rows : [];
          // Filter contacts that belong to this post site
          const filteredRows = rows.filter((r: any) => {
            // backend may store postSite as id or name; check common fields
            if (r.postSite === postSiteId || String(r.postSite) === String(postSiteId)) return true;
            if (r.postSiteId && (String(r.postSiteId) === String(postSiteId))) return true;
            if (Array.isArray(r.postSiteIds) && r.postSiteIds.map(String).includes(String(postSiteId))) return true;
            // sometimes postSite stored inside an object
            if (r.postSite && typeof r.postSite === 'object' && (String(r.postSite.id) === String(postSiteId) || String(r.postSite._id) === String(postSiteId))) return true;
            return false;
          });
          setContacts(filteredRows.map((r: any) => ({
            id: String(r.id || r._id || Date.now()),
            name: r.name || r.fullName || r.contactName || r.label || '',
            email: r.email,
            mobile: r.mobile || r.phone,
            postSite: site?.name || r.postSiteName || r.postSite || undefined,
            description: r.description || r.desc || r.note || r.notes || '',
          })));
        } else {
          // fallback: if no clientId but we have postSiteId, use postSiteService endpoint
          const resp = await postSiteService.getPostSiteContacts(postSiteId, { limit: 9999, offset: 0 });
          if (!mounted) return;
          const rows = Array.isArray(resp?.rows) ? resp.rows : (Array.isArray(resp) ? resp : []);
          setContacts(rows.map((r: any) => ({ id: String(r.id || r._id || Date.now()), name: r.name || r.fullName || r.contactName || '', email: r.email || r.contactEmail, mobile: r.mobile || r.phone || r.contactPhone, postSite: site?.name || r.postSiteName || r.postSite || undefined, description: r.description || r.desc || r.note || r.notes || '' })));
        }
      } catch (err) {
        console.warn('[PostSiteContacts] error loading contacts', err);
        toast.error(t('clients.contacts.loadError', 'No se pudieron cargar los contactos'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadContacts();
    return () => { mounted = false; };
  }, [postSiteId, site?.clientId]);

  function handleOpenAdd() {
    setForm({});
    setShowAdd(true);
  }

  function handleCloseAdd() {
    setShowAdd(false);
  }

  function handleChange(field: string | keyof Contact, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));

    if (field === 'email') {
      const v = String(value || '');
      setErrors(prev => ({ ...prev, email: v && !isValidEmail(v) ? t('clients.contacts.errors.invalidEmail', 'Correo inválido') : undefined }));
    }

    if (field === 'mobile') {
      const v = String(value || '');
      setErrors(prev => ({ ...prev, mobile: v && !isValidPhone(v) ? t('clients.contacts.errors.invalidPhone', 'Número inválido') : undefined }));
    }

    if (field === 'name') {
      const v = String(value || '');
      setErrors(prev => ({ ...prev, name: v ? undefined : t('clients.contacts.errors.requiredName', 'Nombre requerido') }));
    }
  }

  function handleAdd() {
    // Basic validation
    const nameVal = String(form.name || '').trim();
    const emailVal = String(form.email || '').trim();
    const mobileVal = String(form.mobile || '').trim();

    const nextErrors: any = {};
    if (!nameVal) nextErrors.name = t('clients.contacts.errors.requiredName', 'Nombre requerido');
    if (!emailVal || !isValidEmail(emailVal)) nextErrors.email = t('clients.contacts.errors.invalidEmail', 'Correo inválido');
    if (!mobileVal || !isValidPhone(mobileVal)) nextErrors.mobile = t('clients.contacts.errors.invalidPhone', 'Número inválido');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...nextErrors }));
      toast.error(t('clients.contacts.errors.invalidForm', 'Corrige los errores del formulario'));
      return;
    }

    const contactId = String((form && (form as any).id) || Date.now());
    const newContact: any = {
      id: contactId,
      name: nameVal,
      email: emailVal,
      mobile: mobileVal,
      postSite: site?.name || site?.companyName || (form.postSite as string) || '',
      description: (form as any).description || '',
      allowGuard: !!(form as any).allowGuard,
    };
    (async () => {
      try {
        // If we resolved a clientId, persist via clientService (primary flow)
        const clientIdLocal = site?.clientId || (site?.client && site.client.id) || resolvedClientId;
        if (clientIdLocal) {
          const payload: any = {
            name: nameVal,
            email: emailVal,
            mobile: mobileVal,
            description: (form as any).description || undefined,
            allowGuard: !!(form as any).allowGuard,
            postSiteId: postSiteId,
          };

          if (form && (form as any).id) {
            // update
            await clientService.updateClientContact(String(clientIdLocal), String((form as any).id), payload);
            setContacts(prev => prev.map(c => c.id === (form as any).id ? { ...c, ...payload } : c));
            toast.success(t('clients.contacts.contactUpdated', 'Contact updated successfully'));
          } else {
            const resp = await clientService.createClientContact(String(clientIdLocal), payload);
            const created = resp && resp.data ? resp.data : resp;
            setContacts(prev => [{ id: String(created.id || created._id || Date.now()), name: created.name || nameVal, email: created.email || emailVal, mobile: created.mobile || created.phone || mobileVal, postSite: site?.name || created.postSiteName || undefined, description: created.description || '', allowGuard: !!created.allowGuard }, ...prev]);
            toast.success(t('clients.contacts.contactCreated', 'Contact created successfully'));
          }
        } else {
          // No clientId: we can only update local state or optionally call a post-site specific endpoint if available.
          // Currently backend only exposes GET by post-site; show a message to the user.
          if (form && (form as any).id) {
            setContacts(prev => prev.map(c => c.id === (form as any).id ? newContact : c));
            toast.success(t('clients.contacts.contactUpdated', 'Contact updated successfully'));
          } else {
            setContacts(prev => [newContact, ...prev]);
            toast.success(t('clients.contacts.contactCreated', 'Contact created successfully'));
          }
        }

        setShowAdd(false);
        setForm({});
        setErrors({});
      } catch (err) {
        console.warn('[PostSiteContacts] add error', err);
        toast.error(t('clients.contacts.contactCreateFailed', 'Could not create contact'));
      }
    })();
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function deleteContact(id: string) {
    (async () => {
      try {
        const clientIdLocal = site?.clientId || (site?.client && site.client.id) || resolvedClientId;
        if (clientIdLocal) {
          await clientService.destroyClientContact(String(clientIdLocal), id);
        }
      } catch (err) {
        console.warn('[PostSiteContacts] delete error', err);
      } finally {
        setContacts(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        setOpenMenuId(null);
        toast.success(t('clients.contacts.contactDeleted', 'Contact deleted successfully'));
      }
    })();
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    // ask for confirmation
    setConfirmDeleteIds(selectedIds);
    setHeaderMenuOpen(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center w-full">
            <div className="flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => setHeaderMenuOpen(v => !v)}
                  className="px-3 py-2 border rounded-md inline-flex items-center gap-2 bg-white"
                >
                  <span>{t('actions.action')}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {headerMenuOpen && (
                  <div className="absolute mt-2 bg-white shadow-lg rounded-md z-20">
                    <button onClick={deleteSelected} className="block px-4 py-2 text-sm hover:bg-gray-50">{t('actions.delete')}</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('clients.contacts.searchcontact') || 'Search Contacts'}
                  aria-label={t('clients.contacts.searchcontact') || 'Search Contacts'}
                  className="w-full max-w-lg h-10 rounded-full border pl-10 pr-3"
                />
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={handleOpenAdd}
              className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors whitespace-nowrap min-w-[160px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t('clients.contacts.addcontact') || 'Add Contact'}</span>
            </button>
          </div>
        </div>
        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" onChange={(e) => { const checked = e.target.checked; if (checked) setSelectedIds(contacts.map(c => c.id)); else setSelectedIds([]); }} checked={selectedIds.length === contacts.length && contacts.length > 0} /></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactName') || 'Name'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactEmail') || 'Email'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactPhone') || 'Mobile Number'}</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-32 h-32">
                        <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                          <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                          <circle cx="85" cy="100" r="8" fill="white" />
                          <circle cx="115" cy="100" r="8" fill="white" />
                          <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-700">{t('clients.empty.title') || 'No results found'}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('clients.empty.description') || "We couldn't find any items matching your search."}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{c.name}</div>
                  </td>
                  <td className="px-4 py-3">{c.email || '-'}</td>
                  <td className="px-4 py-3">{c.mobile || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenuId(prev => (prev === c.id ? null : c.id))}
                        aria-expanded={openMenuId === c.id}
                        aria-controls={`actions-${c.id}-menu`}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                        title={t('actions.action') || 'Actions'}
                      >
                        <EllipsisVertical size={18} />
                      </button>

                      {openMenuId === c.id && (
                        <div id={`actions-${c.id}-menu`} className="absolute right-0 mt-2 w-36 bg-white border rounded-md shadow-lg z-50">
                          <button
                            onClick={() => { setForm(c); setShowAdd(true); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 focus:outline-none"
                            aria-label="Edit"
                            title={t('actions.edit') || 'Edit'}
                          >
                            <Pencil size={16} />
                            <span className="text-sm">{t('actions.edit') || 'Edit'}</span>
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteIds([c.id]); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-gray-50 focus:outline-none"
                            aria-label="Delete"
                            title={t('actions.delete') || 'Delete'}
                          >
                            <Trash size={16} />
                            <span className="text-sm">{t('actions.delete') || 'Delete'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black opacity-30 z-40" onClick={handleCloseAdd} />
          <div className="ml-auto w-full md:w-96 bg-white h-full shadow-xl p-6 overflow-auto z-50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('clients.contacts.form.AddClientContact') || 'Add Contact to Post Site'}</h3>
              <button onClick={handleCloseAdd} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Name')}</label>
                <input className="w-full border rounded-md h-10 px-3" value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Email')}</label>
                <input className="w-full border rounded-md h-10 px-3" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Mobile Number')}</label>
                <div aria-invalid={!!errors.mobile}>
                  <PhoneInput
                    value={form.mobile || ''}
                    onChange={(v) => handleChange('mobile', v)}
                    placeholder={t('clients.contacts.form.mobilePlaceholder', 'e.g. +12015550123')}
                  />
                </div>
                {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Description')}</label>
                <textarea className="w-full border rounded-md px-3 py-2 min-h-[90px]" value={(form as any).description || ''} onChange={e => handleChange('description', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input id="allowGuard" type="checkbox" className="h-4 w-4" checked={!!(form as any).allowGuard} onChange={e => handleChange('allowGuard', e.target.checked)} />
                <label htmlFor="allowGuard" className="text-sm text-gray-700">{t('clients.contacts.form.checkbox') || 'Allow guard to view contact'}</label>
              </div>
            </div>

            <div className="fixed bottom-6 md:bottom-8 right-6 md:right-10">
              <button
                onClick={handleAdd}
                disabled={!canSubmit}
                className={`${canSubmit ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-400 cursor-not-allowed opacity-60'} text-white transition-colors duration-300 ease-out px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300`}>
                {(form && (form as any).id) ? (t('actions.save') || 'Save') : (t('actions.save') || 'Add Contact')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setConfirmDeleteIds([])} />
          <div className="bg-white rounded-md shadow-xl p-6 z-70 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">{t('clients.contacts.confirmDeleteTitle') || 'Confirm delete'}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('clients.contacts.confirmDeleteMessage') || 'Are you sure you want to delete the selected contact(s)?'}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteIds([])} className="px-4 py-2 border rounded-md">{t('actions.cancel') || 'Cancel'}</button>
              <button
                  onClick={() => {
                  const removedCount = confirmDeleteIds.length;
                  setContacts(prev => prev.filter(c => !confirmDeleteIds.includes(c.id)));
                  setSelectedIds(prev => prev.filter(id => !confirmDeleteIds.includes(id)));
                  setConfirmDeleteIds([]);
                  // use existing i18n key for deletion; append count when >1
                  const base = t('clients.contacts.contactDeleted', 'Contact deleted successfully');
                  toast.success(removedCount > 1 ? `${base} (${removedCount})` : base);
                 }}
                 className="px-4 py-2 bg-red-600 text-white rounded-md"
               >
                 {t('actions.delete') || 'Delete'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
