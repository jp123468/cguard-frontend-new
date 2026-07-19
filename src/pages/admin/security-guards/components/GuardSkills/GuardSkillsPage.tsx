import { useParams } from 'react-router-dom';
import AppLayout from '@/layouts/app-layout';
import GuardsLayout from '@/layouts/GuardsLayout';
import { useEffect, useState, useRef } from 'react';
import { Search, ChevronDown, Plus, Award } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { useTranslation } from 'react-i18next';
import securityGuardService from '@/lib/api/securityGuardService';
import { toast } from 'sonner';
import { PageContainer, PageHeader, Section, EmptyState, SkeletonCards, Modal } from '@/components/kit';
import { Button } from '@/components/ui/button';
import type { GuardDetail } from '../../guardDetailTypes';

export default function GuardSkillsPage() {
  const { id } = useParams();
  const [guard, setGuard] = useState<GuardDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const { t } = useTranslation();
  const [actionSelection, setActionSelection] = useState<string>(() => t('guards.skills.action.default', { defaultValue: 'Action' }));

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [skillSets, setSkillSets] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [mappings, setMappings] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownQuery, setDropdownQuery] = useState('');

  const handleAssignFromDropdown = () => {
    if (selectedIds.length === 0) { toast.error(t('guards.skills.toasts.selectAtLeastOne', { defaultValue: 'Please select at least one skill set' })); return; }
    const items = skillSets.filter(s => selectedIds.includes(s.id)).map(s => ({ id: Date.now().toString() + Math.random().toString(36).slice(2,6), name: s.name, description: s.description }));
    setMappings((prev) => [...items, ...prev]);
    setSelectedIds([]);
    setDropdownQuery('');
    setShowDropdown(false);
    setAssignModalOpen(false);
  };

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: GuardDetail & { guard?: GuardDetail }) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch((err: unknown) => {
        console.error('Error cargando vigilante:', err);
        toast.error(t('guards.skills.toasts.loadError', { defaultValue: 'Could not load guard' }));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    securityGuardService
      .get(id)
      .then((data: GuardDetail & { guard?: GuardDetail }) => {
        if (!mounted) return;
        const g = data.guard ?? data;
        const fullName = g.fullName ?? `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim();
        setGuard({ ...g, fullName });
      })
      .catch((err: unknown) => {
        console.error('Error cargando vigilante:', err);
        toast.error(t('guards.skills.toasts.loadError', { defaultValue: 'Could not load guard' }));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  // For demo: prefill some skill sets (could be loaded from API)
  useEffect(() => {
    setSkillSets([
      { id: 's1', name: 'First Aid', description: 'Basic first aid training' },
      { id: 's2', name: 'Fire Safety', description: 'Fire prevention and response' },
    ]);
    setMappings([]);
  }, []);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(mappings.map((m) => m.id)); else setSelectedIds([]);
  };

  const assignSkill = () => {
    if (!formName) { toast.error(t('guards.skills.toasts.provideName', { defaultValue: 'Please provide a skill name' })); return; }
    const newItem = { id: Date.now().toString(), name: formName, description: formDescription };
    setMappings((prev) => [newItem, ...prev]);
    setFormName(''); setFormDescription(''); setAssignModalOpen(false);
  };

  return (
    <AppLayout>
      <GuardsLayout navKey="keep-safe" title="guards.nav.conjuntoHabilidades">
        <PageContainer>
          <PageHeader
            icon={<Award />}
            title={t('guards.skills.title', { defaultValue: 'Conjunto de habilidades' })}
            subtitle={guard?.fullName
              ? `${t('guards.skills.subtitle', { defaultValue: 'Habilidades y certificaciones del vigilante.' })} · ${guard.fullName}`
              : t('guards.skills.subtitle', { defaultValue: 'Habilidades y certificaciones del vigilante.' })}
            actions={
              <Button variant="brand" onClick={() => setAssignModalOpen(true)} disabled={!guard}>
                <Plus size={16} />
                {t('guards.skills.assignButton', { defaultValue: 'Assign Skill Set' })}
              </Button>
            }
          />

          {loading ? (
            <SkeletonCards count={4} />
          ) : guard ? (
            <Section
              title={t('guards.skills.feedTitle', { defaultValue: 'Habilidades asignadas' })}
              icon={<Award />}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative" ref={actionRef}>
                    <button
                      onClick={() => setActionOpen(!actionOpen)}
                      className="px-3 py-2 border rounded-xl bg-card text-foreground text-sm font-medium flex items-center gap-2 hover:bg-muted/30 min-w-[100px]"
                    >
                      {actionSelection}
                      <ChevronDown size={16} />
                    </button>
                    {actionOpen && (
                      <div className="absolute left-0 mt-1 bg-card border rounded-xl shadow-lg z-10 w-full overflow-hidden">
                        <button
                          onClick={() => { setActionSelection(t('guards.skills.actions.delete', { defaultValue: 'Delete' })); setActionOpen(false); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-muted"
                        >
                          {t('guards.skills.actions.delete', { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('guards.skills.searchPlaceholder', { defaultValue: 'Search skill sets' })}
                      value={''}
                      onChange={() => {}}
                      className="w-56 pl-8 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <div>
                  <div className="md:block hidden">
                    <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          aria-label="select all"
                          checked={mappings.length > 0 && selectedIds.length === mappings.length}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6">
                          <EmptyState
                            icon={<Award />}
                            title={t('guards.skills.empty.title', { defaultValue: 'No Result Found' })}
                            description={t('guards.skills.empty.description', { defaultValue: "We can't find any item matching your search" })}
                          />
                        </td>
                      </tr>
                    ) : (
                      mappings.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={(e) => {
                              if (e.target.checked) setSelectedIds((prev) => [...prev, m.id]); else setSelectedIds((prev) => prev.filter(id => id !== m.id));
                            }} className="h-4 w-4" />
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{m.name}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{m.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                      </table>
                    </div>

                    <div className="md:hidden">
                      <MobileCardList
                        items={mappings || []}
                        loading={false}
                        emptyMessage={t('guards.skills.empty.title', { defaultValue: 'No Result Found' }) as string}
                        renderCard={(m: { id: string; name: string; description?: string }) => (
                          <div className="p-4 bg-card border rounded-xl">
                            <div className="text-sm font-semibold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.description}</div>
                          </div>
                        )}
                      />
                    </div>
                  </div>
              </div>
            </Section>
          ) : (
            <EmptyState
              icon={<Award />}
              title={t('guards.skills.toasts.loadError', { defaultValue: 'Could not load guard' })}
            />
          )}
        </PageContainer>

        <Modal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          title={t('guards.skills.modal.title', { defaultValue: 'Assign Skill Set' })}
          icon={<Award />}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setAssignModalOpen(false)}>{t('guards.skills.modal.cancel', { defaultValue: 'Cancel' })}</Button>
              <Button variant="brand" onClick={handleAssignFromDropdown}>{t('guards.skills.modal.assign', { defaultValue: 'Assign' })}</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={`text-sm block mb-2 ${selectedIds.length === 0 ? 'text-red-600' : 'text-foreground/70'}`}>{t('guards.skills.form.skillSet', { defaultValue: 'Skill Set*' })}</label>

              {/* custom dropdown box */}
              <div className={`border rounded-xl ${selectedIds.length === 0 ? 'border-red-500' : 'border-border'} bg-card`}>
                <div className="px-3 py-2 flex items-center justify-between cursor-pointer" onClick={() => setShowDropdown((s) => !s)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <span className="block text-sm text-foreground truncate">
                        {selectedIds.length === 0 ? t('guards.skills.form.selectPlaceholder', { defaultValue: 'Select skill sets...' }) : `${selectedIds.length} selected`}
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={16} />
                </div>
                {showDropdown && (
                  <div className="border-t border-border bg-card p-3">
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder={t('guards.skills.dropdown.searchPlaceholder', { defaultValue: 'Search...' })}
                        className="w-full px-3 py-2 border rounded-xl text-sm"
                        value={dropdownQuery}
                        onChange={(e) => setDropdownQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {skillSets.filter(s => s.name.toLowerCase().includes(dropdownQuery.toLowerCase())).map((s) => (
                        <label key={s.id} className="flex items-center gap-3 py-2 cursor-pointer">
                          <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, s.id]); else setSelectedIds((prev) => prev.filter(id => id !== s.id));
                          }} className="h-4 w-4" />
                          <div className="min-w-0">
                            <div className="text-sm text-foreground truncate">{s.name}</div>
                            {s.description && <div className="text-xs text-muted-foreground truncate">{s.description}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      </GuardsLayout>
    </AppLayout>
  );
}
