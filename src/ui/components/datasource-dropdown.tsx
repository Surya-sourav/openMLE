import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type DataSource = {
  id: string;
  name: string;
  icon?: string;
};

type DataSourceDropdownProps = {
  value?: DataSource | null;
  onChange?: (ds: DataSource) => void;
  className?: string;
};

const DEFAULT_SOURCES: DataSource[] = [
  { id: 'prod', name: 'production_db', icon: '/database.svg' },
  { id: 'stage', name: 'staging_db', icon: '/database.svg' },
];

export function DataSourceDropdown({ value, onChange, className }: DataSourceDropdownProps) {
  const selected = value ?? DEFAULT_SOURCES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs',
            className,
          )}
          title="Select datasource"
        >
          <img src="/chevron-down.svg" alt="" className="size-4 icon-mono" />
          <img src={selected.icon ?? '/database.svg'} alt="" className="size-4 icon-mono" />
          <span>{selected.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {DEFAULT_SOURCES.map((ds) => (
          <DropdownMenuItem key={ds.id} onClick={() => onChange?.(ds)} className="text-xs">
            <img src={ds.icon ?? '/database.svg'} alt="" className="mr-2 size-4 icon-mono" />
            {ds.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
