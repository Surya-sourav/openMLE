import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Datasets ──────────────────────────────────────────────────────────────────
export function useMLDatasets() {
  return useQuery({
    queryKey: ['ml', 'datasets'],
    queryFn: () => window.mlAgent.listDatasets().then((r) => r.data ?? []),
  });
}

export function useUploadDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, buffer, mimeType }: { name: string; buffer: ArrayBuffer; mimeType: string }) =>
      window.mlAgent.uploadDataset(name, buffer, mimeType),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ml', 'datasets'] }),
  });
}

export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => window.mlAgent.deleteDataset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ml', 'datasets'] }),
  });
}

export function usePreviewDataset(id: string | null) {
  return useQuery({
    queryKey: ['ml', 'dataset', 'preview', id],
    queryFn: () => window.mlAgent.previewDataset(id!).then((r) => r.data),
    enabled: !!id,
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────
export function useMLProjects() {
  return useQuery({
    queryKey: ['ml', 'projects'],
    queryFn: () => window.mlAgent.listProjects().then((r) => r.data ?? []),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, datasetId, goal }: { name: string; datasetId: string; goal: string }) =>
      window.mlAgent.createProject(name, datasetId, goal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ml', 'projects'] }),
  });
}

// ── Runs ──────────────────────────────────────────────────────────────────────
export function useRun(runId: number | null) {
  return useQuery({
    queryKey: ['ml', 'run', runId],
    queryFn: () => window.mlAgent.getRun(runId!).then((r) => r.data),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      if (['completed', 'failed', 'cancelled'].includes(status)) return false;
      return 2000;
    },
  });
}

export function useListRuns(projectId: number | null) {
  return useQuery({
    queryKey: ['ml', 'runs', projectId],
    queryFn: () => window.mlAgent.listRuns(projectId!).then((r) => r.data ?? []),
    enabled: !!projectId,
  });
}

// ── Agent lifecycle ───────────────────────────────────────────────────────────
export function useStartAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userQuery, computeTarget }: { projectId: number; userQuery: string; computeTarget: { type: string; device?: string } }) =>
      window.mlAgent.startAgent(projectId, userQuery, computeTarget as never),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['ml', 'runs', vars.projectId] }),
  });
}

export function useApprovePlan() {
  return useMutation({
    mutationFn: (runId: number) => window.mlAgent.approvePlan(runId),
  });
}

export function useRejectPlan() {
  return useMutation({
    mutationFn: ({ runId, feedback }: { runId: number; feedback?: string }) =>
      window.mlAgent.rejectPlan(runId, feedback),
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => window.mlAgent.cancelRun(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ml', 'runs'] }),
  });
}

// ── Metrics / Report ──────────────────────────────────────────────────────────
export function useMetrics(runId: number | null) {
  return useQuery({
    queryKey: ['ml', 'metrics', runId],
    queryFn: () => window.mlAgent.getMetrics(runId!).then((r) => r.data),
    enabled: !!runId,
  });
}

export function useReport(runId: number | null) {
  return useQuery({
    queryKey: ['ml', 'report', runId],
    queryFn: () => window.mlAgent.getReport(runId!).then((r) => r.data),
    enabled: !!runId,
  });
}

// ── Compute ───────────────────────────────────────────────────────────────────
export function useDetectLocalGPU() {
  return useQuery({
    queryKey: ['ml', 'local-gpu'],
    queryFn: () => window.mlAgent.detectLocalGPU().then((r) => r.data),
    staleTime: 60_000,
  });
}
