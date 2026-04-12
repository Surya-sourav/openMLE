import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useApprovePlan, useRejectPlan } from '@/hooks/api/ml-agent';

interface MLPlan {
  id: string;
  objective: string;
  taskType: string;
  proposedAlgorithm: { primary: string; library: string; rationale: string; hyperparameters: Record<string, unknown> };
  preprocessingSteps: { order: number; name: string; description: string }[];
  trainingConfig: { testSplitRatio: number; crossValidationFolds: number; randomSeed: number };
  edaSummary: { rowCount: number; columnCount: number; targetColumn: string; keyFindings: string[] };
}

interface Props {
  runId: number;
  plan: MLPlan;
}

export function PlanApprovalCard({ runId, plan }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const approve = useApprovePlan();
  const reject = useRejectPlan();

  return (
    <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-300">ML Plan Ready for Approval</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      <div className="text-xs space-y-1">
        <p><span className="text-zinc-400">Objective:</span> <span className="text-zinc-200">{plan.objective}</span></p>
        <p><span className="text-zinc-400">Algorithm:</span> <span className="text-zinc-200">{plan.proposedAlgorithm.primary} ({plan.proposedAlgorithm.library})</span></p>
        <p><span className="text-zinc-400">Task:</span> <span className="text-zinc-200">{plan.taskType}</span></p>
        <p><span className="text-zinc-400">Target:</span> <span className="text-zinc-200">{plan.edaSummary.targetColumn}</span></p>
      </div>

      {showDetails && (
        <div className="text-xs space-y-3 border-t border-zinc-700 pt-3">
          <div>
            <p className="text-zinc-400 font-medium mb-1">Rationale</p>
            <p className="text-zinc-300">{plan.proposedAlgorithm.rationale}</p>
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">Key Findings</p>
            <ul className="space-y-0.5">
              {plan.edaSummary.keyFindings.map((f, i) => (
                <li key={i} className="text-zinc-300">• {f}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">Preprocessing ({plan.preprocessingSteps.length} steps)</p>
            {plan.preprocessingSteps.map((s) => (
              <p key={s.order} className="text-zinc-300">{s.order}. {s.name}: {s.description}</p>
            ))}
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">Training Config</p>
            <p className="text-zinc-300">Test split: {plan.trainingConfig.testSplitRatio} · CV folds: {plan.trainingConfig.crossValidationFolds} · Seed: {plan.trainingConfig.randomSeed}</p>
          </div>
        </div>
      )}

      {rejecting && (
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What should be changed? (optional)"
          className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-300 resize-none"
          rows={2}
        />
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1"
          onClick={() => approve.mutate(runId)}
          disabled={approve.isPending}
        >
          <CheckCircle className="w-3 h-3" /> Approve
        </Button>
        {!rejecting ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setRejecting(true)}>
            <XCircle className="w-3 h-3" /> Reject
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { reject.mutate({ runId, feedback }); setRejecting(false); }}
            disabled={reject.isPending}
          >
            Send Feedback
          </Button>
        )}
      </div>
    </div>
  );
}
