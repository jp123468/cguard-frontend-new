import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, MessageSquare, Wallet, Plus, RefreshCw, AlertTriangle, CheckCircle2, Phone, Search } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, Section, StatCard, Stagger, StatusBadge, EmptyState, Modal } from "@/components/kit";
import { smsAccountService, SmsAccount, SmsTransaction, AvailableNumber } from "@/lib/api/smsAccountService";

const COUNTRIES = [
  { code: "US", label: "Estados Unidos (+1)" },
  { code: "CA", label: "Canadá (+1)" },
  { code: "GB", label: "Reino Unido (+44)" },
  { code: "ES", label: "España (+34)" },
];

const PRESETS = [10, 25, 50, 100];

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency }).format((cents || 0) / 100);
}

function fmtDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-ES", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function SmsBalancePage() {
  const { t } = useTranslation();
  const [account, setAccount] = useState<SmsAccount | null>(null);
  const [transactions, setTransactions] = useState<SmsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [amount, setAmount] = useState<number>(25);

  // Buy-number modal state
  const [buyOpen, setBuyOpen] = useState(false);
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await smsAccountService.get();
      setAccount(res.account);
      setTransactions(res.transactions || []);
    } catch {
      toast.error(t("sms.loadError", { defaultValue: "No se pudo cargar la cuenta SMS" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Returning from Stripe checkout: refresh to reflect the new balance.
    const params = new URLSearchParams(window.location.search);
    if (params.get("recharge") === "success") {
      toast.success(t("sms.rechargeSuccess", { defaultValue: "Pago recibido. Tu saldo se actualizará en unos segundos." }));
      setTimeout(load, 4000);
    } else if (params.get("recharge") === "cancel") {
      toast.info(t("sms.rechargeCancel", { defaultValue: "Recarga cancelada" }));
    }
    // eslint-disable-next-line
  }, []);

  const onProvision = async () => {
    setProvisioning(true);
    try {
      const res = await smsAccountService.provision();
      setAccount(res.account);
      toast.success(t("sms.provisioned", { defaultValue: "Subcuenta SMS creada" }));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t("sms.provisionError", { defaultValue: "No se pudo crear la subcuenta" }));
    } finally {
      setProvisioning(false);
    }
  };

  const onRecharge = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 500 || cents > 100000) {
      toast.error(t("sms.amountError", { defaultValue: "Ingresa un monto entre $5 y $1000" }));
      return;
    }
    setRecharging(true);
    try {
      const res = await smsAccountService.recharge(cents);
      if (res?.url) {
        window.location.href = res.url; // redirect to Stripe Checkout
      } else {
        toast.error(t("sms.rechargeError", { defaultValue: "No se pudo iniciar la recarga" }));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t("sms.rechargeError", { defaultValue: "No se pudo iniciar la recarga" }));
    } finally {
      setRecharging(false);
    }
  };

  const openBuy = () => {
    setNumbers([]);
    setAreaCode("");
    setBuyOpen(true);
  };

  const searchNumbers = async () => {
    setSearching(true);
    try {
      const res = await smsAccountService.availableNumbers({ country, areaCode: areaCode || undefined });
      setNumbers(res.numbers || []);
      if (!res.numbers?.length) {
        toast.info(t("sms.noNumbers", { defaultValue: "No se encontraron números con esos criterios" }));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t("sms.searchError", { defaultValue: "No se pudo buscar números" }));
    } finally {
      setSearching(false);
    }
  };

  const buyNumber = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    try {
      const res = await smsAccountService.buyNumber(phoneNumber);
      setAccount(res.account);
      setBuyOpen(false);
      toast.success(t("sms.numberBought", { defaultValue: "Número adquirido y asignado" }));
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t("sms.buyError", { defaultValue: "No se pudo adquirir el número" }));
    } finally {
      setBuying(null);
    }
  };

  const currency = account?.currency || "USD";
  const perSms = account ? account.pricePerSmsCents : 5;
  const remainingSms = account && perSms > 0 ? Math.floor((account.balanceCents || 0) / perSms) : 0;

  return (
    <AppLayout>
      <SettingsLayout navKey="configuracion" title={t("settings.configuracion.sms", { defaultValue: "Saldo SMS" })}>
        <PageContainer width="narrow">
          <PageHeader
            icon={<MessageSquare />}
            title={t("settings.configuracion.sms", { defaultValue: "Saldo SMS" })}
            subtitle={t("sms.balanceTitle", { defaultValue: "Saldo de mensajería SMS" })}
            actions={
              !loading ? (
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw size={14} className="mr-1.5" /> {t("sms.refresh", { defaultValue: "Actualizar" })}
                </Button>
              ) : undefined
            }
          />
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance */}
              <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  label={t("sms.balanceTitle", { defaultValue: "Saldo de mensajería SMS" })}
                  value={money(account?.balanceCents || 0, currency)}
                  icon={<Wallet />}
                  accent="primary"
                  hint={`${money(perSms, currency)} ${t("sms.perSms", { defaultValue: "por SMS" })}`}
                />
                <StatCard
                  label={t("sms.messages", { defaultValue: "mensajes" })}
                  value={`≈ ${remainingSms.toLocaleString("es-ES")}`}
                  icon={<MessageSquare />}
                  accent="green"
                />
              </Stagger>

              {/* Subaccount status */}
              <Section title={t("sms.accountTitle", { defaultValue: "Cuenta de envío (Twilio)" })} icon={<MessageSquare />}>
                <div className="space-y-3">
                  {!account?.platformConfigured && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-700">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>{t("sms.notConfigured", { defaultValue: "La mensajería SMS aún no está habilitada en la plataforma. Puedes recargar saldo; el envío se activará en cuanto la plataforma habilite Twilio." })}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("sms.subaccount", { defaultValue: "Subcuenta dedicada" })}</span>
                    {account?.provisioned ? (
                      <StatusBadge tone="green">
                        <CheckCircle2 size={12} /> {account.subaccountSid?.slice(0, 10)}…
                      </StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">{t("sms.notProvisioned", { defaultValue: "No creada" })}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("sms.sender", { defaultValue: "Número remitente" })}</span>
                    <span className="text-foreground">{account?.phoneNumber || t("sms.noSender", { defaultValue: "Pendiente" })}</span>
                  </div>

                  {!account?.provisioned && (
                    <Button
                      variant="brand"
                      onClick={onProvision}
                      disabled={provisioning || !account?.platformConfigured}
                    >
                      {provisioning ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Plus className="mr-2" size={16} />}
                      {t("sms.createSubaccount", { defaultValue: "Crear subcuenta SMS" })}
                    </Button>
                  )}

                  {account?.provisioned && !account?.hasSender && (
                    <Button
                      variant="brand"
                      onClick={openBuy}
                      disabled={!account?.platformConfigured}
                    >
                      <Phone className="mr-2" size={16} />
                      {t("sms.buyNumber", { defaultValue: "Comprar número" })}
                    </Button>
                  )}
                </div>
              </Section>

              {/* Recharge */}
              <Section title={t("sms.rechargeTitle", { defaultValue: "Recargar saldo" })} icon={<Wallet />}>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setAmount(p)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          amount === p ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted/30"
                        }`}
                      >
                        ${p}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="w-40">
                      <Label className="text-xs">{t("sms.customAmount", { defaultValue: "Monto (USD)" })}</Label>
                      <Input
                        type="number"
                        min={5}
                        max={1000}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={onRecharge} disabled={recharging} className="bg-[#f36a6d] text-white hover:bg-[#e85b5f]">
                      {recharging ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Plus className="mr-2" size={16} />}
                      {t("sms.recharge", { defaultValue: "Recargar" })}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("sms.rechargeHint", { defaultValue: "Pago seguro con tarjeta vía Stripe. El saldo se acredita automáticamente al confirmarse el pago." })}
                  </p>
                </div>
              </Section>

              {/* Transactions */}
              <Section title={t("sms.history", { defaultValue: "Movimientos" })} icon={<Wallet />}>
                {transactions.length === 0 ? (
                  <EmptyState
                    icon={<Wallet />}
                    title={t("sms.noHistory", { defaultValue: "Sin movimientos todavía" })}
                  />
                ) : (
                  <div className="divide-y">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</p>
                        </div>
                        <div className={`shrink-0 text-sm font-semibold ${tx.amountCents >= 0 ? "text-green-700" : "text-foreground"}`}>
                          {tx.amountCents >= 0 ? "+" : "−"}{money(Math.abs(tx.amountCents), tx.currency || currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* Buy-number modal */}
          <Modal
            open={buyOpen}
            onOpenChange={(o) => { if (!buying) setBuyOpen(o); }}
            icon={<Phone />}
            title={t("sms.buyNumberTitle", { defaultValue: "Comprar número de envío" })}
          >
                <div className="space-y-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">{t("sms.country", { defaultValue: "País" })}</Label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">{t("sms.areaCode", { defaultValue: "Código de área" })}</Label>
                      <Input value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="415" />
                    </div>
                    <Button onClick={searchNumbers} disabled={searching} variant="outline">
                      {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    </Button>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg border">
                    {numbers.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">
                        {t("sms.searchPrompt", { defaultValue: "Busca números disponibles para comprar." })}
                      </p>
                    ) : (
                      <div className="divide-y">
                        {numbers.map((n) => (
                          <div key={n.phoneNumber} className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{n.phoneNumber}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[n.locality, n.region, n.isoCountry].filter(Boolean).join(", ")}
                              </p>
                            </div>
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => buyNumber(n.phoneNumber)}
                              disabled={!!buying}
                            >
                              {buying === n.phoneNumber ? <Loader2 className="animate-spin" size={14} /> : t("sms.buy", { defaultValue: "Comprar" })}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("sms.buyNumberHint", { defaultValue: "El número se adquiere dentro de tu subcuenta y queda como remitente para tus SMS. Algunos países requieren documentación regulatoria de Twilio." })}
                  </p>
                </div>
          </Modal>
        </PageContainer>
      </SettingsLayout>
    </AppLayout>
  );
}
