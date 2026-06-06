"use client";

import { useRef, useState, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  Shield,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProfilePhotoCaptureProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  previewUrl?: string | null;
}

export default function ProfilePhotoCapture({ value, onChange, previewUrl }: ProfilePhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  // Compute current preview
  const currentPreview = capturedUrl
    ?? (value instanceof File ? URL.createObjectURL(value) : typeof value === "string" ? value : null)
    ?? previewUrl
    ?? null;

  // ─── Camera helpers ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraReady(false);
    setCameraOpen(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Por favor, permita el acceso a la cámara en su navegador."
          : err?.name === "NotFoundError"
          ? "No se encontró una cámara en este dispositivo."
          : "No se pudo acceder a la cámara. Intente usar 'Seleccionar archivo' en su lugar.";
      setCameraError(msg);
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraReady(false);
  }, [stream]);

  const closeCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setCameraError(null);
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedBlob(null);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    startCamera();
  }, [capturedUrl, startCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `guard-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    onChange(file);
    setCameraOpen(false);
    setCapturedBlob(null);
    setCapturedUrl(null);
  }, [capturedBlob, onChange]);

  // ─── Library helper ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Photo preview + action buttons */}
      <div className="flex flex-col items-center gap-4">
        {/* Avatar circle */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
            {currentPreview ? (
              <img
                src={currentPreview}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Shield className="w-10 h-10" />
                <span className="text-[10px] font-medium tracking-wide uppercase">Foto</span>
              </div>
            )}
          </div>
          {currentPreview && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow transition-colors"
              title="Eliminar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Instruction label */}
        <p className="text-xs text-center text-muted-foreground max-w-[200px] leading-snug">
          Foto del guardia con uniforme completo en fondo neutro
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCamera}
            className="gap-1.5"
          >
            <Camera className="w-4 h-4" />
            Tomar foto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Galería
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Camera Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => { if (!open) closeCamera(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Capturar Foto del Guardia
            </DialogTitle>
          </DialogHeader>

          {/* Instructions banner */}
          <div className="rounded-lg bg-blue-500/10 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-600 dark:text-blue-300">
            <p className="font-semibold mb-1 flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Instrucciones para la foto:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>El guardia debe vestir <strong>uniforme completo</strong> y presentable</li>
              <li>Use un fondo <strong>neutro</strong> (pared blanca o gris)</li>
              <li>La foto debe mostrar <strong>rostro y parte superior del cuerpo</strong></li>
              <li>Buena iluminación — evite sombras y contraluz</li>
              <li>No use lentes oscuros ni cubiertas en la cabeza</li>
            </ul>
          </div>

          {cameraError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          {/* Video / captured preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {capturedUrl ? (
              <img src={capturedUrl} alt="Foto capturada" className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                muted
              />
            )}
            {!cameraReady && !capturedUrl && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                Iniciando cámara…
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Buttons */}
          <div className="flex justify-center gap-3 pt-1">
            {capturedUrl ? (
              <>
                <Button type="button" variant="outline" onClick={retakePhoto} className="gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  Retomar
                </Button>
                <Button type="button" onClick={confirmPhoto} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  <Check className="w-4 h-4" />
                  Usar esta foto
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={closeCamera}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={!cameraReady}
                  onClick={capturePhoto}
                  className="gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  Capturar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
