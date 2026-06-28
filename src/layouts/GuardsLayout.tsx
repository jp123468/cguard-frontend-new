import React, { ReactNode, useState } from 'react';
import guardsNav from '@/data/guards-nav.json';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation } from 'react-router-dom';
import Breadcrumb from '@/components/ui/breadcrumb';
import { Menu} from 'lucide-react';

import securityGuardService from '@/lib/api/securityGuardService';
type Props = {
  navKey: string;
  title?: string;
  children: ReactNode;
};

export default function GuardsLayout({ navKey, title, children }: Props) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const cfg: any = (guardsNav as any)[navKey] || null;
  const [guardFullName, setGuardFullName] = useState<string>('');
  const { id } = useParams();
  const location = useLocation();

  // Labels to hide (normalized, lowercase, without accents)
  const hiddenLabels = [
    'disponibilidad',
    'indicadores claves de vigilantes',
    'indicadores clave de vigilantes',
    'indicadores clave',
    'recordatorios',
    'archivos',
    'conjunto de habilidades',
    'habilidades',
    'departamento',
    'configuracion',
    'configuración',
  ];

  const normalize = (s: any) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

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
        <div className="bg-card border border-border rounded-md p-3 sticky top-0">
          <div className="text-sm font-semibold mb-3">{guardFullName || (title ? t(title) : (cfg?.title ? t(cfg.title) : ''))}</div>
          <nav className="text-sm">
            {cfg?.sections?.map((section: any, idx: number) => (
              <div key={idx} className="mb-3">
                {section.label ? <div className="text-xs text-muted-foreground uppercase mb-2">{section.label}</div> : null}
                <ul className="space-y-1">
                  {(
                    section.items || []
                  )
                    .filter((it: any) => {
                      const raw = normalize(it.label);
                      const translated = normalize(t(it.label));
                      return !hiddenLabels.some(h => raw.includes(h) || translated.includes(h));
                    })
                    .map((it: any) => {
                      const resolvedPath = resolvePathWithId(it.path);
                      const isActive = location.pathname === resolvedPath;
                      return (
                        <li key={it.id}>
                          <Link 
                            to={resolvedPath} 
                            className={`block px-3 py-2.5 rounded text-base ${
                              isActive 
                                ? 'bg-primary/10 text-primary font-medium' 
                                : 'text-foreground hover:bg-accent'
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
        <div className="bg-card border-b border-border rounded-md p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground p-1"
              title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu
                size={20}
                className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>
            <div className="text-sm font-medium text-foreground">{title ? t(title) : ''}</div>
          </div>
          <div className="text-sm text-muted-foreground"></div>
        </div>

        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
