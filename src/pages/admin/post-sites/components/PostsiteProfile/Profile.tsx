import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import IncidentMap from "@/components/IncidentMap/IncidentMap";

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

    const categories = Array.isArray(site?.categoryIds) && site.categoryIds.length > 0
        ? site.categoryIds.join(', ')
        : '-';

    const postalCode = site?.postalCode || site?.zipCode || '-';
    const city = site?.city || '-';
    const country = site?.country || '-';
    const lat = site?.latitud ?? site?.latitude ?? '-';
    const lng = site?.longitud ?? site?.longitude ?? '-';

    const chargeRate = site?.chargeRate ?? site?.postSiteChargeRate ?? '-';
    const payRate = site?.payRate ?? site?.postSitePayRate ?? '-';

    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-md p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">{t('postSites.profile.title')}</h3>
                        <p className="text-sm text-gray-600">{siteName || '-'}</p>
                        <p className="text-sm text-gray-600">{site?.description || '-'}</p>
                    </div>
                </div>

                {/* Map block replicated from Overview */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold">{t('postSites.profile.Map.title')}</h4>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600">{t('postSites.profile.Map.MapType')}</div>
                            <select className="border rounded px-3 py-1 text-sm">
                                <option>{t('postSites.profile.Map.Roadmap')}</option>
                                <option>{t('postSites.profile.Map.Satellite')}</option>
                                <option>{t('postSites.profile.Map.Hybrid')}</option>
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" className="form-checkbox h-5 w-8" />
                                <span>{t('postSites.profile.Map.GeoFence')}</span>
                            </label>
                        </div>
                    </div>

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
                            const search = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
                            return (
                                <div className="h-72 bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <div>{t('postSites.profile.Map.NoCoordinates')}</div>
                                        <a href={search} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-2 inline-block">Open in OpenStreetMap</a>
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

        </div>
    );
}
