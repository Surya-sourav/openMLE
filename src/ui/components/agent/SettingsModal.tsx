import { useState } from 'react';
import { Settings, Save, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama-3.3-70b');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      await window.llm.saveConnection({
        provider: 'cerebras',
        key: apiKey.trim(),
        model: model.trim() || 'llama-3.3-70b',
        is_default: true,
      });
      setStatus('saved');
      setEditing(false);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const MODELS = [
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B (recommended)' },
    { value: 'llama3.1-8b',   label: 'Llama 3.1 8B (fast)' },
    { value: 'llama3.1-70b',  label: 'Llama 3.1 70B' },
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
        <DialogContent className="sm:max-w-[480px] bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Settings</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Configure your Cerebras API key to run the ML agent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Provider</span>
              <span className="text-xs px-2 py-0.5 rounded bg-orange-900/40 text-orange-300 font-mono">
                Cerebras
              </span>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">API Key</label>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  className="flex-1 text-xs bg-zinc-950 border-zinc-700 text-zinc-200"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!editing}
                  placeholder="csk-…"
                />
                {!editing ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-zinc-500 hover:text-zinc-300"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1 shrink-0"
                    disabled={!apiKey.trim() || status === 'saving'}
                    onClick={handleSave}
                  >
                    <Save className="w-3 h-3" />
                    {status === 'saving' ? 'Validating…' : 'Save'}
                  </Button>
                )}
              </div>
            </div>

            {/* Model selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Model</label>
              <select
                className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!editing}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Status feedback */}
            {status === 'saved' && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                API key validated and saved as default.
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-start gap-2 text-xs text-red-400">
                <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg || 'Validation failed — check your API key.'}</span>
              </div>
            )}

            {/* Help text */}
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Get a free API key at{' '}
              <span className="text-zinc-400 font-mono">cloud.cerebras.ai</span>.
              The key is stored locally in the app database — never sent to any external service other than Cerebras.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
