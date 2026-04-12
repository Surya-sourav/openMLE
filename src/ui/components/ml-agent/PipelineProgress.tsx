import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';

const STAGES = [
  { key: 'eda_analysis',    label: 'EDA Analysis' },
  { key: 'research',        label: 'Algorithm Research' },
  { key: 'plan_generation', label: 'Plan Generation' },
  { key: 'awaiting_approval', label: 'Plan Approval' },
  { key: 'preprocessing',   label: 'Preprocessing' },
  { key: 'code_generation', label: 'Code Generation' },
  { key: 'training',        label: 'Model Training' },
  { key: 'evaluation',      label: 'Evaluation' },
  { key: 'report_generation', label: 'Report' },
  { key: 'completed',       label: 'Done' },
];

type StageStatus = 'pending' | 'active' | 'done' | 'failed';

function stageStatus(stageKey: string, currentStage: string, failed: boolean): StageStatus {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
  const thisIdx = STAGES.findIndex((s) => s.key === stageKey);
  if (failed && thisIdx === currentIdx) return 'failed';
  if (thisIdx < currentIdx) return 'done';
  if (thisIdx === currentIdx) return 'active';
  return 'pending';
}

interface Props {
  stage: string;
  failed?: string | null;
}

export function PipelineProgress({ stage, failed }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {STAGES.map(({ key, label }) => {
        const status = stageStatus(key, stage, !!failed);
        return (
          <div key={key} className="flex items-center gap-2 py-1">
            {status === 'done'    && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
            {status === 'active'  && <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
            {status === 'failed'  && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            {status === 'pending' && <Circle className="w-4 h-4 text-zinc-600 shrink-0" />}
            <span className={`text-xs ${
              status === 'done'    ? 'text-green-400' :
              status === 'active'  ? 'text-blue-300 font-medium' :
              status === 'failed'  ? 'text-red-400' :
              'text-zinc-500'
            }`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
