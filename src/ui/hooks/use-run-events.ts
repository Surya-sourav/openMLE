import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';

export interface LogEntry {
  line: string;
  level: string;
  ts: number;
}

export function useRunEvents(runId: number | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stage, setStage] = useState<string>('idle');
  const [plan, setPlan] = useState<unknown>(null);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [humanCheckpoint, setHumanCheckpoint] = useState<{ task: unknown; error: string } | null>(null);
  const [metrics, setMetrics] = useState<unknown>(null);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const activeRunId = useRef<number | null>(null);

  useEffect(() => {
    if (!runId) return;
    activeRunId.current = runId;

    // Clear state for new run
    setLogs([]);
    setStage('idle');
    setPlan(null);
    setCompleted(false);
    setFailed(null);
    setHumanCheckpoint(null);
    setMetrics(null);
    setReportPath(null);
    useAppStore.getState().clearAgentLogs();

    window.mlAgent.onLogLine((data) => {
      if (data.runId !== activeRunId.current) return;
      setLogs((prev) => [...prev, { line: data.line, level: data.level, ts: Date.now() }]);
      useAppStore.getState().appendAgentLog(data.line);
    });

    window.mlAgent.onStatusUpdate((data) => {
      if (data.runId !== activeRunId.current) return;
      setStage(data.stage);
      // Zustand
      useAppStore.getState().setCurrentStage(data.stage);
    });

    window.mlAgent.onPlanReady((data) => {
      if (data.runId !== activeRunId.current) return;
      setStage('awaiting_approval');
      setPlan(data.plan);
      // Zustand
      const store = useAppStore.getState();
      store.setPlanData(data.plan);
      store.setPlanStatus('awaiting');
      store.addMessage({ type: 'plan-card', content: '', planData: data.plan, runId: data.runId, isStreaming: false });
    });

    window.mlAgent.onHumanCheckpoint((data) => {
      if (data.runId !== activeRunId.current) return;
      setHumanCheckpoint({ task: data.task, error: data.error });
    });

    window.mlAgent.onAgentComplete((data) => {
      if (data.runId !== activeRunId.current) return;
      setCompleted(true);
      setStage('completed');
      setMetrics(data.metrics);
      setReportPath(data.reportPath);
      // Zustand
      const store = useAppStore.getState();
      store.setModelMetrics(data.metrics as Record<string, unknown>);
      store.setReportPath(data.reportPath);
      store.setIsAgentRunning(false);
      store.addMessage({
        type: 'metrics-card',
        content: '',
        metricsData: data.metrics as Record<string, unknown>,
        runId: data.runId,
        isStreaming: false,
      });
      store.setRightPanelTab('metrics');
    });

    window.mlAgent.onStepFailed((data) => {
      if (data.runId !== activeRunId.current) return;
      setFailed(data.error);
      // Zustand
      const store = useAppStore.getState();
      store.setIsAgentRunning(false);
      store.addMessage({ type: 'system', content: `Pipeline failed: ${data.error}`, isStreaming: false });
    });

    return () => {
      window.mlAgent.removeAllListeners();
      activeRunId.current = null;
    };
  }, [runId]);

  return { logs, stage, plan, completed, failed, humanCheckpoint, metrics, reportPath };
}
