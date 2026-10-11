import { format } from 'sql-formatter';

let isFormatterRegistered = false;

export function registerSqlProviders(monacoInstance: any) {
  if (isFormatterRegistered) return;
  if (!monacoInstance?.languages?.registerDocumentFormattingEditProvider) return;
  isFormatterRegistered = true;

  monacoInstance.languages.registerDocumentFormattingEditProvider('sql', {
    provideDocumentFormattingEdits: (model: any) => {
      try {
        const text = model.getValue();
        const formatted = format(text, {
          language: 'postgresql',
          keywordCase: 'upper',
          tabWidth: 2,
          linesBetweenQueries: 2,
        });
        return [{ range: model.getFullModelRange(), text: formatted }];
      } catch (e) {
        console.warn('SQL format failed:', e);
        return [];
      }
    },
  });
}
