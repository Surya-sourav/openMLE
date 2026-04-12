import { useDetectLocalGPU } from '@/hooks/api/ml-agent';
import { Cpu, Cloud } from 'lucide-react';

interface ComputeTarget {
  type: 'local' | 'ssh' | 'aws' | 'gcp' | 'azure';
  device?: 'cpu' | 'cuda' | 'mps';
  [key: string]: unknown;
}

interface Props {
  value: ComputeTarget;
  onChange: (target: ComputeTarget) => void;
}

export function ComputeTargetSelector({ value, onChange }: Props) {
  const gpu = useDetectLocalGPU();

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Compute Target</p>
      <div className="flex gap-2">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
            value.type === 'local'
              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
          }`}
          onClick={() => {
            const device = gpu.data?.cuda ? 'cuda' : gpu.data?.mps ? 'mps' : 'cpu';
            onChange({ type: 'local', device });
          }}
        >
          <Cpu className="w-3 h-3" />
          Local {gpu.data ? `(${gpu.data.cuda ? 'CUDA' : gpu.data.mps ? 'MPS' : 'CPU'})` : ''}
        </button>
        {(['ssh', 'aws', 'gcp', 'azure'] as const).map((t) => (
          <button
            key={t}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
              value.type === t
                ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
            onClick={() => onChange({ type: t })}
          >
            <Cloud className="w-3 h-3" />
            {t.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
