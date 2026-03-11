import React, { useRef } from 'react';

export interface CompanyDocument {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface Props {
  documents: CompanyDocument[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
}

export default function CompanyDocumentsSection({ documents, onUpload, onDelete, canEdit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="border rounded-md p-4 bg-white mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-md">Documentos Legales de la Empresa</h4>
        {canEdit && (
          <button
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
            onClick={() => fileInputRef.current?.click()}
          >
            Subir Documento
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={!canEdit}
        />
      </div>
      <ul className="space-y-2">
        {documents.length === 0 && <li className="text-xs text-gray-400">No hay documentos cargados.</li>}
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between border-b pb-1">
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">{doc.name}</a>
            <span className="text-xs text-gray-500 ml-2">{doc.type}</span>
            {canEdit && (
              <button
                className="ml-4 text-xs text-red-500 hover:underline"
                onClick={() => onDelete(doc.id)}
              >
                Eliminar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
