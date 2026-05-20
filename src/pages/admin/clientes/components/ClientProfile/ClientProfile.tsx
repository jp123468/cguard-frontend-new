import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClientForm from '@/pages/admin/clientes/ClientForm';
import { useEffect, useState as useStateReact } from 'react';
import { categoryService } from '@/lib/api/categoryService';
import { Button } from '@/components/ui/button';
// MobileCardList removed: render full details on mobile for complete info
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';

export default function ClientProfile({ client }: { client: any }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [buttonFading, setButtonFading] = useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [categoryNames, setCategoryNames] = useStateReact<string[] | null>(null);

  if (!client) return null;

  useEffect(() => {
    let mounted = true;
    async function loadCategoryNames() {
      try {
        // Always attempt to resolve categoryIds to names by requesting categories
        const ids = client?.categoryIds;
        // If there are no category ids, try client.categoryNames or set empty
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          if (client?.categoryNames && Array.isArray(client.categoryNames)) {
            if (mounted) setCategoryNames(client.categoryNames.map(String));
            return;
          }
          if (mounted) setCategoryNames([]);
          return;
        }

        // Load all categories for clientAccount and map locally
        const resp = await categoryService.list({ filter: { module: 'clientAccount' }, limit: 1000 });
        const map = new Map<string, string>();
        (resp.rows || []).forEach((c) => map.set(String(c.id), c.name || ''));
        const names = ids.map((id: any) => map.get(String(id)) || '').filter(Boolean);
        // If mapping produced no names, fallback to any provided client.categoryNames or the raw ids
        if (mounted) {
          if (names.length > 0) setCategoryNames(names);
          else if (client?.categoryNames && Array.isArray(client.categoryNames) && client.categoryNames.length) setCategoryNames(client.categoryNames.map(String));
          else setCategoryNames(ids.map(String));
        }
      } catch (e) {
        if (mounted) setCategoryNames((client?.categoryNames && Array.isArray(client.categoryNames)) ? client.categoryNames.map(String) : (client?.categoryIds && Array.isArray(client.categoryIds) ? client.categoryIds.map(String) : []));
      }
    }

    loadCategoryNames();
    return () => { mounted = false; };
  }, [client]);

  // Ensure this component's container is scrolled to the top when mounted/shown
  useScrollToTopOnMount(containerRef);

  return (
    <div ref={containerRef} className="p-4 bg-card border rounded-md">
      <div className="mb-4">
        <h3 className="text-2xl font-semibold">{t('clients.nav.profile') || 'Perfil'}</h3>
      </div>

      {editing ? (
        <div>
          <ClientForm
            mode="edit"
            id={client.id}
            onSaved={({ id, data }) => {
              try {
                if (data && typeof data === 'object') Object.assign(client, data);
              } catch (e) {
                // ignore merge errors
              }
              setEditing(false);
            }}
            keepOnSave={true}
            onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {/* Mobile: show full client details (same fields as desktop) */}
          <div className="md:hidden">
            <div className="bg-card border rounded-md p-4 space-y-4">
              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.name', 'Nombre')}</p>
                <p className="text-lg text-foreground">{client.name || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.lastName', 'Apellidos')}</p>
                <p className="text-lg text-foreground">{client.lastName || '-'}</p>
              </div>

              {client.commercialName && (
              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.commercialName', 'Nombre comercial')}</p>
                <p className="text-lg text-foreground">{client.commercialName}</p>
              </div>
              )}

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.email', 'Email')}</p>
                <p className="text-lg text-foreground">{client.email || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.personType', 'Tipo de persona')}</p>
                <p className="text-lg text-foreground">{client.personType === 'PJ' ? t('clients.form.personJuridica', 'Persona jurídica (RUC)') : t('clients.form.personNatural', 'Persona natural (Cédula)')}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{client.personType === 'PJ' ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')}</p>
                <p className="text-lg text-foreground">{client.documentNumber || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.phone', 'Teléfono')}</p>
                <p className="text-lg text-foreground">{client.phoneNumber || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.address', 'Dirección')}</p>
                <p className="text-lg text-foreground">{client.address || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.addressLine2', 'Dirección Complementaria')}</p>
                <p className="text-lg text-foreground">{client.addressLine2 || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.postalCode', 'Código postal')}</p>
                <p className="text-lg text-foreground">{client.postalCode || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.city', 'Ciudad')}</p>
                <p className="text-lg text-foreground">{client.city || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.country', 'País')}</p>
                <p className="text-lg text-foreground">{client.country || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.fax', 'Landline')}</p>
                <p className="text-lg text-foreground">{client.landline || client.faxNumber || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.website', 'Website')}</p>
                <p className="text-lg text-foreground">{client.website || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.latitude', 'Latitud')}</p>
                <p className="text-lg text-foreground">{client.latitude ?? client.lat ?? '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.longitude', 'Longitud')}</p>
                <p className="text-lg text-foreground">{client.longitude ?? client.lng ?? '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.active', 'Activo')}</p>
                <p className="text-lg text-foreground">{client.active === false ? 'No' : client.active === true ? 'Sí' : '-'}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70">{t('clients.form.categories', 'Sectores')}</p>
                <p className="text-lg text-foreground">{(categoryNames && categoryNames.length) ? categoryNames.join(', ') : ((client.categoryNames && client.categoryNames.length) ? client.categoryNames.join(', ') : ((client.categoryIds && client.categoryIds.length) ? client.categoryIds.join(', ') : '-'))}</p>
              </div>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.name', 'Nombre')}</p>
              <p className="text-lg text-foreground">{client.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.lastName', 'Apellidos')}</p>
              <p className="text-lg text-foreground">{client.lastName || '-'}</p>
            </div>
            {client.commercialName && (
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.commercialName', 'Nombre comercial')}</p>
              <p className="text-lg text-foreground">{client.commercialName}</p>
            </div>
            )}
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.email', 'Email')}</p>
              <p className="text-lg text-foreground">{client.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.personType', 'Tipo de persona')}</p>
              <p className="text-lg text-foreground">{client.personType === 'PJ' ? t('clients.form.personJuridica', 'Persona jurídica (RUC)') : t('clients.form.personNatural', 'Persona natural (Cédula)')}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{client.personType === 'PJ' ? t('clients.form.ruc', 'RUC') : t('clients.form.cedula', 'Cédula')}</p>
              <p className="text-lg text-foreground">{client.documentNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.phone', 'Teléfono')}</p>
              <p className="text-lg text-foreground">{client.phoneNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.address', 'Dirección')}</p>
              <p className="text-lg text-foreground">{client.address || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.addressLine2', 'Dirección Complementaria')}</p>
              <p className="text-lg text-foreground">{client.addressLine2 || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.postalCode', 'Código postal')}</p>
              <p className="text-lg text-foreground">{client.postalCode || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.city', 'Ciudad')}</p>
              <p className="text-lg text-foreground">{client.city || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.country', 'País')}</p>
              <p className="text-lg text-foreground">{client.country || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.fax', 'Landline')}</p>
              <p className="text-lg text-foreground">{client.landline || client.faxNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.website', 'Website')}</p>
              <p className="text-lg text-foreground">{client.website || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.latitude', 'Latitud')}</p>
              <p className="text-lg text-foreground">{client.latitude ?? client.lat ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.longitude', 'Longitud')}</p>
              <p className="text-lg text-foreground">{client.longitude ?? client.lng ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.active', 'Activo')}</p>
              <p className="text-lg text-foreground">{client.active === false ? 'No' : client.active === true ? 'Sí' : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/70">{t('clients.form.categories', 'Sectores')}</p>
              <p className="text-lg text-foreground">{(categoryNames && categoryNames.length) ? categoryNames.join(', ') : ((client.categoryNames && client.categoryNames.length) ? client.categoryNames.join(', ') : ((client.categoryIds && client.categoryIds.length) ? client.categoryIds.join(', ') : '-'))}</p>
            </div>
          </div>
        </>
      )}
      {/* Edit toggle at the bottom */}
      <div className="mt-6 flex justify-end">
        {(!editing || buttonFading) && (
          <Button
            type="button"
            onClick={() => {
              setButtonFading(true);
              setTimeout(() => {
                setEditing(true);
                // scroll the closest scrollable ancestor so the form appears at top
                try {
                  const el = containerRef.current;
                  const findScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
                    if (!node) return window;
                    let parent: HTMLElement | null = node.parentElement;
                    while (parent) {
                      const style = window.getComputedStyle(parent);
                      const overflowY = style.getPropertyValue('overflow-y');
                      if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent;
                      parent = parent.parentElement;
                    }
                    return window;
                  };
                  const sp = findScrollParent(el);
                  if (sp === window) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    (sp as HTMLElement).scrollTo({ top: (el ? el.offsetTop : 0), behavior: 'smooth' });
                  }
                } catch (e) {}
                setButtonFading(false);
              }, 300);
            }}
            className={`min-w-28 text-base bg-[#FE6F02] text-white  cursor-pointer border border-[#FE6F02] px-4 py-2 hover:bg-[#e65b00] transition-opacity duration-300 ${buttonFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {t('actions.edit', 'Editar')}
          </Button>
        )}
      </div>
      <div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div>{t('profile.createdAt', 'Fecha de creación')}: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}</div>
          <div>{t('profile.updatedAt', 'Última actualización')}: {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '-'}</div>
        </div>
      </div>
    </div>
  );
}
