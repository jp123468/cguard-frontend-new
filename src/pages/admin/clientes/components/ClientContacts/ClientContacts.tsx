import React, { useEffect, useMemo, useState, useRef } from 'react';
import { clientService } from '@/lib/api/clientService';
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EllipsisVertical, Pencil, Trash, Plus } from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PhoneInput } from "@/components/phone/PhoneInput";


type PostSite = {
  id?: string;
  name?: string;
  companyName?: string;
  clientAccountName?: string;
  address?: string;
  contactEmail?: string;
} | string;

type Contact = {
  id: string;
  name: string;
  email?: string; 
  mobile?: string;
  postSite?: PostSite;
  // optional additional fields used in the form and payloads
  description?: string;
  allowGuard?: boolean;
};

export default function ClientContacts({ client }: { client: any }) {
  const [phoneCountry, setPhoneCountry] = useState<string>('us');
  const initial: Contact[] = Array.isArray(client?.contacts) ? client.contacts : [];
  const [contacts, setContacts] = useState<Contact[]>(initial);

  useEffect(() => {
    let mounted = true;
    async function loadContacts() {
      if (!client || !client.id) {
        setContacts(initial);
        return;
      }

      try {
        const resp = await clientService.getClientContacts(client.id, { limit: 9999, offset: 0 });
        if (!mounted) return;
        const rows = Array.isArray(resp?.rows) ? resp.rows : [];
        setContacts(rows);
        console.debug('[ClientContacts] loaded contacts', client.id, { count: rows.length, sample: rows.slice(0, 3) });
      } catch (err) {
        console.warn('[ClientContacts] failed to load contacts from server', err);
        setContacts(initial);
      }
    }

    loadContacts();
    return () => { mounted = false; };
  }, [client?.id]);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[]>([]);
  const drawerAllowGuard = useRef<boolean>(false);

  const [postSites, setPostSites] = useState<any[]>(
    (Array.isArray(client?.postSites) ? client.postSites : []).map((ps: any) => ({
      id: String(ps.id || ps),
      label: ps.name || ps.companyName || ps.clientAccountName || ps.address || ps.contactEmail || String(ps.id || ps),
      raw: ps,
    })),

  );

  useEffect(() => {
    let mounted = true;
    async function loadPostSites() {
      if (!client || !client.id) {
        setPostSites((Array.isArray(client?.postSites) ? client.postSites : []).map((ps: any) => ({
          id: String(ps.id || ps),
          label: ps.name || ps.companyName || ps.address || ps.contactEmail || String(ps.id || ps),
          raw: ps,
        })));
        return;
      }

      try {
        const resp = await clientService.getClientPostSites(client.id, { limit: 9999, offset: 0 });
        if (!mounted) return;
        const rows = Array.isArray(resp?.rows) ? resp.rows : [];
        const normalized = rows.map((r: any) => ({
          id: String(r.id),
          label: r.name || r.companyName || r.clientAccountName || r.address || r.contactEmail || String(r.id),
          raw: r,
        }));
        setPostSites(normalized);
        console.debug('[ClientContacts] loaded postSites', client.id, { count: normalized.length, sample: normalized.slice(0, 3) });
      } catch (err) {
        console.warn('[ClientContacts] failed to load post sites for client', client?.id, err);
        setPostSites((Array.isArray(client?.postSites) ? client.postSites : []).map((ps: any) => ({
          id: String(ps.id || ps),
          label: ps.name || ps.companyName || ps.address || ps.contactEmail || String(ps.id || ps),
          raw: ps,
        })));
      }
    }

    loadPostSites();
    return () => { mounted = false; };
  }, [client?.id]);
  const { t } = useTranslation();

  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});

  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isValidPhone = (phone: string, defaultCountry?: string) => {
    if (!phone || !phone.trim()) return false;
    try {
      // Try parse with provided default country first, fallback to autodetect
      const p = defaultCountry ? parsePhoneNumberFromString(String(phone), { defaultCountry: defaultCountry as any }) : parsePhoneNumberFromString(String(phone));
      if (p && p.isValid()) return true;
      // fallback: try without defaultCountry
      if (defaultCountry) {
        const p2 = parsePhoneNumberFromString(String(phone));
        return p2 ? p2.isValid() : false;
      }
      return false;
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

  function handleOpenAdd() {
    setForm({});
    setPhoneCountry('us');
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
      setErrors(prev => ({ ...prev, mobile: v && !isValidPhone(v, phoneCountry) ? t('clients.contacts.errors.invalidPhone', 'Número inválido') : undefined }));
    }

    if (field === 'name') {
      const v = String(value || '');
      setErrors(prev => ({ ...prev, name: v ? undefined : t('clients.contacts.errors.requiredName', 'Nombre requerido') }));
    }
  }

  async function handleAdd() {
    // Final validation
    const nameVal = String(form.name || '').trim();
    const emailVal = String(form.email || '').trim();
    let mobileVal = String(form.mobile || '').trim();

    const nextErrors: any = {};
    if (!nameVal) nextErrors.name = t('clients.contacts.errors.requiredName', 'Nombre requerido');
    if (!emailVal || !isValidEmail(emailVal)) nextErrors.email = t('clients.contacts.errors.invalidEmail', 'Correo inválido');
    // normalize/format mobile: if user provided local number, try to format using selected country
    try {
      if (mobileVal && !mobileVal.startsWith('+')) {
        const parsed = parsePhoneNumberFromString(mobileVal, { defaultCountry: (phoneCountry || undefined) as any });
        if (parsed && parsed.isValid()) {
          mobileVal = parsed.format('E.164');
        }
      }
    } catch (e) { /* ignore formatting errors */ }
    if (!mobileVal || !isValidPhone(mobileVal, phoneCountry)) nextErrors.mobile = t('clients.contacts.errors.invalidPhone', 'Número inválido');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...nextErrors }));
      return;
    }

    const payload: any = {
      name: nameVal,
      email: emailVal,
      mobile: mobileVal,
      postSite: typeof form.postSite === 'string' ? form.postSite : (form.postSite && (form.postSite as any).id ? String((form.postSite as any).id) : undefined),
      description: (form as any).description || '',
      allowGuard: !!(form as any).allowGuard,
    };

    const isEditing = !!(form && (form as any).id);

    try {
      if (isEditing) {
        // Update
        if (client && client.id) {
          const resp = await clientService.updateClientContact(client.id, String((form as any).id), payload);
          const updated = resp && resp.data ? resp.data : resp;
          setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
          const msg = resp && resp.messageCode ? t(resp.messageCode) : (resp && resp.message ? resp.message : t('clients.contacts.contactUpdated'));
          toast.success(msg);
        } else {
          // local fallback
          setContacts(prev => prev.map(c => c.id === (form as any).id ? ({ ...c, ...payload }) as any : c));
          toast.success(t('clients.contacts.contactUpdated'));
        }
      } else {
        // Create
        const temp: any = {
          id: String(Date.now()),
          ...payload,
        };
        if (client && client.id) {
          const resp = await clientService.createClientContact(client.id, temp);
          const created = resp && resp.data ? resp.data : resp;
          setContacts(prev => [created, ...prev]);
          const msg = resp && resp.messageCode ? t(resp.messageCode) : (resp && resp.message ? resp.message : t('clients.contacts.contactCreated'));
          toast.success(msg);
        } else {
          setContacts(prev => [temp, ...prev]);
          toast.success(t('clients.contacts.contactCreated'));
        }
      }

      setShowAdd(false);
      setForm({});
      setErrors({});
    } catch (err) {
      console.warn('[ClientContacts] failed to save contact on server, falling back to local', err);
      if (isEditing) {
        setContacts(prev => prev.map(c => c.id === (form as any).id ? ({ ...c, ...payload }) as any : c));
        toast.error(t('clients.contacts.contactCreateFailed', { defaultValue: 'Could not update contact' }));
      } else {
        setContacts(prev => [{ id: String(Date.now()), ...payload }, ...prev]);
        toast.error(t('clients.contacts.contactCreateFailed', { defaultValue: 'Could not create contact' }));
      }
      setShowAdd(false);
      setForm({});
      setErrors({});
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Resolve a readable label for a contact's postSite field which can be
  // - a string id
  // - an object with name/companyName/clientAccountName fields
  // - absent but contact may include postSiteId/postSiteName/postSiteIds
  function resolvePostSiteLabel(contact: any) {
    if (!contact) return '-';

    // direct object
    const ps = contact.postSite;
    if (ps && typeof ps === 'object') {
      return ps.name || ps.companyName || ps.clientAccountName || ps.address || ps.contactEmail || ps.id || '-';
    }

    // if postSite is a plain string, it may be an id or already a label
    if (ps && typeof ps === 'string') {
      // try find in postSites by id or by exact label
      const matchById = (postSites || []).find((p: any) => String(p.id) === String(ps));
      if (matchById) return matchById.label;
      const matchByLabel = (postSites || []).find((p: any) => String(p.label) === String(ps));
      if (matchByLabel) return matchByLabel.label;
      // fallback to the raw string (might already be a readable name)
      return ps;
    }

    // fallback: check other contact fields
    if (contact.postSiteName) return contact.postSiteName;
    if (contact.postSiteId) {
      const match = (postSites || []).find((p: any) => String(p.id) === String(contact.postSiteId));
      if (match) return match.label;
      return contact.postSiteId;
    }
    if (contact.postSiteIds && Array.isArray(contact.postSiteIds) && contact.postSiteIds.length) {
      const ids = contact.postSiteIds.map(String);
      const matches = (postSites || []).filter((p: any) => ids.includes(String(p.id)));
      if (matches.length) return matches.map((m: any) => m.label).join(', ');
    }

    return '-';
  }

  async function deleteContact(id: string) {
    try {
      if (client && client.id) {
        const resp = await clientService.destroyClientContact(client.id, id);
        setContacts(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        setOpenMenuId(null);
        const msg = resp && resp.messageCode ? t(resp.messageCode) : (resp && resp.message ? resp.message : t('clients.contacts.contactDeleted'));
        toast.success(msg);
      } else {
        setContacts(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        setOpenMenuId(null);
      }
    } catch (err) {
      console.warn('[ClientContacts] failed to delete contact on server, falling back to local', err);
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      setOpenMenuId(null);
      toast.error(t('clients.contacts.contactDeleteFailed', { defaultValue: 'Could not delete contact' }));
    }
  }

  async function deleteSelected(ids?: string[]) {
    const toDelete = Array.isArray(ids) && ids.length > 0 ? ids : selectedIds;
    if (!toDelete || toDelete.length === 0) return;

    try {
      if (client && client.id) {
        // delete sequentially to keep it simple
        let lastResp: any = null;
        for (const id of toDelete) {
          lastResp = await clientService.destroyClientContact(client.id, id);
        }
        const msg = lastResp && lastResp.messageCode ? t(lastResp.messageCode) : (lastResp && lastResp.message ? lastResp.message : t('clients.contacts.contactDeleted'));
        toast.success(msg);
      }
    } catch (err) {
      console.warn('[ClientContacts] failed to delete selected contacts on server, falling back to local', err);
      toast.error(t('clients.contacts.contactDeleteFailed', { defaultValue: 'Could not delete contact(s)' }));
    }
    setContacts(prev => prev.filter(c => !toDelete.includes(c.id)));
    setSelectedIds(prev => prev.filter(id => !toDelete.includes(id)));
    setHeaderMenuOpen(false);
    setConfirmDeleteIds([]);
  }

  const confirmNames = (confirmDeleteIds || []).map(id => {
    const found = (contacts || []).find(c => c.id === id);
    return found ? (found.name || String(found.id)) : String(id);
  });

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
                    <button onClick={() => setConfirmDeleteIds(selectedIds)} disabled={selectedIds.length === 0} className={`block px-4 py-2 text-sm hover:bg-gray-50 ${selectedIds.length === 0 ? 'text-gray-400 cursor-not-allowed' : ''}`}>{t('actions.delete')}</button>
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
                  placeholder={t('clients.contacts.searchcontact') || 'Search contact'}
                  aria-label={t('clients.contacts.searchcontact') || 'Search contact'}
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
              <Plus size={18} />
              <span>{t('clients.contacts.addcontact') || 'nuevo contacto'}</span>
            </button>
          </div>
        </div>
        <div className="mt-6 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left"><input type="checkbox" onChange={(e) => { const checked = e.target.checked; if (checked) setSelectedIds(contacts.map(c => c.id)); else setSelectedIds([]); }} checked={selectedIds.length === contacts.length && contacts.length > 0} /></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactName') || 'Name'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactEmail') || 'Email'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactPhone') || 'Mobile Number'}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('clients.contacts.contactPostSites') || 'Post Site'}</th>
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
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.mobile || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{resolvePostSiteLabel(c)}</td>
                  <td key={`actions-${c.id}`} className="text-right pr-4">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenuId(prev => (prev === c.id ? null : c.id))}
                        aria-expanded={openMenuId === c.id}
                        aria-controls={`actions-${c.id}-menu`}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                        title="Actions"
                      >
                        <EllipsisVertical size={18} />
                      </button>

                      {openMenuId === c.id && (
                        <div id={`actions-${c.id}-menu`} className="absolute right-0 mt-2 w-36 bg-white border rounded-md shadow-lg z-50">
                          <button
                            onClick={() => { setForm(c); setShowAdd(true); setOpenMenuId(null); }}
                            className="w-full flex items-center justify-start gap-2 px-3 py-2 hover:bg-gray-50 focus:outline-none"
                            aria-label={t('actions.edit')}
                            title={t('actions.edit')}
                          >
                            <Pencil size={16} />
                            <span className="text-sm">{t('actions.edit') || 'Edit'}</span>
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteIds([c.id]); setOpenMenuId(null); }}
                            className="w-full flex items-center justify-start gap-2 px-3 py-2 text-red-600 hover:bg-gray-50 focus:outline-none"
                            aria-label={t('actions.delete')}
                            title={t('actions.delete')}
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
          <div className="ml-auto w-full md:w-96 bg-white h-full shadow-xl p-6 pb-20 overflow-auto z-50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{form && (form as any).id ? t('clients.contacts.editcontact') : t('clients.contacts.form.AddClientContact')}</h3>
              <button onClick={handleCloseAdd} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>


            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Name')}</label>
                <input aria-invalid={!!errors.name} className="w-full border rounded-md h-10 px-3" value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Email')}</label>
                <input aria-invalid={!!errors.email} className="w-full border rounded-md h-10 px-3" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Mobile Number')}</label>
                <div aria-invalid={!!errors.mobile}>
                  {/* Cast props to any to accommodate differing PhoneInputProps signature */}
                  <PhoneInput
                    {...({ defaultCountry: phoneCountry,
                      value: form.mobile || '',
                      onChange: (v: any, data?: any) => {
                        // PhoneInput may pass (value, data). Keep supporting single-arg too.
                        const val = String(v || '');
                        handleChange('mobile', val);
                        if (data && data.countryCode) setPhoneCountry(String(data.countryCode).toLowerCase());
                      },
                      placeholder: "e.g. +12015550123"
                    } as any)}
                  />
                </div>
                {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.Description')}</label>
                <textarea className="w-full border rounded-md px-3 py-2 min-h-[90px]" value={(form as any).description || ''} onChange={e => handleChange('description', e.target.value)} placeholder={t('clients.contacts.form.descriptioninput', 'Enter - description')} rows={6} />

              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('clients.contacts.form.AssignPostSite')}</label>
                <select
                  className="w-full border rounded-md h-10 px-3"
                  value={typeof form.postSite === 'string' ? form.postSite : (form.postSite && (form.postSite as any).id ? String((form.postSite as any).id) : '')}
                  onChange={e => handleChange('postSite', e.target.value)}
                >
                  <option value="">--</option>
                  {(Array.isArray(postSites) ? postSites : []).map((ps: any) => (
                    <option key={ps.id} value={ps.id}>{ps.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="allowGuard" type="checkbox" className="h-4 w-4" checked={!!(form as any).allowGuard} onChange={e => handleChange('allowGuard', e.target.checked)} />
                <label htmlFor="allowGuard" className="text-sm text-gray-700">{t('clients.contacts.form.checkbox')}</label>
              </div>
            </div>

            <div className="fixed bottom-6 md:bottom-8 right-6 md:right-10">
              <button
                onClick={handleAdd}
                disabled={!canSubmit}
                className={`${canSubmit ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-400 cursor-not-allowed opacity-60'} text-white transition-colors duration-300 ease-out px-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300`}
              >
                {(form && (form as any).id) ? (t('save') || 'Save') : (t('clients.contacts.form.Addcontact') || 'ADD')}
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
            <h3 className="text-lg font-semibold mb-2 text-center">{t('clients.contacts.confirmDeleteTitle', 'Delete contact(s)?')}</h3>
            <p className="text-sm text-gray-600 mb-2 text-center">{confirmNames.join(', ')}</p>
            <p className="text-sm text-gray-600 mb-4">{t('clients.contacts.confirmDeleteMessage', 'Are you sure you want to permanently delete the selected contact(s)? This action cannot be undone.')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteIds([])} className="px-4 py-2 rounded-md border">{t('actions.cancel') || 'Cancel'}</button>
              <button
                onClick={() => {
                  if (confirmDeleteIds.length === 1) {
                    deleteContact(confirmDeleteIds[0]);
                  } else {
                    deleteSelected(confirmDeleteIds);
                  }
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
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
