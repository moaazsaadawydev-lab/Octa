import React from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Braces,
  File,
  Code2,
  Terminal,
  Database,
  Image as ImageIcon,
} from 'lucide-react';

interface FileIconProps {
  isDir: boolean;
  isOpen?: boolean;
  name: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ isDir, isOpen, name, className = 'w-4 h-4' }) => {
  if (isDir) {
    return isOpen ? (
      <FolderOpen className={`${className} text-amber-500 fill-amber-500/20`} />
    ) : (
      <Folder className={`${className} text-amber-500 fill-amber-500/20`} />
    );
  }

  const ext = name.toLowerCase().split('.').pop() || '';

  switch (ext) {
    case 'html':
    case 'htm':
      return <Code2 className={`${className} text-orange-500`} />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <Code2 className={`${className} text-blue-500`} />;
    case 'js':
    case 'jsx':
    case 'mjs':
      return <FileCode className={`${className} text-yellow-400`} />;
    case 'ts':
    case 'tsx':
      return <FileCode className={`${className} text-sky-400`} />;
    case 'py':
      return <FileCode className={`${className} text-emerald-400`} />;
    case 'go':
      return <FileCode className={`${className} text-cyan-400`} />;
    case 'json':
      return <Braces className={`${className} text-amber-400`} />;
    case 'sql':
      return <Database className={`${className} text-indigo-400`} />;
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText className={`${className} text-slate-400`} />;
    case 'sh':
    case 'bash':
    case 'ps1':
    case 'bat':
      return <Terminal className={`${className} text-emerald-400`} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'webp':
      return <ImageIcon className={`${className} text-purple-400`} />;
    default:
      return <File className={`${className} text-slate-400`} />;
  }
};
