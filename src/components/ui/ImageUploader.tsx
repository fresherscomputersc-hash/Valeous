'use client';

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from './ToastProvider';

interface ImageUploaderProps {
  value: string;
  altValue?: string;
  onChange: (url: string) => void;
  onAltChange?: (alt: string) => void;
  label?: string;
}

export function ImageUploader({
  value,
  altValue = '',
  onChange,
  onAltChange,
  label = 'Cover image',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { notify } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (altValue) formData.append('altText', altValue);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Image upload failed', 'error');
        return;
      }
      onChange(data.asset.url);
      notify('Image uploaded successfully', 'success');
    } catch {
      notify('Network error uploading image', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="label-text">{label} (JPEG, PNG or WebP up to 5 MB)</label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Upload an image or paste an image URL"
            className="input-field"
          />
        </div>
        <label className="btn-secondary cursor-pointer">
          <Upload className="h-4 w-4" />
          <span>{uploading ? 'Uploading…' : 'Upload file'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
      {onAltChange ? (
        <div>
          <label className="label-text">Image alt text (for screen readers)</label>
          <input
            type="text"
            value={altValue}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe what is shown in the image"
            maxLength={180}
            className="input-field"
          />
        </div>
      ) : null}
      {value ? (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          <img
            src={value}
            alt={altValue || 'Uploaded preview'}
            className="h-40 w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
