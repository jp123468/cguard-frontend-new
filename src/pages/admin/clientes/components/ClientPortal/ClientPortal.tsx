import React, { useState } from 'react';
import { Globe, Mail, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { clientService } from '@/lib/api/clientService';
import { toast } from 'sonner';

type Props = { client?: any };

type DialogState = 'idle' | 'confirm' | 'sending' | 'sent' | 'error';

export default function ClientPortal({ client }: Props) {
  const [dialog, setDialog] = useState<DialogState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sentTo, setSentTo] = useState('');

  const email = client?.email || client?.contactEmail || '';
  const name = client?.name || client?.contactName || 'este cliente';
  const userId = client?.userId;

  async function handleSendInvitation() {
    if (!userId) {
      setErrorMsg(
        'Este cliente no tiene un usuario vinculado. Edita el cliente y agrega un correo electrónico para crear su usuario primero.',
      );
      setDialog('error');
      return;
    }
    setDialog('sending');
    try {
      const result = await clientService.sendPortalInvitation(userId, email || undefined);
      setSentTo(result?.recipient || email);
      setDialog('sent');
      toast.success('Invitación enviada correctamente');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo enviar la invitación. Intenta de nuevo.';
      setErrorMsg(msg);
      setDialog('error');
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Acceso al Portal del Cliente
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Permite que el cliente acceda al portal para ver sus facturas, vigilantes asignados y más.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-amber-500/10 border border-amber-200 rounded-lg p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700 space-y-1">
          <p className="font-medium">¿Cómo funciona?</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>Se envía un correo de invitación a <strong>{email || 'la dirección del cliente'}</strong></li>
            <li>El cliente hace clic en el enlace y crea su contraseña</li>
            <li>Inicia sesión en la app con su correo y contraseña</li>
          </ul>
        </div>
      </div>

      {/* Client summary */}
      <div className="bg-card border rounded-lg p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold text-sm">
            {(name || '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email || 'Sin correo electrónico'}</p>
        </div>
        {userId ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Usuario vinculado
          </span>
        ) : (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
            Sin usuario
          </span>
        )}
      </div>

      {/* Action button */}
      {dialog === 'idle' && (
        <button
          onClick={() => setDialog('confirm')}
          disabled={!email && !userId}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-fit"
        >
          <Mail className="w-4 h-4" />
          Enviar invitación al portal
        </button>
      )}

      {/* Sent state */}
      {dialog === 'sent' && (
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-200 rounded-lg p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">¡Invitación enviada!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Se envió un correo de invitación a <strong>{sentTo}</strong>. El cliente debe revisar su bandeja de entrada.
            </p>
            <button
              onClick={() => setDialog('idle')}
              className="mt-3 text-xs text-green-700 underline hover:text-green-900"
            >
              Enviar otra invitación
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {dialog === 'error' && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Error al enviar la invitación</p>
            <p className="text-sm text-red-700 mt-0.5">{errorMsg}</p>
            <button
              onClick={() => { setDialog('idle'); setErrorMsg(''); }}
              className="mt-3 text-xs text-red-700 underline hover:text-red-900"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {dialog === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Enviar invitación al portal</h3>
                <p className="text-xs text-muted-foreground">Esta acción enviará un correo a:</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg px-4 py-3 text-center">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-sm text-primary">{email || '(sin correo registrado)'}</p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              El cliente recibirá un enlace para crear su contraseña y acceder al portal.
            </p>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setDialog('idle')}
                className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendInvitation}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending state */}
      {dialog === 'sending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-xs p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Enviando invitación…</p>
          </div>
        </div>
      )}
    </div>
  );
}
