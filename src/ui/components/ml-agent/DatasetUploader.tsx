import { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useUploadDataset } from '@/hooks/api/ml-agent';

export function DatasetUploader({ onSuccess }: { onSuccess?: () => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadDataset();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      upload.mutate(
        { name: file.name, buffer, mimeType: file.type },
        { onSuccess: () => { setTimeout(() => onSuccess?.(), 600); } },
      );
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-500'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <FileSpreadsheet className="w-8 h-8 text-zinc-400" />
      <div className="text-center">
        <p className="text-sm text-zinc-300">Drop a CSV or Excel file here</p>
        <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
      </div>
      {upload.isPending && <p className="text-xs text-blue-400 animate-pulse">Uploading...</p>}
      {upload.isError && <p className="text-xs text-red-400">{(upload.error as Error).message}</p>}
      {upload.isSuccess && <p className="text-xs text-green-400">✓ Uploaded successfully</p>}
    </div>
  );
}
