import { useState } from 'react';
import { Settings, Save, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type ProviderId = 'anthropic' | 'openai';

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<Record<ProviderId, string>>({ anthropic: '', openai: '' });
  const [editing, setEditing] = useState<Record<ProviderId, boolean>>({ anthropic: false, openai: false });
  const [saved, setSaved] = useState<Record<ProviderId, boolean>>({ anthropic: false, openai: false });

  const saveKey = async (id: ProviderId) => {
    try {
      await window.llm.saveConnection({ provider: id, key: keys[id], model: '' });
      setSaved((s) => ({ ...s, [id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000);
    } catch (e) {
      console.error('Failed to save key', e);
    }
    setEditing((e) => ({ ...e, [id]: false }));
  };

  const rows: { id: ProviderId; label: string }[] = [
    { id: 'anthropic', label: 'Anthropic (Claude)' },
    { id: 'openai', label: 'OpenAI' },
  ];

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
        onClick={() => setOpen(true)}
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure API keys for LLM providers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {rows.map(({ id, label }) => (
              <div key={id} className="flex items-center gap-3">
                <div className="w-44 text-xs text-zinc-400">{label}</div>
                <Input
                  type="password"
                  className="flex-1 text-xs"
                  value={keys[id]}
                  onChange={(e) => setKeys((k) => ({ ...k, [id]: e.target.value }))}
                  disabled={!editing[id]}
                  placeholder="sk-…"
                />
                {!editing[id] ? (
                  <Button size="icon" variant="ghost" onClick={() => setEditing((e) => ({ ...e, [id]: true }))}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1" onClick={() => saveKey(id)}>
                    <Save className="w-3 h-3" />
                    {saved[id] ? 'Saved!' : 'Save'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
