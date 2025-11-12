import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image as ImageIcon,
  Type,
  Eraser,
} from 'lucide-react';
import { cn } from './ui/utils';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

const toolbarButtons = [
  { icon: Bold, label: 'Bold', command: 'bold' },
  { icon: Italic, label: 'Italic', command: 'italic' },
  { icon: Underline, label: 'Underline', command: 'underline' },
  { icon: Type, label: 'Heading', command: 'formatBlock', value: 'h3' },
  { icon: List, label: 'Bullet list', command: 'insertUnorderedList' },
  { icon: ListOrdered, label: 'Numbered list', command: 'insertOrderedList' },
  { icon: Quote, label: 'Quote', command: 'formatBlock', value: 'blockquote' },
];

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = prompt('Enter URL');
    if (url) {
      handleCommand('createLink', url);
    }
  };

  const handleImage = () => {
    const url = prompt('Enter image URL');
    if (url) {
      handleCommand('insertImage', url);
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      onChange('');
    }
  };

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white/70 backdrop-blur', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        {toolbarButtons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={() => handleCommand(button.command, button.value)}
            className="rounded-lg border border-transparent p-1.5 text-slate-600 transition hover:border-slate-200 hover:bg-white"
            aria-label={button.label}
          >
            <button.icon className="size-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={handleLink}
          className="rounded-lg border border-transparent p-1.5 text-slate-600 transition hover:border-slate-200 hover:bg-white"
          aria-label="Insert link"
        >
          <Link2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={handleImage}
          className="rounded-lg border border-transparent p-1.5 text-slate-600 transition hover:border-slate-200 hover:bg-white"
          aria-label="Insert image"
        >
          <ImageIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto rounded-lg border border-transparent p-1.5 text-slate-600 transition hover:border-slate-200 hover:bg-white"
          aria-label="Clear content"
        >
          <Eraser className="size-4" />
        </button>
      </div>
      <div className="relative">
        {!value && placeholder && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          className="min-h-[200px] w-full px-4 py-3 text-slate-800 outline-none"
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || '')}
        />
      </div>
    </div>
  );
}
