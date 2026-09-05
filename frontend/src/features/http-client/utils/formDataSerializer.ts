import { FormDataField, FormFileMeta, FormFieldPayload } from '../types';

export function fileToBase64(file: File | Blob | any): Promise<string> {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        const commaIdx = file.indexOf(',');
        resolve(commaIdx !== -1 ? file.substring(commaIdx + 1) : file);
        return;
      }
      resolve(file);
      return;
    }
    if (file.base64 && typeof file.base64 === 'string') {
      let b = file.base64;
      if (b.startsWith('data:')) {
        const commaIdx = b.indexOf(',');
        b = commaIdx !== -1 ? b.substring(commaIdx + 1) : b;
      }
      resolve(b);
      return;
    }
    const isBlob = typeof Blob !== 'undefined' && (file instanceof Blob || file instanceof File || (typeof file === 'object' && file !== null && typeof file.slice === 'function'));
    if (isBlob) {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const res = (reader.result as string) || '';
          const commaIdx = res.indexOf(',');
          resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      } catch {
        resolve('');
        return;
      }
    }
    resolve('');
  });
}

export async function serializeFormDataRows(
  rows: FormDataField[],
  liveFileObjects?: Map<string, File>
): Promise<FormFieldPayload[]> {
  const formDataPayload: FormFieldPayload[] = [];

  for (const row of rows) {
    if (!row.enabled || !row.key.trim()) continue;
    if (row.type === 'file') {
      const fileNames: string[] = [];
      const filePaths: string[] = [];
      const fileBase64List: string[] = [];
      const rawFiles: FormFileMeta[] =
        row.files && row.files.length > 0
          ? row.files
          : (row as any).file
          ? [{
              id: 'f',
              name: (row as any).fileName || 'upload.bin',
              size: (row as any).file?.size || 0,
              type: (row as any).file?.type || 'application/octet-stream',
              file: (row as any).file,
              filePath: (row as any).filePath || '',
              base64: (row as any).base64Data || '',
            }]
          : [];

      for (const f of rawFiles) {
        fileNames.push(f.name || 'file');
        filePaths.push(f.filePath || (f.file && (f.file as any).path) || '');
        let b64 = f.base64 || '';
        if (!b64) {
          const cand = (f.id && liveFileObjects?.get(f.id)) || f.file || (row as any).file;
          if (cand) b64 = await fileToBase64(cand);
        }
        if (b64.startsWith('data:')) {
          const cIdx = b64.indexOf(',');
          b64 = cIdx !== -1 ? b64.substring(cIdx + 1) : b64;
        }
        fileBase64List.push(b64);
      }

      formDataPayload.push({
        key: row.key.trim(),
        value: row.value || '',
        type: 'file',
        fileName: fileNames[0] || 'upload.bin',
        filePath: filePaths[0] || (row.filePath ? String(row.filePath).trim() : ''),
        base64Data: fileBase64List[0] || row.base64Data || '',
        contentType: rawFiles[0]?.type || 'application/octet-stream',
        fileNames,
        filePaths,
        fileBase64: fileBase64List,
      });
    } else {
      formDataPayload.push({ key: row.key.trim(), value: String(row.value ?? ''), type: 'text' });
    }
  }

  return formDataPayload;
}
