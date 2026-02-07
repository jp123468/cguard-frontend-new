import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown } from 'lucide-react';

export default function PostSiteGeoFence({ site }: { site?: any }) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!addRef.current) return;
      if (!addRef.current.contains(e.target as Node)) setAddOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleAdd(option: 'Allowed' | 'Restricted') {
    // Placeholder: open drawer or start creation flow
    console.log('Add geofence:', option);
    setAddOpen(false);
    // Suggestion: open right-drawer with form to draw polygon or circle
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Geo-Fence</h3>

          <div className="relative" ref={addRef}>
            <button onClick={() => setAddOpen(v => !v)} className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center"><Plus size={14} /></span>
              <span className="text-sm font-medium">Add Geofence</span>
              <ChevronDown size={16} />
            </button>

            {addOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-md shadow-lg z-20">
                <button onClick={() => handleAdd('Allowed')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Allowed</button>
                <button onClick={() => handleAdd('Restricted')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Restricted</button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <iframe
            title="geofence-map"
            src="https://maps.google.com/maps?q=Guayaquil&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="w-full h-64 border rounded-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Shape</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-gray-500">No geofences defined yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
