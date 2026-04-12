import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReport } from '@/hooks/api/ml-agent';

interface Props {
  runId: number;
  metrics: Record<string, unknown>;
}

function MetricCard({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'number' ? (value * 100).toFixed(1) + (value <= 1 ? '%' : '') : String(value ?? '—');
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-center">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      <p className="text-zinc-100 text-lg font-mono font-semibold">{display}</p>
    </div>
  );
}

export function EvaluationReport({ runId, metrics }: Props) {
  const report = useReport(runId);

  const classificationMetrics = ['accuracy', 'f1_score', 'precision', 'recall', 'roc_auc'];
  const regressionMetrics = ['mse', 'rmse', 'mae', 'r2'];
  const shownKeys = [...classificationMetrics, ...regressionMetrics].filter((k) => k in metrics);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-green-400">Model Evaluation Complete</h3>
        {report.data && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => {
              const blob = new Blob([report.data!.content], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'report.md';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3 h-3" /> Download Report
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shownKeys.map((key) => (
          <MetricCard key={key} label={key.replace(/_/g, ' ').toUpperCase()} value={metrics[key]} />
        ))}
      </div>

      {report.data && (
        <details className="text-xs">
          <summary className="text-zinc-400 cursor-pointer hover:text-zinc-300">View full report</summary>
          <pre className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded overflow-auto max-h-64 text-zinc-300 whitespace-pre-wrap">
            {report.data.content}
          </pre>
        </details>
      )}
    </div>
  );
}
