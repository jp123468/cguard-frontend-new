import React, { useState } from 'react';
import { Search, ChevronDown, Plus, X } from 'lucide-react';

export default function PostSiteTours({ site }: { site?: any }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showNewTourModal, setShowNewTourModal] = useState(false);

  const [tourName, setTourName] = useState('');
  const [tourDesc, setTourDesc] = useState('');
  const [scheduledDays, setScheduledDays] = useState('');
  const [continuous, setContinuous] = useState(false);
  const [timeMode, setTimeMode] = useState('specific');
  const [selectTime, setSelectTime] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [tagType, setTagType] = useState('');
  const [tags, setTags] = useState('');
  const [assignGuard, setAssignGuard] = useState('');
  const [enableNotes, setEnableNotes] = useState(false);
  const [forceMedia, setForceMedia] = useState(false);

  const guardOptions = [
    { id: 'guard-1', name: 'John Doe' },
    { id: 'guard-2', name: 'Jane Smith' },
    { id: 'guard-3', name: 'Carlos Ruiz' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button onClick={() => setActionOpen(v => !v)} className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2">
              Action
              <ChevronDown size={14} />
            </button>
            {actionOpen && (
              <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Archive Selected</button>
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Tours" className="w-full h-10 rounded-full border pl-10 pr-4" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setShowNewTourModal(true)} className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus size={14} />
              </span>
              <span className="text-sm font-medium">New Tour</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" /></th>
                <th className="px-4 py-3 text-left">Tour Name</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Type</th>
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

      {showNewTourModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewTourModal(false)} />

          <aside className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">New Tour</h3>
              <button onClick={() => setShowNewTourModal(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto h-[calc(100vh-160px)] space-y-4">
              <div>
                <input value={tourName} onChange={e => setTourName(e.target.value)} placeholder="Tour Name*" className="w-full border rounded-lg h-12 px-3" />
              </div>

              <div>
                <textarea value={tourDesc} onChange={e => setTourDesc(e.target.value)} placeholder="Tour Description" className="w-full border rounded-lg px-3 py-3 min-h-[120px]" />
              </div>

              <div>
                <select value={scheduledDays} onChange={e => setScheduledDays(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Scheduled Days*</option>
                  <option value="mon">Mon - Fri</option>
                  <option value="sat">Sat</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Continuous</label>
                  <input type="checkbox" checked={continuous} onChange={e => setContinuous(e.target.checked)} className="h-5 w-8" />
                </div>

                <div className="flex-1">
                  <select value={timeMode} onChange={e => setTimeMode(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                    <option value="specific">Specific Time</option>
                    <option value="any">Any Time</option>
                  </select>
                </div>
              </div>

              <div>
                <input type="time" value={selectTime} onChange={e => setSelectTime(e.target.value)} className="w-full border rounded-lg h-12 px-3" placeholder="Select Time" />
              </div>

              <div>
                <select value={maxDuration} onChange={e => setMaxDuration(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Max Duration</option>
                  <option value="15">15 mins</option>
                  <option value="30">30 mins</option>
                </select>
              </div>

              <div>
                <select value={tagType} onChange={e => setTagType(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Select Tag Type*</option>
                  <option value="type-a">Type A</option>
                </select>
              </div>

              <div>
                <select value={tags} onChange={e => setTags(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Select Tags*</option>
                  <option value="tag-1">Tag 1</option>
                </select>
              </div>

              <div>
                <select value={assignGuard} onChange={e => setAssignGuard(e.target.value)} className="w-full border rounded-lg h-12 px-3">
                  <option value="">Assign Guard*</option>
                  {guardOptions.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={enableNotes} onChange={e => setEnableNotes(e.target.checked)} /> Enable site tour notes</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={forceMedia} onChange={e => setForceMedia(e.target.checked)} /> Force guard to attach multiple media files</label>
              </div>
            </div>

            <div className="p-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <button onClick={() => { /* save as draft */ setShowNewTourModal(false); }} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700">Save As Draft</button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 right-4">
              <button onClick={() => { /* submit */ setShowNewTourModal(false); }} className="ml-2 inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700">
                <span className="text-sm font-semibold">Submit</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
