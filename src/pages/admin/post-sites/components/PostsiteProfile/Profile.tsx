import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import IncidentMap from "@/components/IncidentMap/IncidentMap";
import { categoryService } from '@/lib/api/categoryService';
import MobileCardList from '@/components/responsive/MobileCardList';

function formatDate(d?: string) {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleDateString();
    } catch {
        return d;
    }
}

export default function PostSiteProfile({ site }: { site?: any }) {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();

    const clientName = site?.client?.name || site?.clientAccount?.name || site?.clientAccountName || '-';
    const siteName = site?.companyName || site?.name || '-';
    const addedOn = formatDate(site?.createdAt || site?.created_at || site?.created_date);
    const address = site?.address || site?.secondAddress || '-';
    const contactPhone = site?.contactPhone || site?.phone || site?.contact_phone || '-';
    const contactEmail = site?.contactEmail || site?.email || site?.contact_email || '-';
    const fax = site?.fax || '-';

    const [categoryNames, setCategoryNames] = useState<string[] | null>(null);

    useEffect(() => {
        let mounted = true;
        async function loadCategoryNames() {
            try {
                if (site?.categoryNames && Array.isArray(site.categoryNames) && site.categoryNames.length) {
                    if (mounted) setCategoryNames(site.categoryNames.map(String));
                    return;
                }

                const ids = site?.categoryIds;
                if (!ids || !Array.isArray(ids) || ids.length === 0) {
                    if (mounted) setCategoryNames([]);
                    return;
                }

                const resp = await categoryService.list({ filter: { module: 'postSite' }, limit: 1000 });
                const map = new Map<string, string>();
                (resp.rows || []).forEach((c: any) => map.set(String(c.id), c.name));
                const names = ids.map((id: any) => map.get(String(id)) || String(id));
                if (mounted) setCategoryNames(names);
            } catch (e) {
                if (mounted) setCategoryNames((site?.categoryNames && Array.isArray(site.categoryNames)) ? site.categoryNames.map(String) : []);
            }
        }

        loadCategoryNames();
        return () => { mounted = false; };
    }, [site]);

    const categories = (() => {
        if (Array.isArray(site?.categories) && site.categories.length > 0) {
            return site.categories
                .map((c: any) => c?.name || c?.label || c?.title || String(c))
                .join(', ');
        }

        if (categoryNames && categoryNames.length) {
            return categoryNames.join(', ');
        }

        if (Array.isArray(site?.categoryNames) && site.categoryNames.length > 0) {
            return site.categoryNames.join(', ');
        }

        if (Array.isArray(site?.categoryIds) && site.categoryIds.length > 0) {
            if (site.categoryLookup && typeof site.categoryLookup === 'object') {
                return site.categoryIds.map((id: any) => site.categoryLookup[id] ?? id).join(', ');
            }
            return site.categoryIds.join(', ');
        }

        return '-';
    })();

    const postalCode = site?.postalCode || site?.zipCode || '-';
    const city = site?.city || '-';
    const country = site?.country || '-';
    const lat = site?.latitud ?? site?.latitude ?? '-';
    const lng = site?.longitud ?? site?.longitude ?? '-';

    const chargeRate = site?.chargeRate ?? site?.postSiteChargeRate ?? '-';
    const payRate = site?.payRate ?? site?.postSitePayRate ?? '-';

    return (
        <div className="space-y-6">
            <div className="md:block hidden bg-white border rounded-md p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">{t('postSites.profile.title')}</h3>
                        <p className="text-sm text-gray-600">{siteName || '-'}</p>
                        <p className="text-sm text-gray-600">{site?.description || '-'}</p>
                    </div>
                </div>

                {/* Map block replicated from Overview */}
                <div className="mt-6">
                    {/* Controles de tipo de mapa y geo-cerca ocultos, solo se muestra el mapa */}

                    {(() => {
                        const lat = site?.latitud ?? site?.latitude ?? site?.lat ?? (site?.location && site.location.lat);
                        const lng = site?.longitud ?? site?.longitude ?? site?.lng ?? (site?.location && site.location.lng);
                        const address = site?.address || site?.secondAddress || site?.companyAddress || '';

                        if (lat && lng) {
                            const latNum = Number(lat);
                            const lngNum = Number(lng);
                            if (!isNaN(latNum) && !isNaN(lngNum)) {
                                return (
                                    <div className="h-72 rounded-md overflow-hidden mb-2">
                                        <IncidentMap lat={latNum} lng={lngNum} label={site?.companyName || site?.name || 'Client location'} />
                                    </div>
                                );
                            }
                        }

                        if (address) {
                            const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                            return (
                                <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <div>{t('postSites.profile.Map.NoCoordinates')}</div>
                                        <a href={search} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-2 inline-block">Open in Google Maps</a>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">Mapa (no hay datos)</div>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 relative">
                    <div className="bg-white rounded-lg border p-5">
                        <h4 className="text-sm font-semibold mb-3">{t('postSites.profile.GeneralInformation.title')}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div className="text-xs text-gray-500">{t('postSites.profile.GeneralInformation.client')}</div>
                            <div className="font-semibold">{clientName}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.GeneralInformation.siteName')}</div>
                            <div className="font-semibold">{siteName}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.GeneralInformation.addedOn')}</div>
                            <div className="font-semibold">{addedOn}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.GeneralInformation.address')}</div>
                            <div className="font-semibold">{address}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border p-5">
                        <h4 className="text-sm font-semibold mb-3">{t('postSites.profile.ContactDetails.title')}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div className="text-xs text-gray-500">{t('postSites.profile.ContactDetails.phoneNumber')}</div>
                            <div className="font-semibold">{contactPhone}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.ContactDetails.email')}</div>
                            <div className="font-semibold">{contactEmail}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.ContactDetails.fax')}</div>
                            <div className="font-semibold">{fax}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white rounded-lg border p-5">
                        <h4 className="text-sm font-semibold mb-3">{t('postSites.profile.MoreInformation.title')}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.categories')}</div>
                            <div className="font-semibold">{categories}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.postalCode')}</div>
                            <div className="font-semibold">{postalCode}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.city')}</div>
                            <div className="font-semibold">{city}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.country')}</div>
                            <div className="font-semibold">{country}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.latitude')}</div>
                            <div className="font-semibold">{lat}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.longitude')}</div>
                            <div className="font-semibold">{lng}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.postSiteChargeRate')}</div>
                            <div className="font-semibold">{chargeRate ?? '-'}</div>

                            <div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.postSitePayRate')}</div>
                            <div className="font-semibold">{payRate ?? '-'}</div>
                        </div>
                    </div>
                    <div />
                    {/* Floating edit button in bottom-right of this card area */}
                    {id && (
                        <div className="absolute right-6 bottom-6">
                            <Link to={`/post-sites/${id}/edit`} className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700"
                            >
                                {t('postSites.profile.Edit', 'Edit')}
                            </Link>
                        </div>
                    )}
                </div>

            </div>

            <div className="md:hidden">
                <MobileCardList
                    items={site ? [site] : []}
                    renderCard={(s: any) => (
                        <div className="p-4 bg-white border rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold">{s.companyName || s.name || '-'}</div>
                                    <div className="text-xs text-gray-500">{clientName}</div>
                                </div>
                                {id && (
                                    <Link to={`/post-sites/${id}/edit`} className="px-3 py-1 bg-orange-600 text-white rounded-md text-sm">{t('postSites.profile.Edit', 'Edit')}</Link>
                                )}
                            </div>

                            <div className="mt-3 text-sm text-gray-700">
                                <div className="flex justify-between"><div className="text-xs text-gray-500">{t('postSites.profile.ContactDetails.phoneNumber')}</div><div className="font-semibold">{contactPhone}</div></div>
                                <div className="flex justify-between mt-2"><div className="text-xs text-gray-500">{t('postSites.profile.ContactDetails.email')}</div><div className="font-semibold">{contactEmail}</div></div>
                                <div className="flex justify-between mt-2"><div className="text-xs text-gray-500">{t('postSites.profile.MoreInformation.categories')}</div><div className="font-semibold">{categories}</div></div>
                            </div>
                        </div>
                    )}
                />
            </div>

        </div>
    );
}
