import { useAppStore } from '@/store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KernelPanel } from '@/components/ml-agent/KernelPanel';
import { TerminalPanel } from './TerminalPanel';
import { MetricsPanel } from './MetricsPanel';

export function RightPanel() {
  const rightPanelTab = useAppStore((s) => s.rightPanelTab);
  const setRightPanelTab = useAppStore((s) => s.setRightPanelTab);
  const activeRunId = useAppStore((s) => s.activeRunId);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
      <Tabs
        value={rightPanelTab}
        onValueChange={(v) => setRightPanelTab(v as typeof rightPanelTab)}
        className="flex flex-col h-full gap-0"
      >
        <TabsList className="shrink-0 w-full rounded-none border-b border-zinc-800 bg-zinc-900 justify-start h-9">
          <TabsTrigger value="notebook" className="text-xs h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
            Notebook
          </TabsTrigger>
          <TabsTrigger value="terminal" className="text-xs h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
            Terminal
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
            Metrics
          </TabsTrigger>
        </TabsList>

        {/* Notebook — always mounted to prevent KernelPanel listener cleanup mid-run */}
        <TabsContent
          value="notebook"
          forceMount
          className={`flex-1 min-h-0 overflow-hidden p-2 ${rightPanelTab !== 'notebook' ? 'hidden' : ''}`}
        >
          <KernelPanel runId={activeRunId} />
        </TabsContent>

        <TabsContent value="terminal" className="flex-1 min-h-0 overflow-hidden">
          <TerminalPanel runId={activeRunId} />
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 min-h-0 overflow-y-auto">
          <MetricsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
