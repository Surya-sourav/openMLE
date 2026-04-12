import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Model = {
  id: string;
  name: string;
  icon: string;
};

type AiModelDropdownProps = {
  value?: Model | null;
  onChange?: (model: Model) => void;
  onAddModel?: () => void;
  className?: string;
};

const MODELS: Model[] = [
  { id: 'openai', name: 'OpenAI', icon: '/openai.svg' },
  { id: 'claude', name: 'Claude', icon: '/claude.svg' },
  { id: 'gemini', name: 'Gemini', icon: '/google-gemini.svg' },
];

export function AiModelDropdown({ value, onChange, onAddModel, className }: AiModelDropdownProps) {
  const selected = value ?? MODELS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
            className,
          )}
          title="Select AI model"
        >
          <img src="/chevron-down.svg" alt="" className="size-4 icon-mono" />
          <img src={selected.icon} alt="" className="size-4 icon-mono" />
          <span>{selected.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MODELS.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => onChange?.(m)} className="text-xs">
            <img src={m.icon} alt="" className="mr-2 size-4 icon-mono" />
            {m.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={onAddModel} className="text-xs">
          <img src="/plus.svg" alt="" className="mr-2 size-4 icon-mono" />
          Add Model
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
