import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';

type ProviderId = 'openai' | 'claude' | 'gemini';

type KeysState = {
  openai: string;
  claude: string;
  gemini: string;
};

export function AddModelApiKeysDialog({
  openState,
  setOpenState,
  onSaveKey,
}: {
  openState: boolean;
  setOpenState: (o: boolean) => void;
  onSaveKey?: (provider: ProviderId, keyValue: string) => void;
}) {
  const [keys, setKeys] = useState<KeysState>({
    openai: '',
    claude: '',
    gemini: '',
  });
  const [editing, setEditing] = useState<Record<ProviderId, boolean>>({
    openai: false,
    claude: false,
    gemini: false,
  });

  function Row({ id, label, iconSrc }: { id: ProviderId; label: string; iconSrc: string }) {
    const isEditing = editing[id];
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        const el = inputRef.current;
        el.focus({ preventScroll: true });
        const len = el.value?.length ?? 0;
        try {
          el.setSelectionRange(len, len);
        } catch {}
      }
    }, [isEditing]);
    return (
      <div className="flex items-center gap-3">
        <img src={iconSrc} alt="" className="size-5 icon-mono" />
        <div className="w-28 text-xs text-muted-foreground">{label}</div>
        <Input
          type="text"
          className="flex-1"
          ref={inputRef}
          value={keys[id]}
          onChange={(e) =>
            setKeys((k) => ({
              ...k,
              [id]: e.target.value,
            }))
          }
          disabled={!isEditing}
          placeholder="Enter API key"
        />
        {!isEditing ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() =>
              setEditing((e) => ({
                ...e,
                [id]: true,
              }))
            }
            aria-label={`Edit ${label} key`}
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="gap-1"
            onClick={() => {
              onSaveKey?.(id, keys[id]);
              setEditing((e) => ({
                ...e,
                [id]: false,
              }));
            }}
          >
            <Save className="size-4" />
            Save
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open={openState} onOpenChange={setOpenState}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add AI model API keys</DialogTitle>
          <DialogDescription>Configure keys for your preferred providers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Row id="openai" label="OpenAI" iconSrc="/openai.svg" />
          <Row id="claude" label="Claude" iconSrc="/claude.svg" />
          <Row id="gemini" label="Gemini" iconSrc="/google-gemini.svg" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
