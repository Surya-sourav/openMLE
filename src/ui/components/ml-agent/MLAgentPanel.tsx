import { useState } from 'react';
import { Plus, FolderOpen, Trash2, Eye, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatasetUploader } from './DatasetUploader';
import { PipelineProgress } from './PipelineProgress';
import { LogStreamPanel } from './LogStreamPanel';
import { PlanApprovalCard } from './PlanApprovalCard';
import { EvaluationReport } from './EvaluationReport';
import { ComputeTargetSelector } from './ComputeTargetSelector';
import { KernelPanel } from './KernelPanel';
import { useMLDatasets, useDeleteDataset, useMLProjects, useCreateProject, useStartAgent, useCancelRun } from '@/hooks/api/ml-agent';
import { useRunEvents } from '@/hooks/use-run-events';
import type { MLDataset } from '../../../electron/preloads/ml-agent.preload';

type ComputeTarget = { type: 'local' | 'ssh' | 'aws' | 'gcp' | 'azure'; device?: 'cpu' | 'cuda' | 'mps'; [key: string]: unknown };

type View = 'datasets' | 'projects' | 'run';

export function MLAgentPanel() {
  const [view, setView] = useState<View>('datasets');
  const [selectedDataset, setSelectedDataset] = useState<MLDataset | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [computeTarget, setComputeTarget] = useState<ComputeTarget>({ type: 'local', device: 'cpu' });
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'logs' | 'kernel'>('progress');

  const datasets = useMLDatasets();
  const deleteDataset = useDeleteDataset();
  const projects = useMLProjects();
  const createProject = useCreateProject();
  const startAgent = useStartAgent();
  const cancelRun = useCancelRun();

  const { logs, stage, plan, completed, failed, humanCheckpoint, metrics } = useRunEvents(activeRunId);

  // ── Dataset view ─────────────────────────────────────────────────────────────
  if (view === 'datasets') {
    return (
      <div className="flex flex-col gap-6 h-full overflow-y-auto">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Datasets</h2>
          <DatasetUploader />
        </div>

        {/* Dataset list */}
        {(datasets.data ?? []).length > 0 && (
          <div className="space-y-2">
            {(datasets.data ?? []).map((ds: MLDataset) => (
              <div
                key={ds.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                  selectedDataset?.id === ds.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'
                }`}
                onClick={() => setSelectedDataset(ds)}
              >
                <div className="min-w-0">
                  <p className="text-zinc-200 font-medium truncate">{ds.originalName}</p>
                  <p className="text-zinc-500">
                    {ds.rowCount.toLocaleString()} rows · {ds.columnCount} cols · {ds.inferredTask ?? 'unknown task'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); deleteDataset.mutate(ds.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDataset && (
          <div className="flex flex-col gap-3 border border-zinc-800 rounded-md p-4">
            <h3 className="text-xs font-semibold text-zinc-300">Use <span className="text-blue-300">{selectedDataset.originalName}</span></h3>
            <Button
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => setView('projects')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Open in Projects
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Projects view ─────────────────────────────────────────────────────────────
  if (view === 'projects') {
    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-xs text-zinc-400" onClick={() => setView('datasets')}>
            ← Datasets
          </Button>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-300">{selectedDataset?.originalName}</span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Projects</h2>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowCreateProject((v) => !v)}>
            <Plus className="w-3 h-3" /> New Project
          </Button>
        </div>

        {showCreateProject && selectedDataset && (
          <div className="border border-zinc-700 rounded-md p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300">New Project</h3>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <textarea
              value={newProjectGoal}
              onChange={(e) => setNewProjectGoal(e.target.value)}
              placeholder="Describe your ML objective (e.g. Predict customer churn with high recall)"
              className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
              rows={2}
            />
            <Button
              size="sm"
              disabled={!newProjectName || !newProjectGoal || createProject.isPending}
              onClick={() =>
                createProject.mutate(
                  { name: newProjectName, datasetId: selectedDataset.id, goal: newProjectGoal },  // id is UUID string
                  {
                    onSuccess: () => {
                      setNewProjectName('');
                      setNewProjectGoal('');
                      setShowCreateProject(false);
                    },
                  },
                )
              }
            >
              Create
            </Button>
          </div>
        )}

        {(projects.data ?? []).filter((p: { dataset_id: string | number }) => String(p.dataset_id) === selectedDataset?.id).length === 0 && !showCreateProject && (
          <p className="text-xs text-zinc-500 italic">No projects yet. Create one to start training.</p>
        )}

        <div className="space-y-2">
          {(projects.data ?? []).filter((p: { id: number; dataset_id: string | number; name: string; goal: string; status: string }) => String(p.dataset_id) === selectedDataset?.id).map((p: { id: number; dataset_id: string | number; name: string; goal: string; status: string }) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                selectedProjectId === p.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'
              }`}
              onClick={() => setSelectedProjectId(p.id)}
            >
              <div className="min-w-0">
                <p className="text-zinc-200 font-medium truncate">{p.name}</p>
                <p className="text-zinc-500 truncate">{p.goal}</p>
              </div>
              <span className={`ml-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                p.status === 'completed' ? 'bg-green-900 text-green-300' :
                p.status === 'failed' ? 'bg-red-900 text-red-300' :
                p.status === 'running' ? 'bg-blue-900 text-blue-300' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>

        {selectedProjectId !== null && (
          <div className="border border-zinc-800 rounded-md p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-300">Start Agent Run</h3>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="What do you want to achieve? e.g. Maximise F1 score, explain feature importance"
              className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
              rows={2}
            />
            <ComputeTargetSelector value={computeTarget} onChange={setComputeTarget} />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!userQuery || startAgent.isPending}
              onClick={() =>
                startAgent.mutate(
                  { projectId: selectedProjectId, userQuery, computeTarget },
                  {
                    onSuccess: (res) => {
                      const runId = (res as { data: { runId: number } }).data?.runId;
                      if (runId) {
                        setActiveRunId(runId);
                        setView('run');
                      }
                    },
                  },
                )
              }
            >
              <Eye className="w-3.5 h-3.5" />
              {startAgent.isPending ? 'Starting…' : 'Start Agent'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Run view ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Left: pipeline progress */}
      <div className="w-48 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <Button size="sm" variant="ghost" className="text-xs text-zinc-400 w-fit" onClick={() => setView('projects')}>
          ← Projects
        </Button>
        <PipelineProgress stage={stage} failed={failed} />

        {activeRunId && !completed && !failed && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-red-400 border-red-400/40 hover:bg-red-400/10 mt-2"
            onClick={() => cancelRun.mutate(activeRunId)}
          >
            Cancel Run
          </Button>
        )}
      </div>

      {/* Right: main panel */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
        {/* Human checkpoint warning */}
        {humanCheckpoint && (
          <div className="border border-yellow-500/40 bg-yellow-500/10 rounded-md px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="text-yellow-300 font-medium">Human Checkpoint</p>
              <p className="text-zinc-300">{humanCheckpoint.error}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => {
                  const taskId = (humanCheckpoint!.task as { id?: string })?.id ?? '';
                  window.mlAgent.handleHumanResponse(activeRunId!, taskId, 'retry');
                }}>
                  <RefreshCw className="w-3 h-3" /> Retry
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                  const taskId = (humanCheckpoint!.task as { id?: string })?.id ?? '';
                  window.mlAgent.handleHumanResponse(activeRunId!, taskId, 'skip');
                }}>
                  Skip
                </Button>
                <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => {
                  const taskId = (humanCheckpoint!.task as { id?: string })?.id ?? '';
                  window.mlAgent.handleHumanResponse(activeRunId!, taskId, 'abort');
                }}>
                  Abort
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Plan approval */}
        {!!plan && stage === 'awaiting_approval' && activeRunId && (
          <PlanApprovalCard runId={activeRunId} plan={plan as Parameters<typeof PlanApprovalCard>[0]['plan']} />
        )}

        {/* Evaluation report */}
        {completed && !!metrics && activeRunId && (
          <EvaluationReport runId={activeRunId} metrics={metrics as Record<string, unknown>} />
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {(['progress', 'logs', 'kernel'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-t transition-colors capitalize ${
                activeTab === tab
                  ? 'text-zinc-100 border-b-2 border-blue-500 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'progress' ? 'Logs' : tab === 'logs' ? 'Raw Logs' : 'Notebook'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'progress' && <LogStreamPanel logs={logs} />}
          {activeTab === 'logs' && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-md h-full overflow-y-auto p-3 font-mono text-xs">
              {logs.map((entry, i) => (
                <div key={i} className={`leading-5 whitespace-pre-wrap break-all ${
                  entry.level === 'error' ? 'text-red-400' :
                  entry.level === 'warn' ? 'text-yellow-400' :
                  'text-zinc-400'
                }`}>
                  <span className="text-zinc-600 select-none mr-2">{new Date(entry.ts).toLocaleTimeString()}</span>
                  {entry.line}
                </div>
              ))}
            </div>
          )}
          {activeTab === 'kernel' && <KernelPanel runId={activeRunId} />}
        </div>
      </div>
    </div>
  );
}
