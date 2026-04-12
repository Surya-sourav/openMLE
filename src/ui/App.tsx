import { useState } from 'react';
import { DataSourceDialog } from '@/components/data-source-dialog';
import { DataSageSidebar } from '@/components/data-sage-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryBar } from '@/components/query-bar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { AddPostgresConnectionDialog } from '@/components/add-postgres-connection-dialog';
import { AddModelApiKeysDialog } from '@/components/add-model-api-keys-dialog';
import { QueryEditorPanel } from '@/components/query-editor-panel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ProjectSidebar } from '@/components/agent/ProjectSidebar';
import { ChatPanel } from '@/components/agent/ChatPanel';
import { RightPanel } from '@/components/agent/RightPanel';
import { SettingsModal } from '@/components/agent/SettingsModal';
import { useAppStore } from '@/store';
import './App.css';

function AgentLayout() {
  const setMode = useAppStore((s) => s.setMode);

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 shrink-0">
        <div className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800 p-0.5">
          <Button
            type="button"
            size="sm"
            className="h-6 px-2 text-xs rounded-sm"
            variant="ghost"
            onClick={() => setMode('query')}
          >
            Query
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-6 px-2 text-xs rounded-sm"
            variant="default"
          >
            Analysis
          </Button>
        </div>
        <div className="ml-auto">
          <SettingsModal />
        </div>
      </div>

      {/* Three-panel body */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <ProjectSidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={30}>
          <ChatPanel />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={20}>
          <RightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function App() {
  const [dataSourceDialogOpen, setDataSourceDialogOpen] = useState(false);
  const [postgresDialogOpen, setPostgresDialogOpen] = useState(false);
  const [modelKeysDialogOpen, setModelKeysDialogOpen] = useState(false);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  if (mode === 'agent') {
    return <AgentLayout />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DataSageSidebar onAddDataSource={() => setDataSourceDialogOpen(true)} />
        <SidebarInset>
          <div className="p-3">
            <div className="inline-flex items-center rounded-md border bg-muted p-1">
              <Button
                type="button"
                size="sm"
                className="rounded-sm"
                variant="default"
                aria-pressed={true}
              >
                Query
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-sm"
                variant="ghost"
                onClick={() => setMode('agent')}
                aria-pressed={false}
              >
                Analysis
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-6 h-full min-h-0">
            <QueryEditorPanel />
          </div>
          <QueryBar onAddModel={() => setModelKeysDialogOpen(true)} />
        </SidebarInset>
      </div>
      <DataSourceDialog
        openState={dataSourceDialogOpen}
        setOpenState={setDataSourceDialogOpen}
        onSelectPostgres={() => {
          setDataSourceDialogOpen(false);
          setPostgresDialogOpen(true);
        }}
      />
      <AddPostgresConnectionDialog
        openState={postgresDialogOpen}
        setOpenState={setPostgresDialogOpen}
        onTest={(vals) => {
          console.log('Test connection:', vals);
        }}
        onConnect={(vals) => {
          console.log('Connect:', vals);
        }}
      />
      <AddModelApiKeysDialog
        openState={modelKeysDialogOpen}
        setOpenState={setModelKeysDialogOpen}
        onSaveKey={(provider, keyValue) => {
          console.log('Save key for', provider, keyValue ? '***' : '(empty)');
        }}
      />
      <ThemeToggle />
    </SidebarProvider>
  );
}

export default App;
