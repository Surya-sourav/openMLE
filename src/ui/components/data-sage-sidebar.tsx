import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import { DatabaseTree, type TreeNode } from './database-tree';
import { cn } from '@/lib/utils';
import { useAPIGetAllConnections, useAPIDeleteConnection } from '@/hooks/api';
import type { Connection } from 'src/electron/internal-database/schemas';
import type {
  DatabaseCredentials,
  UrlCredentials,
} from 'src/electron/interfaces/connectioncredentials.interface';

export function DataSageSidebar({ onAddDataSource }: { onAddDataSource: () => void }) {
  const [activeTab, setActiveTab] = useState<'database' | 'chat'>('database');
  const {
    data: connections,
    isLoading: isLoadingConnections,
    isError: isConnectionsError,
    error: connectionsError,
  } = useAPIGetAllConnections({});
  const { mutate: deleteConnection } = useAPIDeleteConnection();
  const databaseNodes = useMemo(() => buildConnectionTreeNodes(connections ?? []), [connections]);
  const hasConnections = databaseNodes.length > 0;
  let databaseContent = null;

  if (isLoadingConnections) {
    databaseContent = (
      <div className="p-2 text-sm text-muted-foreground">Loading connections...</div>
    );
  } else if (isConnectionsError) {
    databaseContent = (
      <div className="p-2 text-sm text-destructive">
        Failed to load connections
        {connectionsError?.message ? `: ${connectionsError.message}` : '.'}
      </div>
    );
  } else if (hasConnections) {
    databaseContent = (
      <DatabaseTree nodes={databaseNodes} onDeleteConnection={(id) => deleteConnection({ id })} />
    );
  } else {
    databaseContent = (
      <div className="p-2 text-sm text-muted-foreground">
        No data sources yet. Add one to get started.
      </div>
    );
  }

  const tabButtonClass = (active: boolean) =>
    cn(
      'p-1 rounded hover:bg-accent transition-colors',
      active && 'bg-accent text-accent-foreground',
    );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="font-bold">DataSage</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={activeTab === 'database'}
              className={tabButtonClass(activeTab === 'database')}
              onClick={() => setActiveTab('database')}
              title="Database"
            >
              <img src="/database.svg" alt="Database" className="size-5 icon-mono" />
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'chat'}
              className={tabButtonClass(activeTab === 'chat')}
              onClick={() => setActiveTab('chat')}
              title="Chat"
            >
              <img src="/message-square.svg" alt="Chat" className="size-5 icon-mono" />
            </button>
          </div>
        </div>
        <Separator />
      </SidebarHeader>
      <SidebarContent>
        {activeTab === 'database' ? (
          databaseContent
        ) : (
          <div className="p-2 text-sm text-muted-foreground">Chat view placeholder</div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <Button type="button" variant="outline" className="w-full" onClick={onAddDataSource}>
            Add data source
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const CONNECTOR_ICONS: Record<string, string> = {
  postgres: '/postgresql.svg',
};

const DEFAULT_CONNECTOR_ICON = '/database.svg';

function buildConnectionTreeNodes(connections: Connection[]): TreeNode[] {
  return connections.map((connection) => {
    const icon = getConnectorIcon(connection.connector);
    const metadata: TreeNode['metadata'] = {
      connector: connection.connector,
      connectionId: connection.id,
      isDefault: Boolean(connection.is_default),
    };

    if (icon === CONNECTOR_ICONS.postgres) {
      metadata.monochrome = false;
    }

    return {
      type: 'data_source',
      icon,
      name: formatConnectionLabel(connection),
      metadata,
    };
  });
}

function getConnectorIcon(connector?: string | null) {
  if (!connector) {
    return DEFAULT_CONNECTOR_ICON;
  }

  const normalized = connector.toLowerCase();
  return CONNECTOR_ICONS[normalized] ?? DEFAULT_CONNECTOR_ICON;
}

function formatConnectionLabel(connection: Connection) {
  const baseLabel = deriveConnectionName(connection);
  return connection.is_default ? `${baseLabel} (default)` : baseLabel;
}

function deriveConnectionName(connection: Connection) {
  if (connection.type === 'url' && isUrlCredentials(connection.creds)) {
    try {
      const parsed = new URL(connection.creds.url);
      return parsed.hostname || connection.creds.url;
    } catch {
      return connection.creds.url;
    }
  }

  if (connection.type === 'credentials' && isDatabaseCredentials(connection.creds)) {
    const databaseName = connection.creds.database?.trim();
    const hostName = connection.creds.host?.trim();
    if (databaseName && hostName) {
      return `${databaseName}@${hostName}`;
    }
    if (databaseName) {
      return databaseName;
    }
    if (hostName) {
      return hostName;
    }
    if (connection.creds.user) {
      return connection.creds.user;
    }
  }

  return connection.connector ?? `Connection #${connection.id}`;
}

function isUrlCredentials(creds: Connection['creds']): creds is UrlCredentials {
  return Boolean(
    creds &&
    typeof creds === 'object' &&
    'url' in creds &&
    typeof (creds as UrlCredentials).url === 'string',
  );
}

function isDatabaseCredentials(creds: Connection['creds']): creds is DatabaseCredentials {
  if (!creds || typeof creds !== 'object') {
    return false;
  }

  return 'database' in creds || 'host' in creds || 'user' in creds || 'password' in creds;
}
