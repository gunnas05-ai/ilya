'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { FILE_LIMITS } from '@kaptan/shared';

interface FileUploadProps {
  label: string;
  accept?: 'image' | 'document' | 'all';
  multiple?: boolean;
  maxFiles?: number;
  value: File[];
  onChange: (files: File[]) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  label, accept = 'image', multiple = true, maxFiles = FILE_LIMITS.maxPhotos,
  value, onChange, error, disabled, className = '',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptTypes = accept === 'image'
    ? FILE_LIMITS.imageTypes.join(',')
    : accept === 'document'
    ? FILE_LIMITS.documentTypes.join(',')
    : [...FILE_LIMITS.imageTypes, ...FILE_LIMITS.documentTypes].join(',');

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.size <= FILE_LIMITS.maxSize);
    const merged = multiple ? [...value, ...newFiles].slice(0, maxFiles) : newFiles.slice(0, 1);
    onChange(merged);
  };

  const removeFile = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {value.length > 0 && <span className="text-slate-500">({value.length}/{maxFiles})</span>}
      </label>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${dragOver ? 'border-blue-400 bg-blue-500/10' :
            error ? 'border-red-400/50' : 'border-[var(--glass-border)] hover:border-slate-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          multiple={multiple}
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
          className="hidden"
        />
        <Upload size={20} className="mx-auto text-slate-500 mb-1" />
        <p className="text-xs text-slate-500">
          Sürükle bırak veya tıkla
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          Max {formatSize(FILE_LIMITS.maxSize)} • {accept === 'image' ? 'JPEG, PNG, WebP' : 'PDF, JPEG, PNG'}
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((file, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg
              bg-white/[0.04] border border-[var(--glass-border)] text-xs">
              {file.type.startsWith('image') ? <Image size={12} className="text-slate-500" /> :
               <FileText size={12} className="text-slate-500" />}
              <span className="text-slate-400 max-w-[120px] truncate">{file.name}</span>
              <span className="text-slate-600">{formatSize(file.size)}</span>
              <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
