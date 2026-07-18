import { useEffect } from 'react';

/**
 * Lightweight right-click menu for the Horario views. Render it when open and
 * pass the click coordinates; it closes on any outside mousedown, scroll or
 * Escape. Use `label: '—'` for a separator row.
 */

export interface CtxItem {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface CtxMenuState {
  x: number;
  y: number;
  items: CtxItem[];
}

export default function ContextMenu({ menu, onClose }: { menu: CtxMenuState; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', esc);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', esc);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  const rows = menu.items.filter(i => i.label !== '—').length;
  const x = Math.max(4, Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 224));
  const y = Math.max(4, Math.min(menu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - rows * 34 - 16));

  return (
    <div
      role="menu"
      className="fixed z-[90] min-w-[200px] max-w-[280px] rounded-xl border border-border/40 bg-card shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {menu.items.map((it, i) =>
        it.label === '—' ? (
          <div key={i} className="my-1 h-px bg-border/30" />
        ) : (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => { onClose(); it.onClick?.(); }}
            className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-default ${it.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground hover:bg-muted/40'}`}
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}
