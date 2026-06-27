import { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Imperative, platform-styled replacement for window.confirm().
 *
 *   if (!(await confirmDialog('¿Eliminar?'))) return;
 *   if (!(await confirmDialog({ title: 'Quitar vigilante', message: '…', tone: 'danger' }))) return;
 *
 * A single <ConfirmHost/> (mounted once in App) renders the modal. No provider/hook
 * needed at the call site — just await the function.
 */
type Tone = 'default' | 'danger';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: Tone;
}

interface DialogState extends ConfirmOptions {
  id: number;
  resolve: (v: boolean) => void;
}

let listeners: Array<(s: DialogState | null) => void> = [];
let current: DialogState | null = null;
let seq = 0;
const emit = () => listeners.forEach((l) => l(current));

export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const options: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
  return new Promise<boolean>((resolve) => {
    current = { id: ++seq, tone: 'default', ...options, resolve };
    emit();
  });
}

export function ConfirmHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    const l = (s: DialogState | null) => setState(s);
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);

  const close = (val: boolean) => {
    if (current) current.resolve(val);
    current = null;
    emit();
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  if (!state) return null;
  const danger = state.tone === 'danger';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-red-500/15 text-red-500' : 'bg-[#C8860A]/15 text-[#C8860A]'}`}>
            {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-semibold text-foreground">{state.title || (danger ? 'Confirmar acción' : '¿Estás seguro?')}</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{state.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => close(false)}
            className="rounded-xl border border-border/40 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            {state.cancelText || 'Cancelar'}
          </button>
          <button
            autoFocus
            onClick={() => close(true)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#C8860A] hover:bg-[#B37809]'}`}
          >
            {state.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
