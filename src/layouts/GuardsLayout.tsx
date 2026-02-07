import React, { ReactNode, useState } from 'react';
import guardsNav from '@/data/guards-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation } from 'react-router-dom';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Menu} from 'lucide-react';

type Props = {
  navKey: string;
  title?: string;
  children: ReactNode;
};

export default function GuardsLayout({ navKey, title, children }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const cfg: any = (guardsNav as any)[navKey] || null;
  const { id } = useParams();
  const location = useLocation();

  // Replace :id in paths with actual guard ID
  const resolvePathWithId = (path: string) => {
    if (id && path.includes(':id')) {
      return path.replace(':id', id);
    }
    return path;
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
      <div
        className={`shrink-0 overflow-y-auto transition-all duration-300  ${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-white border rounded-md p-3 sticky top-0">
          <div className="text-sm font-semibold mb-3">{cfg?.title ?? title}</div>
          <nav className="text-sm">
            {cfg?.sections?.map((section: any, idx: number) => (
              <div key={idx} className="mb-3">
                {section.label ? <div className="text-xs text-gray-500 uppercase mb-2">{section.label}</div> : null}
                <ul className="space-y-1">
                  {section.items?.map((it: any) => {
                    const resolvedPath = resolvePathWithId(it.path);
                    const isActive = location.pathname === resolvedPath;
                    return (
                      <li key={it.id}>
                        <Link 
                          to={resolvedPath} 
                          className={`block px-3 py-2.5 rounded text-base ${
                            isActive 
                              ? 'bg-orange-50 text-orange-600 font-medium' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {t(it.label)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-800 p-1"
              title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu
                size={20}
                className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            <div className="text-sm font-medium text-gray-700">{title ? t(title) : ''}</div>
          </div>
          <div className="text-sm text-gray-600"></div>
        </div>

        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
