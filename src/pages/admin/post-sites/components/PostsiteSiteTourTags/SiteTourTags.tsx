import React, { useState } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { useRef, useEffect } from 'react';

export default function PostSiteTourTags({ site }: { site?: any }) {
    const tabs = ['QR Tags', 'NFC Tags', 'Virtual Tags', 'Ble Beacons'];
    const [activeTab, setActiveTab] = useState<string>(tabs[0]);
    const [showNewTag, setShowNewTag] = useState(false);
    const [form, setForm] = useState<any>({
        tagType: tabs[0],
        name: '',
        tagId: '',
        location: '',
        instructions: '',
        askQuestions: false,
        latitude: '',
        longitude: '',
        showGeoFence: false,
    });

    function update(k: string, v: any) {
        setForm((s: any) => ({ ...s, [k]: v }));
    }

    const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
    const actionOptionsMap: Record<string, string[]> = {
        'QR Tags': ['Delete', 'Print'],
        'NFC Tags': ['Delete'],
        'Virtual Tags': ['Delete'],
        'Ble Beacons': ['Delete'],
    };

    const [actionOpen, setActionOpen] = useState(false);
    const actionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!actionRef.current) return;
            if (!actionRef.current.contains(e.target as Node)) setActionOpen(false);
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    function handleActionChange(tab: string, value: string) {
        // placeholder for action handling - integrate with services when ready
        console.log('Action for', tab, value);
        if (value === 'Delete') {
            // TODO: delete selected
        }
        if (value === 'Print') {
            // TODO: implement print
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="border-b">
                                <nav className="flex">
                                    {tabs.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => { setActiveTab(t); update('tagType', t); }}
                                            className={`flex-1 text-center py-4 border-b-2 ${activeTab === t ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-600'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <div className="flex-shrink-0 ml-4">
                            <button onClick={() => setShowNewTag(true)} className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
                                <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                                    <Plus size={14} />
                                </span>
                                <span className="text-sm font-medium">New Tag</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 mb-4">
                    <div ref={actionRef} className="relative">
                        <button
                            onClick={() => setActionOpen(v => !v)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white"
                        >
                            <span className="text-sm">Action</span>
                            <ChevronDown size={14} />
                        </button>

                        {actionOpen && (
                            <div className="absolute left-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-20">
                                {actionOptionsMap[activeTab].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { handleActionChange(activeTab, opt); setActionOpen(false); }}
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-1/3">
                        <input
                            value={searchQuery[activeTab] || ''}
                            onChange={(e) => setSearchQuery((s) => ({ ...s, [activeTab]: e.target.value }))}
                            placeholder="Search Tags"
                            className="w-full border rounded-full px-4 py-2"
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3"><input type="checkbox" /></th>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">{activeTab === 'Virtual Tags' ? 'Geofence Radius' : 'Tag Id'}</th>
                                    <th className="px-4 py-3 text-right">&nbsp;</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={4} className="px-4 py-12">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-40 h-40">
                                                <svg viewBox="0 0 200 200" className="w-full h-full text-blue-100">
                                                    <rect x="40" y="48" width="120" height="84" fill="currentColor" rx="10" />
                                                    <path d="M60 78 L140 78" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                                    <circle cx="90" cy="100" r="6" fill="white" />
                                                    <circle cx="110" cy="100" r="6" fill="white" />
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-lg font-semibold text-gray-700">No Result Found</h3>
                                                <p className="text-sm text-gray-500 mt-1">We can't find any item matching your search</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showNewTag && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTag(false)} />

                    <aside className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">New Tag</h3>
                            <button onClick={() => setShowNewTag(false)} className="p-2 text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto h-[calc(100vh-160px)] space-y-4">
                            <div>
                                <input value={form.tagType} readOnly className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Name*" className="w-full border rounded-lg h-12 px-3" />
                                <input value={form.tagId} onChange={(e) => update('tagId', e.target.value)} placeholder="Tag Id*" className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div>
                                <input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Location" className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div>
                                <textarea value={form.instructions} onChange={(e) => update('instructions', e.target.value)} placeholder="Instructions For The Guards*" className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={form.askQuestions} onChange={e => update('askQuestions', e.target.checked)} /> Ask guards specific questions after they scan the tag</label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input value={form.latitude} onChange={(e) => update('latitude', e.target.value)} placeholder="Latitude*" className="w-full border rounded-lg h-12 px-3" />
                                <input value={form.longitude} onChange={(e) => update('longitude', e.target.value)} placeholder="Longitude*" className="w-full border rounded-lg h-12 px-3" />
                            </div>

                            <div className="flex items-center gap-4">
                                <input value={form.location} readOnly className="flex-1 border rounded-lg h-12 px-3" />
                                <button className="px-4 py-2 border rounded-md">Map Location</button>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={form.showGeoFence} onChange={e => update('showGeoFence', e.target.checked)} /> Show Geo-Fence</label>
                            </div>

                            <div className="border rounded-md overflow-hidden">
                                <div style={{ height: 220 }}>
                                    <iframe
                                        title="map"
                                        src="https://maps.google.com/maps?q=Guayaquil&t=&z=13&ie=UTF8&iwloc=&output=embed"
                                        className="w-full h-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <button onClick={() => { setShowNewTag(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 right-4">
                            <button onClick={() => { setShowNewTag(false); }} className="ml-2 inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700">
                                <span className="text-sm font-semibold">Submit</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
