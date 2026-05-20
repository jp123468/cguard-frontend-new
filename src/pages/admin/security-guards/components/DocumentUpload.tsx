"use client";

import { useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DocumentFile = {
  file: File;
  previewUrl: string | null;
};

interface DocumentUploadProps {
  label: string;
  description?: string;
  value: DocumentFile | null;
  onChange: (doc: DocumentFile | null) => void;
  accept?: string; // defaults to pdf/png/jpg/webp
  required?: boolean;
}

const DEFAULT_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const MAX_MB = 15;

function fileIcon(file: File) {
  if (file.type === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({
  label,
  description,
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  required = false,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`El archivo "${file.name}" excede el tamaño máximo de ${MAX_MB} MB.`);
      return;
    }

    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    onChange({ file, previewUrl });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`El archivo excede el tamaño máximo de ${MAX_MB} MB.`);
      return;
    }
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    onChange({ file, previewUrl });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
  };

  return (
    <div className="group">
      {/* Label row */}
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-sm font-medium leading-none">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground">— {description}</span>
        )}
      </div>

      {value ? (
        /* File selected state */
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5">
          {/* Preview thumbnail or icon */}
          <div className="flex-shrink-0">
            {value.previewUrl ? (
              <img
                src={value.previewUrl}
                alt={value.file.name}
                className="w-10 h-10 rounded object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                {fileIcon(value.file)}
              </div>
            )}
          </div>
          {/* File meta */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={value.file.name}>
              {value.file.name}
            </p>
            <p className="text-xs text-muted-foreground">{formatSize(value.file.size)}</p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => inputRef.current?.click()}
            >
              Cambiar
            </Button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
              title="Eliminar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty drop zone */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-950/30 transition-colors cursor-pointer py-4 px-3 text-center select-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground/70 dark:text-muted-foreground">
              Arrastra o haz clic para adjuntar
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              PDF, PNG, JPG, WebP — máx. {MAX_MB} MB
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
