import React, { useState } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';

export default function PostSiteOrders({ site }: { site?: any }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSelection, setActionSelection] = useState<string>('Action');
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="space-y-4">
      

      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setActionOpen(v => !v)}
              className="px-3 py-2 border rounded-full bg-white text-sm inline-flex items-center gap-2"
            >
              {actionSelection}
              <ChevronDown size={14} />
            </button>
            {actionOpen && (
              <div className="absolute mt-2 bg-white border rounded-md shadow-lg z-10 w-48">
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Archive</button>
                <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Delete</button>
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-xl">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Post Order"
                className="w-full h-10 rounded-full border pl-10 pr-4"
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-3 bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700">
              <span className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                <Plus size={14} />
              </span>
              <span className="text-sm font-medium">New Post Order</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" /></th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Added By</th>
                <th className="px-4 py-3 text-right"> <button className="text-gray-400">↕</button></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-40 h-40">
                      <svg viewBox="0 0 200 200" className="w-full h-full text-orange-100">
                        <rect x="50" y="80" width="100" height="80" fill="currentColor" rx="8" />
                        <circle cx="85" cy="100" r="8" fill="white" />
                        <circle cx="115" cy="100" r="8" fill="white" />
                        <path d="M 85 120 L 115 120" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black opacity-30 z-40" onClick={() => setShowModal(false)} />
          <div className="ml-auto w-full md:w-[680px] bg-white h-full shadow-2xl p-6 overflow-auto relative z-50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">New Post Order</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Copy From</label>
                <select value={copyFrom} onChange={e => setCopyFrom(e.target.value)} className="w-full border rounded-md h-12 px-3">
                  <option value="">Select</option>
                  <option value="template-1">Template 1</option>
                  <option value="template-2">Template 2</option>
                </select>
              </div>

              <div className="text-center text-sm text-gray-500">Or Create New Post Order</div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Title*</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-md h-12 px-3" placeholder="Title*" />
              </div>

              <div>
                <div className="border rounded-md">
                  <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
                    <button className="p-2 rounded hover:bg-gray-100 text-sm">B</button>
                    <button className="p-2 rounded hover:bg-gray-100 text-sm">I</button>
                    <button className="p-2 rounded hover:bg-gray-100 text-sm">U</button>
                    <div className="border-l h-6 mx-2" />
                    <select className="ml-auto text-sm bg-transparent">
                      <option>Normal</option>
                      <option>Heading</option>
                    </select>
                  </div>
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type Here" className="w-full min-h-[240px] p-4" />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-end gap-3">
                <button onClick={() => { /* submit logic */ setShowModal(false);} } className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg">Add</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
