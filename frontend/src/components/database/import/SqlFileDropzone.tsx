import React, { useRef, useState } from 'react';
import { FileCode } from 'lucide-react';

interface SqlFileDropzoneProps {
  onFileSelect: (file: File) => void;
}

export const SqlFileDropzone: React.FC<SqlFileDropzoneProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
          : 'border-zinc-700/80 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70 text-zinc-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql,text/plain"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
        <FileCode className="w-6 h-6" />
      </div>

      <span className="text-sm font-medium text-zinc-200 mb-1">
        Click to browse or drop .sql file here
      </span>
      <span className="text-xs text-zinc-500">
        Supports schema creation, DDL, table drops, and data inserts
      </span>
    </div>
  );
};
