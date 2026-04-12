import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Server } from 'lucide-react';
import { useAPISaveConnection } from '@/hooks/api';
import type { CreateConnection } from 'src/electron/interfaces/requests/create-connection.request';

type Values = {
  url: string;
  host: string;
  database: string;
  port: string;
  username: string;
  password: string;
};

const INITIAL_VALUES: Values = {
  url: '',
  host: '',
  database: '',
  port: '5432',
  username: '',
  password: '',
};

export function AddPostgresConnectionDialog({
  openState,
  setOpenState,
  onTest,
  onConnect,
}: {
  openState: boolean;
  setOpenState: (o: boolean) => void;
  onTest?: (v: Values) => void;
  onConnect?: (v: Values) => void;
}) {
  const [method, setMethod] = useState<'host' | 'url'>('host');
  const [values, setValues] = useState<Values>(INITIAL_VALUES);
  const [validationError, setValidationError] = useState<string | null>(null);
  const {
    mutateAsync: saveConnection,
    isPending,
    error: saveError,
    reset: resetSaveConnection,
  } = useAPISaveConnection();

  const urlDisabled = method === 'host';
  const hostDisabled = method === 'url';
  const errorMessage = validationError ?? saveError?.message ?? null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(INITIAL_VALUES);
      setMethod('host');
      setValidationError(null);
      resetSaveConnection();
    }
    setOpenState(nextOpen);
  };

  const buildConnectionPayload = (): CreateConnection => {
    if (method === 'url') {
      return {
        connector: 'postgres',
        type: 'url',
        creds: {
          url: values.url.trim(),
        },
      };
    }

    const parsedPort = Number.parseInt(values.port, 10);
    const sanitizedPort = Number.isNaN(parsedPort) ? undefined : parsedPort;

    return {
      connector: 'postgres',
      type: 'credentials',
      creds: {
        host: values.host.trim(),
        database: values.database.trim(),
        user: values.username.trim(),
        password: values.password,
        port: sanitizedPort,
      },
      is_default: false,
    };
  };

  const validateValues = () => {
    if (method === 'url') {
      return values.url.trim() ? null : 'Please provide a valid connection URL.';
    }

    if (
      !values.host.trim() ||
      !values.database.trim() ||
      !values.username.trim() ||
      !values.password
    ) {
      return 'Host, database, username, and password are required.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateValues();
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    setValidationError(null);

    try {
      await saveConnection({
        connection: buildConnectionPayload(),
        setAsDefault: false,
      });
      onConnect?.(values);
      handleOpenChange(false);
    } catch (error) {
      // the hook already exposes the error that we surface below
      console.error('Failed to save connection', error);
    }
  };

  return (
    <Dialog open={openState} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <img src="/postgresql.svg" alt="pg" className="size-6" />
            <DialogTitle>Postgres connection</DialogTitle>
          </div>
          <DialogDescription>Enter your PostgreSQL connection details.</DialogDescription>
        </DialogHeader>
        <div className="mb-3">
          <div className="text-xs mb-1">Connect by</div>
          <div className="inline-flex items-center rounded-md border bg-muted p-1">
            <Button
              type="button"
              size="sm"
              className="gap-1 rounded-sm"
              variant={method === 'host' ? 'default' : 'ghost'}
              onClick={() => setMethod('host')}
              aria-pressed={method === 'host'}
            >
              <Server className="size-4" />
              Host
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1 rounded-sm"
              variant={method === 'url' ? 'default' : 'ghost'}
              onClick={() => setMethod('url')}
              aria-pressed={method === 'url'}
            >
              <Link className="size-4" />
              URL
            </Button>
          </div>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs mb-1">url</label>
            <Input
              placeholder="postgres://user:pass@host:port/db"
              value={values.url}
              disabled={urlDisabled || isPending}
              onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">host</label>
            <Input
              disabled={hostDisabled || isPending}
              value={values.host}
              onChange={(e) => setValues((v) => ({ ...v, host: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">database</label>
              <Input
                disabled={hostDisabled || isPending}
                value={values.database}
                onChange={(e) => setValues((v) => ({ ...v, database: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">port</label>
              <Input
                disabled={hostDisabled || isPending}
                value={values.port}
                onChange={(e) => setValues((v) => ({ ...v, port: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">username</label>
            <Input
              disabled={hostDisabled || isPending}
              value={values.username}
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs mb-1">password</label>
            <Input
              disabled={hostDisabled || isPending}
              type="password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
          </div>
          {errorMessage && <p className="text-xs text-destructive text-right">{errorMessage}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onTest?.(values)}
            >
              Test Connection
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
