import { useRef, useState, type KeyboardEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onSend: (text: string) => void;
  onAttach?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onAttach, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttach) onAttach(file);
    e.target.value = '';
  };

  return (
    <div className="flex items-end gap-2 border-t border-zinc-800 bg-zinc-950 px-3 py-2">
      {onAttach && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-zinc-500 hover:text-zinc-300"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            title="Attach dataset"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </>
      )}
      <textarea
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? 'Describe your ML objective…'}
        disabled={disabled}
        className="flex-1 resize-none overflow-hidden bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50 min-h-[36px] max-h-[120px]"
        style={{ height: 'auto' }}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }}
      />
      <Button
        type="button"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={submit}
        disabled={disabled || !value.trim()}
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
