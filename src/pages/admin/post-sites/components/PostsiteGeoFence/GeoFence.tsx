import React, { useState, useRef, useEffect } from 'react';
import useScrollToTopOnMount from '@/hooks/useScrollToTopOnMount';
import { Plus, ChevronDown, MapPin } from 'lucide-react';
import MobileCardList from '@/components/responsive/MobileCardList';
import { Section, EmptyState } from '@/components/kit';

export default function PostSiteGeoFence({ site }: { site?: any }) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!addRef.current) return;
      if (!addRef.current.contains(e.target as Node)) setAddOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useScrollToTopOnMount(containerRef);

  function handleAdd(option: 'Allowed' | 'Restricted') {
    // Placeholder: open drawer or start creation flow
    console.log('Add geofence:', option);
    setAddOpen(false);
    // Suggestion: open right-drawer with form to draw polygon or circle
  }

  return (
  <div ref={containerRef} className="space-y-4">
      <Section
        title="Geo-Fence"
        icon={<MapPin />}
        action={(
          <div className="relative" ref={addRef}>
            <button onClick={() => setAddOpen(v => !v)} className="inline-flex items-center gap-2 cg-gradient-brand text-primary-foreground px-4 py-2 rounded-full shadow-sm hover:brightness-[1.04]">
              <Plus size={16} />
              <span className="text-sm font-medium">Add Geofence</span>
              <ChevronDown size={16} />
            </button>

            {addOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-card border rounded-md shadow-lg z-20">
                <button onClick={() => handleAdd('Allowed')} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Allowed</button>
                <button onClick={() => handleAdd('Restricted')} className="block w-full text-left px-4 py-2 text-sm hover:bg-muted/30">Restricted</button>
              </div>
            )}
          </div>
        )}
      >
        <div className="mb-4">
          <iframe
            title="geofence-map"
            src="https://maps.google.com/maps?q=Guayaquil&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="w-full h-64 border rounded-md"
          />
        </div>

        <div>
          <div className="md:block hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left">Shape</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="px-4 py-12">
                    <EmptyState icon={<MapPin />} title="Sin geocercas" description="No geofences defined yet" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            <MobileCardList items={[]} renderCard={(g: any) => (
              <div>
                <div className="text-sm font-semibold">{g.type || 'Geofence'}</div>
                <div className="text-xs text-muted-foreground">{g.shape || '-'}</div>
              </div>
            )} loading={false} />
          </div>
        </div>
      </Section>
    </div>
  );
}
