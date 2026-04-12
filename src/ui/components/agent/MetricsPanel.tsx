import { useAppStore } from '@/store';
import { EvaluationReport } from '@/components/ml-agent/EvaluationReport';
import { ConfusionMatrixChart } from './charts/ConfusionMatrixChart';
import { ROCCurveChart } from './charts/ROCCurveChart';

export function MetricsPanel() {
  const metrics = useAppStore((s) => s.modelMetrics);
  const activeRunId = useAppStore((s) => s.activeRunId);

  if (!metrics || activeRunId == null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-zinc-600 italic">No metrics yet. Run a pipeline first.</p>
      </div>
    );
  }

  const hasConfusionMatrix =
    'confusion_matrix' in metrics && Array.isArray(metrics.confusion_matrix);
  const hasRocData =
    'roc_fpr' in metrics && 'roc_tpr' in metrics && Array.isArray(metrics.roc_fpr);

  return (
    <div className="space-y-5 p-3">
      <EvaluationReport runId={activeRunId} metrics={metrics} />
      {hasConfusionMatrix && (
        <ConfusionMatrixChart
          matrix={metrics.confusion_matrix as number[][]}
          labels={metrics.class_labels as string[] | undefined}
        />
      )}
      {hasRocData && (
        <ROCCurveChart
          fpr={metrics.roc_fpr as number[]}
          tpr={metrics.roc_tpr as number[]}
          auc={(metrics.roc_auc as number) ?? 0}
        />
      )}
    </div>
  );
}
