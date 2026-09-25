'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '../lib/upload-asset';
import { playNotificationSound } from '../lib/notification-sound';

interface AudioUploadProps {
  value: string;
  onChange: (url: string) => void;
  websiteId?: string;
  disabled?: boolean;
}

export function AudioUpload({ value, onChange, websiteId, disabled = false }: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setError('');
    setUploading(true);
    try {
      const result = await uploadAsset(file, websiteId, 'notifications');
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah suara');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Suara kustom</span>
      <p className="text-xs text-default-500">MP3, WAV, atau OGG — kosongkan untuk memakai nada default.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-default-300 px-3 py-2 text-xs font-medium hover:bg-default-50 disabled:opacity-60"
        >
          {uploading ? 'Mengunggah...' : value ? 'Ganti file' : 'Unggah suara'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => playNotificationSound({ enabled: true, url: value || null })}
          className="rounded-lg border border-default-300 px-3 py-2 text-xs font-medium hover:bg-default-50 disabled:opacity-60"
        >
          Putar contoh
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-50 disabled:opacity-60"
          >
            Hapus
          </button>
        )}
      </div>
      {value && <p className="truncate text-xs text-default-400">{value}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
