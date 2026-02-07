import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClientForm from '@/pages/admin/clientes/ClientForm';
import { useEffect, useState as useStateReact } from 'react';
import { categoryService } from '@/lib/api/categoryService';
import { Button } from '@/components/ui/button';

export default function ClientProfile({ client }: { client: any }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [buttonFading, setButtonFading] = useState(false);
  const [categoryNames, setCategoryNames] = useStateReact<string[] | null>(null);

  if (!client) return null;

  useEffect(() => {
    let mounted = true;
    async function loadCategoryNames() {
      try {
        // If API already provided categoryNames, use them
        if (client?.categoryNames && Array.isArray(client.categoryNames) && client.categoryNames.length) {
          if (mounted) setCategoryNames(client.categoryNames.map(String));
          return;
        }

        const ids = client?.categoryIds;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          if (mounted) setCategoryNames([]);
          return;
        }

        // Load all categories for clientAccount and map locally
        const resp = await categoryService.list({ filter: { module: 'clientAccount' }, limit: 1000 });
        const map = new Map<string, string>();
        (resp.rows || []).forEach((c) => map.set(c.id, c.name));
        const names = ids.map((id: any) => map.get(String(id)) || String(id));
        if (mounted) setCategoryNames(names);
      } catch (e) {
        if (mounted) setCategoryNames((client?.categoryNames && Array.isArray(client.categoryNames)) ? client.categoryNames.map(String) : []);
      }
    }

    loadCategoryNames();
    return () => { mounted = false; };
  }, [client]);

  return (
    <><div className="p-4 bg-white border rounded-md">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.name', 'Nombre')}</p>
            <p className="text-lg text-gray-800">{client.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.lastName', 'Apellidos')}</p>
            <p className="text-lg text-gray-800">{client.lastName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.email', 'Email')}</p>
            <p className="text-lg text-gray-800">{client.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.phone', 'Teléfono')}</p>
            <p className="text-lg text-gray-800">{client.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.address', 'Dirección')}</p>
            <p className="text-lg text-gray-800">{client.address || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.addressLine2', 'Dirección Complementaria')}</p>
            <p className="text-lg text-gray-800">{client.addressLine2 || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.postalCode', 'Código postal')}</p>
            <p className="text-lg text-gray-800">{client.postalCode || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.city', 'Ciudad')}</p>
            <p className="text-lg text-gray-800">{client.city || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.country', 'País')}</p>
            <p className="text-lg text-gray-800">{client.country || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.fax', 'Fax')}</p>
            <p className="text-lg text-gray-800">{client.faxNumber || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.website', 'Website')}</p>
            <p className="text-lg text-gray-800">{client.website || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.latitude', 'Latitud')}</p>
            <p className="text-lg text-gray-800">{client.latitude ?? client.lat ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.longitude', 'Longitud')}</p>
            <p className="text-lg text-gray-800">{client.longitude ?? client.lng ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.active', 'Activo')}</p>
            <p className="text-lg text-gray-800">{client.active === false ? 'No' : client.active === true ? 'Sí' : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t('clients.form.categories', 'Categorías')}</p>
            <p className="text-lg text-gray-800">{(categoryNames && categoryNames.length) ? categoryNames.join(', ') : ((client.categoryNames && client.categoryNames.length) ? client.categoryNames.join(', ') : ((client.categoryIds && client.categoryIds.length) ? client.categoryIds.join(', ') : '-'))}</p>
          </div>
        </div>
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
                setButtonFading(false);
              }, 300);
            }}
            className={`min-w-28 text-base bg-[#FE6F02] text-white  cursor-pointer border border-[#FE6F02] px-4 py-2 hover:bg-[#e65b00] transition-opacity duration-300 ${buttonFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {t('actions.edit', 'Editar')}
          </Button>
        )}
      </div>
    </div>
      <div>
        <div className="mt-4 text-sm text-gray-500">
          <div>{t('profile.createdAt', 'Fecha de creación')}: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}</div>
          <div>{t('profile.updatedAt', 'Última actualización')}: {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '-'}</div>
        </div>
      </div></>
  );
}
