"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import AppLayout from "@/layouts/app-layout";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone/PhoneInput";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import {
  inviteByOptions,
  type GuardEntryValues,
  type SecurityGuardsFormValues,
  securityGuardsSchema,
} from "@/lib/validators/security-guard.schema";
import {
  joinByCodeSchema, type JoinByCodeEntry, type JoinByCodeFormValues,
} from "@/lib/validators/join-by-code.schema";
import {
  inviteByLinkSchema, type InviteByLinkEntry, type InviteByLinkFormValues,
} from "@/lib/validators/invite-by-link.schema";
import {
  createProfileSchema, type CreateProfileValues,
} from "@/lib/validators/create-profile.schema";

import { GuardTabsHeader } from "@/components/app/guard-tabs";
import { FormBlock } from "@/components/app/form-block";
import { Combobox } from "@/components/app/combobox";
import MultiCombobox from "@/components/app/multicombobox";
import { Copyable } from "@/components/app/copyable";
import { AddBlockButton, RemoveBlockButton } from "@/components/app/add-remove";
import { SubmitBar } from "@/components/app/submit-bar";
import { clientService } from "@/lib/api/clientService";
import { securityGuardService } from "@/lib/api/securityGuardService";
import { postSiteService } from "@/lib/api/postSiteService";
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'

// Helpers
const blankInviteEntry = (inviteBy: GuardEntryValues["inviteBy"] = "Correo Electrónico"): any => ({
  firstName: "", lastName: "", inviteBy, contact: "", clientId: [] as string[], postSiteId: [] as string[],
});
const blankJoinEntry = (): JoinByCodeEntry => ({ phone: "" });
const blankLinkEntry = (): InviteByLinkEntry => ({ phone: "" });
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

type TabKey = "invite" | "join_code" | "invite_link" | "create_profile";

export default function NewSecurityGuardPage() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { t } = useTranslation()

  useEffect(() => {
    if (!hasPermission('securityGuardCreate')) {
      toast.error(t('guards.new.errors.no_permission_create'));
      navigate('/security-guards');
    }
  }, [hasPermission, navigate]);
  const [activeTab, setActiveTab] = useState<TabKey>("invite");
  const [clients, setClients] = useState<Array<{ id: string; name: string; lastName?: string }>>([]);
  const [sites, setSites] = useState<Array<any>>([]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsResp, sitesResp] = await Promise.all([
          clientService.getClients({}),
          postSiteService.list({}, { limit: 1000, offset: 0 }),
        ]);

        setClients(clientsResp.rows || []);
        setSites(sitesResp.rows || []);
      } catch (error) {
        console.error(error);
        toast.error(t('guards.new.toasts.clients_sites_load_error'));
      }
    };

    loadData();
  }, []);

  /* ============== TAB 1: INVITAR (bloques) ============== */
  const inviteForm = useForm<SecurityGuardsFormValues>({
    resolver: zodResolver(securityGuardsSchema),
    defaultValues: { entries: [blankInviteEntry("Correo Electrónico")] },
    mode: "onTouched",
  });
  const { control: inviteCtrl, handleSubmit: submitInvite, setValue: setInviteValue, formState: inviteState, setError: setInviteError } = inviteForm;
  const { fields: inviteFields, append: inviteAppend, remove: inviteRemove } = useFieldArray({ control: inviteCtrl, name: "entries" });
  const inviteEntries = useWatch({ control: inviteCtrl, name: "entries" });

  const onSubmitInvite = async (v: SecurityGuardsFormValues) => {
    try {
      console.log('[NewSecurityGuardPage] invite payload ->', v.entries)
      // Normalize entries so backend receives explicit phoneNumber/email fields
      const payload = v.entries.map((e) => ({
        firstName: e.firstName,
        lastName: e.lastName,
        // send arrays and keep single-value compatibility
        clientIds: Array.isArray(e.clientId) ? e.clientId : (e.clientId ? [e.clientId] : []),
        postSiteIds: Array.isArray(e.postSiteId) ? e.postSiteId : (e.postSiteId ? [e.postSiteId] : []),
        clientId: Array.isArray(e.clientId) ? e.clientId[0] : e.clientId,
        postSiteId: Array.isArray(e.postSiteId) ? e.postSiteId[0] : e.postSiteId,
        // backend expects a generic `contact` field for invite flows
        // keep explicit `phoneNumber`/`email` as well for compatibility
        contact: e.contact,
        phoneNumber: e.inviteBy === "SMS" ? e.contact : undefined,
        email: e.inviteBy === "Correo Electrónico" ? e.contact : undefined,
        // Do not include `roles` here — backend sets securityGuard role server-side
        inviteBy: e.inviteBy,
      }));
      await securityGuardService.invite(payload);
      console.log('[NewSecurityGuardPage] invite response: sent')
      toast.success(t('guards.new.toasts.invites_sent'));
      // After successful invite, navigate back to the security guards list
      navigate('/security-guards');
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] invite error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setInviteError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? t('guards.new.toasts.invite_error'));
      } catch (ex) {
        toast.error(e?.message ?? t('guards.new.toasts.invite_error'));
      }
    }
  };

  /* ============== TAB 2: UNIRSE POR CÓDIGO (bloques) ============== */
  const initialCode = useMemo(() => genCode(), []);
  const joinForm = useForm<JoinByCodeFormValues>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: { code: initialCode, entries: [blankJoinEntry()] },
    mode: "onTouched",
  });
  const { control: joinCtrl, handleSubmit: submitJoin, setValue: setJoinValue, getValues: getJoinValues, formState: joinState, setError: setJoinError } = joinForm;
  const { fields: joinFields, append: joinAppend, remove: joinRemove } = useFieldArray({ control: joinCtrl, name: "entries" });
  const codeValue = useWatch({ control: joinCtrl, name: "code" });

  const onSubmitJoin = async (v: JoinByCodeFormValues) => {
    try {
      console.log('[NewSecurityGuardPage] joinByCode payload ->', { code: v.code, entries: v.entries })
      // Ensure backend gets phoneNumber
      const payload = v.entries.map((e) => ({ phoneNumber: e.phone }));
      await securityGuardService.joinByCode(v.code, payload);
      console.log('[NewSecurityGuardPage] joinByCode response: sent')
      toast.success(t('guards.new.join_code.invite_sent'));
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] joinByCode error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setJoinError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? t('guards.new.join_code.invite_error'));
      } catch (ex) {
        toast.error(e?.message ?? t('guards.new.join_code.invite_error'));
      }
    }
  };
  const regenCode = () => setJoinValue("code", genCode(), { shouldValidate: true });

  /* ============== TAB 3: INVITAR USANDO ENLACE (bloques) ============== */
  const linkForm = useForm<InviteByLinkFormValues>({
    resolver: zodResolver(inviteByLinkSchema),
    defaultValues: { link: "https://gp.guardspro.com/guard-join/your-company", entries: [blankLinkEntry()] },
    mode: "onTouched",
  });
  const { control: linkCtrl, handleSubmit: submitLink, getValues: getLinkValues, formState: linkState, setError: setLinkError } = linkForm;
  const { fields: linkFields, append: linkAppend, remove: linkRemove } = useFieldArray({ control: linkCtrl, name: "entries" });
  const linkValue = useWatch({ control: linkCtrl, name: "link" });

  const onSubmitLink = async (v: InviteByLinkFormValues) => {
    try {
      console.log('[NewSecurityGuardPage] inviteByLink payload ->', { link: v.link, entries: v.entries })
      // Ensure backend receives phoneNumber
      const payload = v.entries.map((e) => ({ phoneNumber: e.phone }));
      await securityGuardService.inviteByLink(v.link, payload);
      console.log('[NewSecurityGuardPage] inviteByLink response: sent')
      toast.success(t('guards.new.link.invite_sent'));
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] inviteByLink error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setLinkError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? t('guards.new.link.invite_error'));
      } catch (ex) {
        toast.error(e?.message ?? t('guards.new.link.invite_error'));
      }
    }
  };

  /* ============== TAB 4: CREAR PERFIL ============== */
  const createIntentRef = useRef<"create" | "create_send">("create");
  const createForm = useForm<CreateProfileValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "", clientId: [] as string[], postSiteId: [] as string[] },
    mode: "onTouched",
  });
  const { control: createCtrl, handleSubmit: submitCreate, formState: createState, setError: setCreateError } = createForm;

  const onSubmitCreate = async (v: CreateProfileValues) => {
    try {
      const payload = { ...v, sendVerificationEmails: true };
      console.log('[NewSecurityGuardPage] createProfile payload ->', payload, 'intent:', createIntentRef.current)
      await securityGuardService.create(payload);
      console.log('[NewSecurityGuardPage] createProfile response: created')
      if (createIntentRef.current === "create_send") {
        toast.success(t('guards.new.toasts.profile_created_sent'));
      } else {
        toast.success(t('guards.new.toasts.profile_created'));
      }
      // Reset the create form after successful creation so fields are cleared
      try { createForm.reset(); } catch (_) {}
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] createProfile error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setCreateError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? t('guards.new.errors.error_create_profile'));
      } catch (ex) {
        toast.error(e?.message ?? t('guards.new.errors.error_create_profile'));
      }
    }
  };

  // Data helpers for combobox
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: [c.name, c.lastName].filter(Boolean).join(" ").trim() || c.name,
  }));
  const siteOptions = sites.map((s: any) => ({ value: s.id, label: s.name }));

  // watch create form clientId to filter site options for create form
  const createClientId = useWatch({ control: createCtrl, name: 'clientId' });
  const matchesClient = (s: any, clientId?: string) => {
    if (!clientId) return false;
    // check multiple possible shapes returned by the API
    if (s.clientId && String(s.clientId) === String(clientId)) return true;
    if (s.clientAccountId && String(s.clientAccountId) === String(clientId)) return true;
    if (s.client && (s.client.id && String(s.client.id) === String(clientId))) return true;
    if (s.clientAccount && (s.clientAccount.id && String(s.clientAccount.id) === String(clientId))) return true;
    // some backends may return nested clientAccount object under `clientAccount` or `client`
    return false;
  };

  // Normalize createClientId which may be a string or an array of strings from the form
  const createClientIds: string[] = Array.isArray(createClientId)
    ? (createClientId as string[])
    : createClientId
      ? [createClientId as string]
      : [];
  const createSiteOptions = createClientIds.length
    ? sites.filter((s: any) => createClientIds.some((cid) => matchesClient(s, cid))).map((s: any) => ({ value: s.id, label: s.name }))
    : [];

  const translateInviteByLabel = (val: string) => val === "SMS" ? t('guards.new.form.contactSms') : t('guards.new.form.contactEmail')

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: t('guards.new.breadcrumb.dashboard'), path: "/dashboard" }, { label: t('guards.new.title') }]} />

      <div className="p-4">
        <GuardTabsHeader value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          {/* ------- TAB 1 ------- */}
          {activeTab === "invite" && (
            <>
              <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
                {t('guards.new.invite.description')}
              </p>
              <Form {...inviteForm}>
                <form className="mt-6 grid gap-8" onSubmit={submitInvite(onSubmitInvite)}>
                  {inviteFields.map((f, idx) => {
                    const inviteBy = inviteEntries?.[idx]?.inviteBy ?? "Correo Electrónico";
                    const contactLabel = translateInviteByLabel(inviteBy);
                    const contactPh = inviteBy === "SMS" ? t('guards.new.form.contactPhSms') : t('guards.new.form.contactPhEmail');

                    return (
                      <FormBlock key={f.id}>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                          <FormField control={inviteCtrl} name={`entries.${idx}.firstName`} render={({ field }) => (
                            <FormItem><FormLabel>{t('guards.new.form.firstName')}</FormLabel><FormControl><Input placeholder={t('guards.new.form.firstNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={inviteCtrl} name={`entries.${idx}.lastName`} render={({ field }) => (
                            <FormItem><FormLabel>{t('guards.new.form.lastName')}</FormLabel><FormControl><Input placeholder={t('guards.new.form.lastNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={inviteCtrl} name={`entries.${idx}.inviteBy`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('guards.new.form.inviteBy')}</FormLabel>
                              <Select value={field.value} onValueChange={(v) => { field.onChange(v); setInviteValue(`entries.${idx}.contact`, ""); }}>
                                <FormControl><SelectTrigger><SelectValue placeholder={t('guards.new.form.selectMethodPlaceholder')} /></SelectTrigger></FormControl>
                                <SelectContent>{inviteByOptions.map((o) => <SelectItem key={o} value={o}>{translateInviteByLabel(o)}</SelectItem>)}</SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                          <FormField control={inviteCtrl} name={`entries.${idx}.contact`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>{contactLabel}</FormLabel>
                              <FormControl><Input placeholder={contactPh} {...field} /></FormControl>
                              {inviteBy === "SMS" && <FormDescription>{t('guards.new.form.contactPhSms')}</FormDescription>}
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={inviteCtrl} name={`entries.${idx}.clientId`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('guards.new.form.selectClient')}</FormLabel>
                              <MultiCombobox value={field.value || []} onChange={(v) => field.onChange(v)} options={clientOptions} placeholder={t('guards.new.form.selectClient')} aria-label={t('guards.new.form.selectClient')} />
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={inviteCtrl} name={`entries.${idx}.postSiteId`} render={({ field }) => {
                            const entryClientIdsRaw = inviteEntries?.[idx]?.clientId || [];
                            const entryClientIds = Array.isArray(entryClientIdsRaw)
                              ? entryClientIdsRaw
                              : entryClientIdsRaw
                                ? [entryClientIdsRaw]
                                : [];
                            const optionsForEntry = entryClientIds.length
                              ? sites.filter((s: any) => entryClientIds.some((cid: any) => matchesClient(s, cid))).map((s: any) => ({ value: s.id, label: s.name }))
                              : [];
                            return (
                              <FormItem>
                                  <FormLabel>{t('guards.new.form.assignPostSite')}</FormLabel>
                                  <MultiCombobox value={field.value || []} onChange={(v) => field.onChange(v)} options={optionsForEntry} placeholder={t('guards.new.form.assignPostSite')} aria-label={t('guards.new.form.assignPostSite')} />
                                <FormMessage />
                              </FormItem>
                            );
                          }} />
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <AddBlockButton onClick={() => inviteAppend(blankInviteEntry(inviteBy))} />
                          {inviteFields.length > 1 && <RemoveBlockButton onConfirm={() => inviteRemove(idx)} />}
                        </div>
                      </FormBlock>
                    );
                  })}

                  <SubmitBar primaryLabel={t('guards.new.form.send')} loading={inviteState.isSubmitting} onPrimary={submitInvite(onSubmitInvite)} primaryClassName="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50" />
                </form>
              </Form>
            </>
          )}

          {/* ------- TAB 2 ------- */}
          {activeTab === "join_code" && (
            <>
              <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
                {t('guards.new.join_code.description')}
              </p>

              {/* OTP + copiar/regenerar */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <InputOTP maxLength={6} value={codeValue} onChange={(v) => setJoinValue("code", v)}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                <Button type="button" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(codeValue); toast.success(t('guards.new.join_code.copied')); }}>
                  {t('guards.new.actions.copy')}
                </Button>
                <Button type="button" variant="ghost" onClick={regenCode}><RefreshCcw className="h-5 w-5" /></Button>
              </div>

              <Form {...joinForm}>
                <form className="mt-8 grid gap-8 border-t pt-8" onSubmit={submitJoin(onSubmitJoin)}>
                  {joinFields.map((f, idx) => (
                    <FormBlock key={f.id}>
                      <FormField control={joinCtrl} name={`entries.${idx}.phone`} render={({ field }) => (
                        <FormItem className="max-w-2xl">
                          <FormLabel>{t('guards.new.form.contactSms')}</FormLabel>
                          <FormControl><Input placeholder={t('guards.new.form.contactPhSms')} {...field} /></FormControl>
                          <FormDescription>{t('guards.new.form.contactPhSms')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="mt-4 flex items-center gap-3">
                        <AddBlockButton onClick={() => joinAppend(blankJoinEntry())} />
                        {joinFields.length > 1 && <RemoveBlockButton onConfirm={() => joinRemove(idx)} />}
                      </div>
                    </FormBlock>
                  ))}

                  <SubmitBar primaryLabel={t('guards.new.form.send')} loading={joinState.isSubmitting} onPrimary={submitJoin(onSubmitJoin)} primaryClassName="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50" />
                </form>
              </Form>
            </>
          )}

          {/* ------- TAB 3 ------- */}
          {activeTab === "invite_link" && (
            <>
              <p className="mt-8 text-center text-sm text-muted-foreground">{t('guards.new.link.description')}</p>

              <div className="mt-4 flex items-center justify-center">
                <Copyable text={linkValue} />
              </div>

              <Form {...linkForm}>
                <form className="mt-8 grid gap-8 border-t pt-8" onSubmit={submitLink(onSubmitLink)}>
                  {linkFields.map((f, idx) => (
                    <FormBlock key={f.id}>
                      <FormField control={linkCtrl} name={`entries.${idx}.phone`} render={({ field }) => (
                        <FormItem className="max-w-2xl">
                          <FormLabel>{t('guards.new.form.contactSms')}</FormLabel>
                          <FormControl><Input placeholder={t('guards.new.form.contactPhSms')} {...field} /></FormControl>
                          <FormDescription>{t('guards.new.form.contactPhSms')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="mt-4 flex items-center gap-3">
                        <AddBlockButton onClick={() => linkAppend(blankLinkEntry())} />
                        {linkFields.length > 1 && <RemoveBlockButton onConfirm={() => linkRemove(idx)} />}
                      </div>
                    </FormBlock>
                  ))}

                  <SubmitBar primaryLabel={t('guards.new.form.send')} loading={linkState.isSubmitting} onPrimary={submitLink(onSubmitLink)} primaryClassName="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50" />
                </form>
              </Form>
            </>
          )}

          {/* ------- TAB 4 ------- */}
          {activeTab === "create_profile" && (
            <>
              <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
                {t('guards.new.create.description')}
              </p>

              <Form {...createForm}>

                <form className="mt-8 grid gap-6" onSubmit={submitCreate(onSubmitCreate)}>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField control={createCtrl} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>{t('guards.new.form.firstName')}</FormLabel><FormControl><Input placeholder={t('guards.new.form.firstNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createCtrl} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>{t('guards.new.form.lastName')}</FormLabel><FormControl><Input placeholder={t('guards.new.form.lastNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField control={createCtrl} name="email" render={({ field }) => (
                      <FormItem><FormLabel>{t('guards.new.form.contactEmail')}</FormLabel><FormControl><Input placeholder={t('guards.new.form.contactPhEmail')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createCtrl} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('guards.new.form.contactSms')}</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value || ""}
                            onChange={(val: string) => field.onChange(val)}
                            placeholder={t('guards.new.form.contactPhSms')}
                          />
                        </FormControl>
                        <FormDescription>{t('guards.new.form.contactPhSms')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField control={createCtrl} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('guards.new.form.password')}</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showCreatePassword ? "text" : "password"}
                              placeholder={t('guards.new.form.passwordPlaceholder')}
                              {...field}
                              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
                            />
                          </FormControl>
                          <button
                            type="button"
                            aria-label={showCreatePassword ? t('guards.new.actions.hide_password') : t('guards.new.actions.show_password')}
                            onClick={() => setShowCreatePassword((s) => !s)}
                            className="absolute right-3 top-0 bottom-0 h-12 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
                          >
                            {showCreatePassword ? <EyeOff className="h-6 w-6 translate-y-1" /> : <Eye className="h-6 w-6 translate-y-1" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={createCtrl} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('guards.new.form.confirmPassword')}</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showCreateConfirm ? "text" : "password"}
                              placeholder={t('guards.new.form.confirmPasswordPlaceholder')}
                              {...field}
                              className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
                            />
                          </FormControl>
                          <button
                            type="button"
                            aria-label={showCreateConfirm ? t('guards.new.actions.hide_confirm_password') : t('guards.new.actions.show_confirm_password')}
                            onClick={() => setShowCreateConfirm((s) => !s)}
                            className="absolute right-3 top-0 bottom-0 h-12 flex items-center justify-center px-2 text-slate-500 hover:text-slate-700"
                          >
                            {showCreateConfirm ? <EyeOff className="h-6 w-6 translate-y-1" /> : <Eye className="h-6 w-6 translate-y-1" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField control={createCtrl} name="clientId" render={({ field }) => (
                      <FormItem><FormLabel>{t('guards.new.form.selectClient')}</FormLabel><MultiCombobox value={field.value || []} onChange={(v) => field.onChange(v)} options={clientOptions} placeholder={t('guards.new.form.selectClient')} aria-label={t('guards.new.form.selectClient')} /><FormMessage /></FormItem>
                    )} />
                    <FormField control={createCtrl} name="postSiteId" render={({ field }) => (
                      <FormItem><FormLabel>{t('guards.new.form.assignPostSite')}</FormLabel><MultiCombobox value={field.value || []} onChange={(v) => field.onChange(v)} options={createSiteOptions} placeholder={t('guards.new.form.assignPostSite')} aria-label={t('guards.new.form.assignPostSite')} /><FormMessage /></FormItem>
                    )} />
                  </div>

                  <SubmitBar
                    primaryLabel={t('guards.new.form.create_and_send')}
                    loading={createState.isSubmitting}
                    onPrimary={() => { createIntentRef.current = "create_send"; submitCreate(onSubmitCreate)(); }}
                    primaryClassName="bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                  />
                </form>
              </Form>
            </>
          )}
        </GuardTabsHeader>
      </div>
    </AppLayout>
  );
}
