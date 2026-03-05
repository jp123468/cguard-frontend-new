import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, X, Upload, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GuardsLayout from '@/layouts/GuardsLayout';
import AppLayout from '@/layouts/app-layout';
import { useParams } from 'react-router-dom';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
import MobileCardList from '@/components/responsive/MobileCardList';

type Props = {
  guard?: any;
};

export default function GuardLicenses({ guard }: Props) {
  const { t } = useTranslation();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>(() => t('guards.licenses.action.default', { defaultValue: 'Action' }));
  const [searchQuery, setSearchQuery] = useState('');
  const [licenseData, setLicenseData] = useState<any[]>([]); // Vacío inicialmente
  const [showModal, setShowModal] = useState(false);
  const [currentLicense, setCurrentLicense] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    licenseType: '',
    customLicenseName: '',
    licenseNumber: '',
    expiryDate: '',
    frontImage: null as File | null,
    backImage: null as File | null,
  });

  const handleAddLicense = () => {
    setShowModal(true);
    setFormData({
      licenseType: '',
      customLicenseName: '',
      licenseNumber: '',
      expiryDate: '',
      frontImage: null,
      backImage: null,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setActionOpen(false);
      }
    };

    if (actionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [actionOpen]);

  const handleSubmitLicense = () => {
    // Logic to save the license will go here
    console.log('License created:', formData);
    setShowModal(false);
  };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.licencias">
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              {/* Left: Action Dropdown */}
              <div className="relative" ref={actionRef}>
                <button
                  onClick={() => setActionOpen(!actionOpen)}
                  className="px-3 py-2 border rounded-md bg-white text-gray-700 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 min-w-[100px]"
                >
                  {actionSelection}
                  <ChevronDown size={16} />
                </button>
                {actionOpen && (
                  <div className="absolute left-0 mt-1 bg-white border rounded-md shadow-lg z-10 w-full">
                    <button
                      onClick={() => { setActionSelection(t('guards.licenses.actions.delete', { defaultValue: 'Delete' })); setActionOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      {t('guards.licenses.actions.delete', { defaultValue: 'Delete' })}
                    </button>
                  </div>
                )}
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-xs">
                  <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('guards.licenses.searchPlaceholder', { defaultValue: 'Search license' })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Right: Add Button */}
              <button
                onClick={handleAddLicense}
                className="px-6 py-2 bg-orange-600 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-orange-700 transition-colors"
              >
                <Plus size={18} />
                {t('guards.licenses.newLicense', { defaultValue: 'New License' })}
              </button>
            </div>

            {/* Table */}
            <div>
              <div className="md:block hidden overflow-x-auto">
                <table className="w-full">
                <thead>
                    <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.licenses.table.type', { defaultValue: 'License Type' })}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.licenses.table.number', { defaultValue: 'License Number' })}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.licenses.table.expires', { defaultValue: 'Expires On' })}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t('guards.licenses.table.addedBy', { defaultValue: 'Added By' })}</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      <button className="hover:text-gray-900">↕</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {licenseData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="w-32 h-32">
                            <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                              <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                              <circle cx="85" cy="100" r="8" fill="white" />
                              <circle cx="115" cy="100" r="8" fill="white" />
                              <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                              <path d="M 60 60 L 70 50 M 140 60 L 150 50 M 80 40 L 90 30 M 120 40 L 110 30" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-700">{t('guards.licenses.empty.title', { defaultValue: 'No results found' })}</h3>
                            <p className="text-sm text-gray-500 mt-1" dangerouslySetInnerHTML={{ __html: t('guards.licenses.empty.description', { defaultValue: "We couldn't find<br />any items matching<br />your search" }) }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    licenseData.map((license, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{license.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{license.number}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{license.expiryDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{license.addedBy}</td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-gray-400 hover:text-gray-600">⋮</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <MobileCardList
                  items={licenseData || []}
                  loading={false}
                  emptyMessage={t('guards.licenses.empty.title', { defaultValue: 'No results found' }) as string}
                  renderCard={(lic: any) => (
                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{lic.type}</div>
                          <div className="text-xs text-gray-500">{lic.number}</div>
                        </div>
                        <div className="text-xs text-gray-500">{lic.expiryDate}</div>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div
              className="fixed inset-0 z-50"
              onClick={handleCloseModal}
            >
              <div
                className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                  <h2 className="text-lg font-semibold text-gray-800">{t('guards.licenses.modal.title', { defaultValue: 'Add New License' })}</h2>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Tipo de Licencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('guards.licenses.form.licenseType', { defaultValue: 'License Type' })} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value, customLicenseName: '' })}
                      className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">{t('guards.licenses.form.selectLicenseType', { defaultValue: 'Select license type' })}</option>
                      <option value="conducir">{t('guards.licenses.form.option.driver', { defaultValue: 'Driver License' })}</option>
                      <option value="armas">{t('guards.licenses.form.option.weapons', { defaultValue: 'Weapons License' })}</option>
                      <option value="seguridad">{t('guards.licenses.form.option.security', { defaultValue: 'Security License' })}</option>
                      <option value="otra">{t('guards.licenses.form.option.other', { defaultValue: 'Other' })}</option>
                    </select>
                  </div>

                  {/* Campo personalizado si selecciona "Otra" */}
                  {formData.licenseType === 'otra' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('guards.licenses.form.customLicenseName', { defaultValue: 'License Name' })} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customLicenseName}
                        onChange={(e) => setFormData({ ...formData, customLicenseName: e.target.value })}
                        placeholder={t('guards.licenses.form.customLicensePlaceholder', { defaultValue: 'Enter license name' })}
                        className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}

                  {/* Número de Licencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('guards.licenses.form.licenseNumber', { defaultValue: 'License Number' })} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder={t('guards.licenses.form.licenseNumberPlaceholder', { defaultValue: 'Enter license number' })}
                      className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Fecha de Expiración */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('guards.licenses.form.expiryDate', { defaultValue: 'Expires On' })} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                        onClick={(e) => e.currentTarget.showPicker?.()}
                      />
                    </div>
                  </div>

                  {/* Imagen Frontal de la Licencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {t('guards.licenses.form.frontImageLabel', { defaultValue: 'Front License Image' })}
                      <Paperclip size={16} className="text-gray-400" />
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({ ...formData, frontImage: e.target.files?.[0] || null })}
                        className="hidden"
                        id="frontImage"
                      />
                      <label
                        htmlFor="frontImage"
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Paperclip size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                          {formData.frontImage ? formData.frontImage.name : t('guards.licenses.form.chooseFile', { defaultValue: 'Choose file' })}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Imagen Trasera de la Licencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {t('guards.licenses.form.backImageLabel', { defaultValue: 'Back License Image' })}
                      <Paperclip size={16} className="text-gray-400" />
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({ ...formData, backImage: e.target.files?.[0] || null })}
                        className="hidden"
                        id="backImage"
                      />
                      <label
                        htmlFor="backImage"
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Paperclip size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {formData.backImage ? formData.backImage.name : t('guards.licenses.form.chooseFile', { defaultValue: 'Choose file' })}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                  >
                    {t('guards.licenses.modal.cancel', { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    onClick={handleSubmitLicense}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700"
                  >
                    {t('guards.licenses.modal.save', { defaultValue: 'Save' })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </GuardsLayout>
    </AppLayout>
  );
}
