import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/SettingsLayout";
import IntegrationCard from "./IntegrationCard";

const INTEGRATIONS = [
    { image: "https://app.guardspro.com/assets/icons/custom/logo-qb.png", title: "QuickBooks", subtitle: "QuickBooks Online", slug: "quickbooks-online", active: true },
    { image: "https://app.guardspro.com/assets/icons/custom/adpworkforcenow.png", title: "ADP Workforce Now", subtitle: "ADP Workforce Now CSV", slug: "adp-workforce-now", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/paychex_logo.png", title: "Paychex", subtitle: "Paychex CSV", slug: "paychex-csv", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/gusto_logo.png", title: "Gusto", subtitle: "Gusto CSV", slug: "gusto-csv", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/xero_logo.png", title: "Xero", subtitle: "Xero (Reino Unido)", slug: "xero-uk", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/xero_logo.png", title: "Xero", subtitle: "Xero (AU)", slug: "xero-au", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/adp.svg", title: "ADP Run", subtitle: "ADP Run CSV", slug: "adp-run-csv", active: false },
    { image: "https://app.guardspro.com/assets/icons/custom/square_payroll_logo_light.png", title: "Square", subtitle: "Square", slug: "square-payroll", active: false },
];

export default function IntegrationsList() {
    return (
        <AppLayout>
            <SettingsLayout navKey="configuracion" title="Integraciones">
                <div className="space-y-6">
                    <p className="text-sm font-light">
                        Configure integraciones para ahorrar tiempo en la gestión de usuarios y exportación de
                        nómina. Explore nuestras integraciones para ver lo que está disponible o gestione sus
                        integraciones existentes a continuación. Siempre estamos trabajando en agregar nuevas
                        integraciones, así que vuelva de vez en cuando.
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {INTEGRATIONS.map((it) => (
                            <IntegrationCard
                                key={`${it.title}-${it.subtitle}`}
                                image={it.image}
                                title={it.title}
                                subtitle={it.subtitle}
                                active={it.active}
                                href={`/setting/integracion/${it.slug}`}
                            />
                        ))}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
