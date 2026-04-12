import { useState } from 'react';
import { Plus, Upload, Trash2, ChevronRight, FolderOpen, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DatasetUploader } from '@/components/ml-agent/DatasetUploader';
import { ComputeTargetSelector } from '@/components/ml-agent/ComputeTargetSelector';
import {
  useMLDatasets,
  useDeleteDataset,
  useMLProjects,
  useCreateProject,
  useStartAgent,
} from '@/hooks/api/ml-agent';
import { useAppStore } from '@/store';
import type { MLDataset } from '../../../electron/preloads/ml-agent.preload';

type ComputeTarget = { type: 'local' | 'ssh' | 'aws' | 'gcp' | 'azure'; device?: 'cpu' | 'cuda' | 'mps'; [key: string]: unknown };

export function ProjectSidebar() {
  const selectedDatasetId = useAppStore((s) => s.selectedDatasetId);
  const setSelectedDatasetId = useAppStore((s) => s.setSelectedDatasetId);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const setActiveRunId = useAppStore((s) => s.setActiveRunId);
  const setIsAgentRunning = useAppStore((s) => s.setIsAgentRunning);
  const addMessage = useAppStore((s) => s.addMessage);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [computeTarget, setComputeTarget] = useState<ComputeTarget>({ type: 'local', device: 'cpu' });

  const datasets = useMLDatasets();
  const deleteDataset = useDeleteDataset();
  const projects = useMLProjects();
  const createProject = useCreateProject();
  const startAgent = useStartAgent();

  const selectedDataset = (datasets.data ?? []).find((d: MLDataset) => d.id === selectedDatasetId) ?? null;
  const filteredProjects = (projects.data ?? []).filter(
    (p: { dataset_id: string | number }) => String(p.dataset_id) === selectedDatasetId,
  );

  const handleStartAgent = () => {
    if (!activeProjectId || !userQuery.trim()) return;
    addMessage({ type: 'user', content: userQuery.trim(), isStreaming: false });
    startAgent.mutate(
      { projectId: activeProjectId, userQuery: userQuery.trim(), computeTarget },
      {
        onSuccess: (res) => {
          const runId = (res as { data?: { runId: number } }).data?.runId;
          if (runId) {
            setActiveRunId(runId);
            setIsAgentRunning(true);
            addMessage({ type: 'system', content: `Run #${runId} started — pipeline is running…`, isStreaming: false });
          }
          setUserQuery('');
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-semibold text-zinc-300">OpenMLE</span>
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-zinc-300" title="Upload dataset">
              <Upload className="w-3.5 h-3.5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 bg-zinc-900 border-zinc-800">
            <SheetHeader>
              <SheetTitle className="text-zinc-200">Upload Dataset</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <DatasetUploader />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Datasets section */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Datasets</p>
          {datasets.isLoading && <p className="text-xs text-zinc-600 italic">Loading…</p>}
          {(datasets.data ?? []).length === 0 && !datasets.isLoading && (
            <p className="text-xs text-zinc-600 italic">No datasets yet.</p>
          )}
          <div className="space-y-1">
            {(datasets.data ?? []).map((ds: MLDataset) => (
              <div
                key={ds.id}
                className={`group flex items-center gap-1.5 rounded px-2 py-1.5 cursor-pointer transition-colors text-xs ${
                  selectedDatasetId === ds.id
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
                onClick={() => setSelectedDatasetId(ds.id)}
              >
                <FolderOpen className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{ds.originalName}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDataset.mutate(ds.id);
                    if (selectedDatasetId === ds.id) setSelectedDatasetId(null);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Projects section */}
        {selectedDataset && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Projects
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowCreateProject((v) => !v)}
                title="New project"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>

            {showCreateProject && (
              <div className="space-y-2 mb-2 border border-zinc-700 rounded-md p-2">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <textarea
                  value={newProjectGoal}
                  onChange={(e) => setNewProjectGoal(e.target.value)}
                  placeholder="ML objective…"
                  className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none"
                  rows={2}
                />
                <Button
                  size="sm"
                  className="w-full h-6 text-xs"
                  disabled={!newProjectName || !newProjectGoal || createProject.isPending}
                  onClick={() =>
                    createProject.mutate(
                      { name: newProjectName, datasetId: selectedDataset.id, goal: newProjectGoal },
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

            {filteredProjects.length === 0 && !showCreateProject && (
              <p className="text-xs text-zinc-600 italic">No projects yet.</p>
            )}

            <div className="space-y-1">
              {filteredProjects.map((p: { id: number; name: string; goal: string; status: string }) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded px-2 py-1.5 cursor-pointer transition-colors text-xs ${
                    activeProjectId === p.id
                      ? 'bg-blue-500/15 text-blue-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                  }`}
                  onClick={() => setActiveProjectId(p.id)}
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className={`text-[9px] px-1 rounded shrink-0 ${
                    p.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                    p.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                    p.status === 'running' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Run footer */}
      {activeProjectId !== null && (
        <div className="border-t border-zinc-800 p-3 space-y-2 shrink-0">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Start Run</p>
          <textarea
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="What do you want to achieve?"
            className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
            rows={2}
          />
          <ComputeTargetSelector value={computeTarget} onChange={setComputeTarget} />
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs"
            disabled={!userQuery.trim() || startAgent.isPending}
            onClick={handleStartAgent}
          >
            <Eye className="w-3 h-3" />
            {startAgent.isPending ? 'Starting…' : 'Start Agent'}
          </Button>
        </div>
      )}
    </div>
  );
}
