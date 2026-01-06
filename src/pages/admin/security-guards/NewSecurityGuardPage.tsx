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
import { Copyable } from "@/components/app/copyable";
import { AddBlockButton, RemoveBlockButton } from "@/components/app/add-remove";
import { SubmitBar } from "@/components/app/submit-bar";
import { clientService } from "@/lib/api/clientService";
import { securityGuardService } from "@/lib/api/securityGuardService";
import { postSiteService } from "@/lib/api/postSiteService";
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

// Helpers
const blankInviteEntry = (inviteBy: GuardEntryValues["inviteBy"] = "Correo Electrónico"): GuardEntryValues => ({
  firstName: "", lastName: "", inviteBy, contact: "", clientId: "", postSiteId: "",
});
const blankJoinEntry = (): JoinByCodeEntry => ({ phone: "" });
const blankLinkEntry = (): InviteByLinkEntry => ({ phone: "" });
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

type TabKey = "invite" | "join_code" | "invite_link" | "create_profile";

export default function NewSecurityGuardPage() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission('securityGuardCreate')) {
      toast.error('No tienes permiso para crear guardias');
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
        toast.error("No se pudieron cargar clientes o sitios");
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
        clientId: e.clientId,
        postSiteId: e.postSiteId,
        // backend may expect `phoneNumber` or `email` fields rather than a generic `contact`
        phoneNumber: e.inviteBy === "SMS" ? e.contact : undefined,
        email: e.inviteBy === "Correo Electrónico" ? e.contact : undefined,
        inviteBy: e.inviteBy,
      }));
      await securityGuardService.invite(payload);
      console.log('[NewSecurityGuardPage] invite response: sent')
      toast.success("Invitaciones enviadas");
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] invite error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setInviteError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? "Error al enviar invitaciones");
      } catch (ex) {
        toast.error(e?.message ?? "Error al enviar invitaciones");
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
      toast.success("Invitación enviada por código");
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] joinByCode error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setJoinError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? "Error al enviar invitación por código");
      } catch (ex) {
        toast.error(e?.message ?? "Error al enviar invitación por código");
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
      toast.success("Invitación por enlace enviada");
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] inviteByLink error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setLinkError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? "Error al enviar invitación por enlace");
      } catch (ex) {
        toast.error(e?.message ?? "Error al enviar invitación por enlace");
      }
    }
  };

  /* ============== TAB 4: CREAR PERFIL ============== */
  const createIntentRef = useRef<"create" | "create_send">("create");
  const createForm = useForm<CreateProfileValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "", clientId: "", postSiteId: "" },
    mode: "onTouched",
  });
  const { control: createCtrl, handleSubmit: submitCreate, formState: createState, setError: setCreateError } = createForm;

  const onSubmitCreate = async (v: CreateProfileValues) => {
    try {
      console.log('[NewSecurityGuardPage] createProfile payload ->', v, 'intent:', createIntentRef.current)
      await securityGuardService.create(v);
      console.log('[NewSecurityGuardPage] createProfile response: created')
      if (createIntentRef.current === "create_send") {
        toast.success("Perfil creado y enviado");
      } else {
        toast.success("Perfil creado");
      }
    } catch (e: any) {
      console.error('[NewSecurityGuardPage] createProfile error <-', e)
      try {
        const { applyValidationErrorsToForm } = await import('@/lib/utils/formErrorMapper');
        const result = applyValidationErrorsToForm(e, setCreateError as any);
        const msgs = Array.isArray(result) ? result : result.messages;
        if (msgs && msgs.length > 0) msgs.forEach((m) => toast.error(m));
        else toast.error(e?.message ?? "Error al crear perfil");
      } catch (ex) {
        toast.error(e?.message ?? "Error al crear perfil");
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

  const createSiteOptions = createClientId ? (sites.filter((s: any) => matchesClient(s, createClientId)).map((s: any) => ({ value: s.id, label: s.name }))) : [];

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: "Panel de control", path: "/dashboard" }, { label: "Nuevo Guardia" }]} />

      <div className="p-4">
        <GuardTabsHeader value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        {/* ------- TAB 1 ------- */}
        {activeTab === "invite" && (
          <>
            <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
              Ingrese el nombre, correo electrónico/número de móvil del guardia. Se enviará un mensaje con un enlace.
            </p>
            <Form {...inviteForm}>
              <form className="mt-6 grid gap-8" onSubmit={submitInvite(onSubmitInvite)}>
                {inviteFields.map((f, idx) => {
                  const inviteBy = inviteEntries?.[idx]?.inviteBy ?? "Correo Electrónico";
                  const contactLabel = inviteBy === "SMS" ? "Número de Móvil *" : "Correo Electrónico *";
                  const contactPh = inviteBy === "SMS" ? "e.g. +12015550123" : "e.g. persona@correo.com";

                  return (
                    <FormBlock key={f.id}>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <FormField control={inviteCtrl} name={`entries.${idx}.firstName`} render={({ field }) => (
                          <FormItem><FormLabel>Nombre*</FormLabel><FormControl><Input placeholder="Nombre*" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={inviteCtrl} name={`entries.${idx}.lastName`} render={({ field }) => (
                          <FormItem><FormLabel>Apellido*</FormLabel><FormControl><Input placeholder="Apellido*" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={inviteCtrl} name={`entries.${idx}.inviteBy`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invitar Por*</FormLabel>
                            <Select value={field.value} onValueChange={(v) => { field.onChange(v); setInviteValue(`entries.${idx}.contact`, ""); }}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger></FormControl>
                              <SelectContent>{inviteByOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
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
                            {inviteBy === "SMS" && <FormDescription>e.g. +12015550123</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={inviteCtrl} name={`entries.${idx}.clientId`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seleccionar Cliente</FormLabel>
                            <Combobox value={field.value} onChange={field.onChange} options={clientOptions} placeholder="Seleccionar Cliente" aria-label="Seleccionar Cliente" />
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={inviteCtrl} name={`entries.${idx}.postSiteId`} render={({ field }) => {
                          const entryClientId = inviteEntries?.[idx]?.clientId;
                          const optionsForEntry = entryClientId ? sites.filter((s: any) => matchesClient(s, entryClientId)).map((s: any) => ({ value: s.id, label: s.name })) : [];
                          return (
                            <FormItem>
                              <FormLabel>Asignar Sitio de Publicación</FormLabel>
                              <Combobox value={field.value} onChange={field.onChange} options={optionsForEntry} placeholder="Asignar Sitio de Publicación" aria-label="Asignar Sitio de Publicación" />
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

                <SubmitBar primaryLabel="Enviar" loading={inviteState.isSubmitting} onPrimary={submitInvite(onSubmitInvite)} />
              </form>
            </Form>
          </>
        )}

        {/* ------- TAB 2 ------- */}
        {activeTab === "join_code" && (
          <>
            <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
              Comparta el código único de la compañía junto con el enlace para descargar la aplicación.
            </p>

            {/* OTP + copiar/regenerar */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <InputOTP maxLength={6} value={codeValue} onChange={(v) => setJoinValue("code", v)}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
              <Button type="button" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(codeValue); toast.success("Código copiado"); }}>
                Copiar
              </Button>
              <Button type="button" variant="ghost" onClick={regenCode}><RefreshCcw className="h-5 w-5" /></Button>
            </div>

            <Form {...joinForm}>
              <form className="mt-8 grid gap-8 border-t pt-8" onSubmit={submitJoin(onSubmitJoin)}>
                {joinFields.map((f, idx) => (
                  <FormBlock key={f.id}>
                    <FormField control={joinCtrl} name={`entries.${idx}.phone`} render={({ field }) => (
                      <FormItem className="max-w-2xl">
                        <FormLabel>Número de Móvil *</FormLabel>
                        <FormControl><Input placeholder="e.g. +12015550123" {...field} /></FormControl>
                        <FormDescription>e.g. +12015550123</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="mt-4 flex items-center gap-3">
                      <AddBlockButton onClick={() => joinAppend(blankJoinEntry())} />
                      {joinFields.length > 1 && <RemoveBlockButton onConfirm={() => joinRemove(idx)} />}
                    </div>
                  </FormBlock>
                ))}

                <SubmitBar primaryLabel="Enviar" loading={joinState.isSubmitting} onPrimary={submitJoin(onSubmitJoin)} />
              </form>
            </Form>
          </>
        )}

        {/* ------- TAB 3 ------- */}
        {activeTab === "invite_link" && (
          <>
            <p className="mt-8 text-center text-sm text-muted-foreground">Comparta este enlace para unirse a la empresa.</p>

            <div className="mt-4 flex items-center justify-center">
              <Copyable text={linkValue} />
            </div>

            <Form {...linkForm}>
              <form className="mt-8 grid gap-8 border-t pt-8" onSubmit={submitLink(onSubmitLink)}>
                {linkFields.map((f, idx) => (
                  <FormBlock key={f.id}>
                    <FormField control={linkCtrl} name={`entries.${idx}.phone`} render={({ field }) => (
                      <FormItem className="max-w-2xl">
                        <FormLabel>Número de Móvil *</FormLabel>
                        <FormControl><Input placeholder="e.g. +12015550123" {...field} /></FormControl>
                        <FormDescription>e.g. +12015550123</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="mt-4 flex items-center gap-3">
                      <AddBlockButton onClick={() => linkAppend(blankLinkEntry())} />
                      {linkFields.length > 1 && <RemoveBlockButton onConfirm={() => linkRemove(idx)} />}
                    </div>
                  </FormBlock>
                ))}

                <SubmitBar primaryLabel="Enviar" loading={linkState.isSubmitting} onPrimary={submitLink(onSubmitLink)} />
              </form>
            </Form>
          </>
        )}

        {/* ------- TAB 4 ------- */}
        {activeTab === "create_profile" && (
          <>
            <p className="mt-8 max-w-5xl text-sm text-muted-foreground">
              Cree manualmente el perfil del guardia. Deberá validar su correo y número móvil antes de iniciar sesión.
            </p>

            <Form {...createForm}>
              
              <form className="mt-8 grid gap-6" onSubmit={submitCreate(onSubmitCreate)}>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={createCtrl} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Nombre *" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createCtrl} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input placeholder="Apellido *" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={createCtrl} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Correo Electrónico *</FormLabel><FormControl><Input placeholder="Correo Electrónico *" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createCtrl} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Número de Móvil *</FormLabel><FormControl><Input placeholder="e.g. +12015550123" {...field} /></FormControl><FormDescription>e.g. +12015550123</FormDescription><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={createCtrl} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showCreatePassword ? "text" : "password"}
                            placeholder="Contraseña *"
                            {...field}
                            className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          aria-label={showCreatePassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                      <FormLabel>Confirmar Contraseña *</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showCreateConfirm ? "text" : "password"}
                            placeholder="Confirmar Contraseña *"
                            {...field}
                            className="w-full h-12 rounded-lg border border-slate-200 px-4 pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          aria-label={showCreateConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                    <FormItem><FormLabel>Seleccionar Cliente</FormLabel><Combobox value={field.value} onChange={field.onChange} options={clientOptions} placeholder="Seleccionar Cliente" aria-label="Seleccionar Cliente" /><FormMessage /></FormItem>
                  )} />
                  <FormField control={createCtrl} name="postSiteId" render={({ field }) => (
                    <FormItem><FormLabel>Asignar Sitio de Publicación</FormLabel><Combobox value={field.value} onChange={field.onChange} options={createSiteOptions} placeholder="Asignar Sitio de Publicación" aria-label="Asignar Sitio de Publicación" /><FormMessage /></FormItem>
                  )} />
                </div>

                <SubmitBar
                  primaryLabel="Crear y Enviar"
                  secondaryLabel="Crear"
                  loading={createState.isSubmitting}
                  onSecondary={() => { createIntentRef.current = "create"; submitCreate(onSubmitCreate)(); }}
                  onPrimary={() => { createIntentRef.current = "create_send"; submitCreate(onSubmitCreate)(); }}
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
