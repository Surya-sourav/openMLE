import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Props {
  fpr: number[];
  tpr: number[];
  auc: number;
}

export function ROCCurveChart({ fpr, tpr, auc }: Props) {
  const data = fpr.map((f, i) => ({ fpr: parseFloat(f.toFixed(3)), tpr: parseFloat(tpr[i].toFixed(3)) }));

  return (
    <div className="space-y-1">
      <p className="text-xs text-zinc-400">
        ROC Curve — <span className="text-zinc-200 font-mono">AUC = {auc.toFixed(3)}</span>
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            tickCount={5}
            tick={{ fontSize: 10, fill: '#71717a' }}
            label={{ value: 'FPR', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#71717a' }}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={5}
            tick={{ fontSize: 10, fill: '#71717a' }}
            label={{ value: 'TPR', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#71717a' }}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', fontSize: 10 }}
            formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : String(v))}
          />
          {/* diagonal baseline */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="#52525b"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="tpr"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
