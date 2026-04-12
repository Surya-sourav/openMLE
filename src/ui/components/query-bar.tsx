import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataSourceDropdown } from '@/components/datasource-dropdown';
import { AiModelDropdown } from '@/components/ai-model-dropdown';

type QueryBarProps = {
  onSend?: (payload: {
    query: string;
    ds: { id: string; name: string };
    model: { id: string; name: string };
  }) => void;
  onAddModel?: () => void;
};

export function QueryBar({ onSend, onAddModel }: QueryBarProps) {
  const [query, setQuery] = useState('');
  const [ds, setDs] = useState<{ id: string; name: string }>({
    id: 'prod',
    name: 'production_db',
  });
  const [model, setModel] = useState<{
    id: string;
    name: string;
    icon: string;
  }>({
    id: 'openai',
    name: 'OpenAI',
    icon: '/openai.svg',
  });

  return (
    <div className="border-t bg-background px-6 py-8 w-full">
      <form
        className="relative w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim()) return;
          onSend?.({ query, ds, model });
          setQuery('');
        }}
      >
        <Input
          className="h-12 w-full pr-28"
          placeholder="Start chatting with your data.."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10">
          Send
        </Button>
      </form>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <DataSourceDropdown value={ds} onChange={(v) => setDs(v)} />
        <AiModelDropdown value={model} onChange={(v) => setModel(v)} onAddModel={onAddModel} />
      </div>
    </div>
  );
}
