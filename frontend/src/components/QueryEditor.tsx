import React, { useRef } from 'react';

interface QueryEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onExecute: (queryToRun?: string) => void;
  isExecuting?: boolean;
}

export const QueryEditor: React.FC<QueryEditorProps> = ({
  value,
  onChange,
  onExecute,
  isExecuting,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Sync line numbers scrolling with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard shortcut handlers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Run Query on Ctrl + Enter or Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end).trim();
        if (selectedText) {
          onExecute(selectedText);
          return;
        }
      }
      onExecute();
      return;
    }

    // 2. Tab key support (insert 2 spaces)
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restore cursor position after update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
      return;
    }

    // 3. Auto-indentation on Enter
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const currentLine = value.substring(0, start).split('\n').pop() || '';
      const match = currentLine.match(/^(\s+)/);
      if (match) {
        e.preventDefault();
        const indent = match[1];
        const newValue =
          value.substring(0, start) + '\n' + indent + value.substring(textarea.selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 1 + indent.length;
            textareaRef.current.selectionEnd = start + 1 + indent.length;
          }
        }, 0);
      }
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#121212] relative font-mono text-xs">
      {/* Line Numbers Gutter */}
      <div
        ref={lineNumbersRef}
        className="w-12 bg-[#181818] border-r border-[#242424] py-3 text-right pr-3 select-none text-gray-600 font-mono text-[11px] overflow-hidden flex-shrink-0"
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i} className="leading-5 h-5">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 relative overflow-hidden flex">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="-- Write your SQL queries here (e.g. SELECT * FROM users;)&#10;-- Press Ctrl + Enter to run selected query or all statements"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="w-full h-full p-3 bg-transparent text-gray-100 placeholder-gray-600 font-mono text-xs leading-5 resize-none outline-none focus:ring-0 border-none select-text whitespace-pre overflow-auto"
          style={{
            tabSize: 2,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        />
      </div>
    </div>
  );
};
