interface Props {
  matrix: number[][];
  labels?: string[];
}

export function ConfusionMatrixChart({ matrix, labels }: Props) {
  if (!matrix || matrix.length === 0) return null;

  const maxVal = Math.max(...matrix.flat());

  const cellLabel = (i: number) => labels?.[i] ?? String(i);

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Confusion Matrix</p>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-zinc-600 font-normal" />
              {matrix[0].map((_, j) => (
                <th key={j} className="p-1 text-zinc-400 font-medium text-center">
                  {cellLabel(j)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="p-1 pr-2 text-zinc-400 font-medium">{cellLabel(i)}</td>
                {row.map((val, j) => {
                  const opacity = maxVal > 0 ? val / maxVal : 0;
                  const isDiag = i === j;
                  const bg = isDiag
                    ? `rgba(59, 130, 246, ${0.15 + opacity * 0.6})`
                    : `rgba(239, 68, 68, ${opacity * 0.5})`;
                  return (
                    <td
                      key={j}
                      className="p-2 text-center rounded font-mono"
                      style={{ backgroundColor: bg, color: opacity > 0.5 ? '#fff' : '#a1a1aa', minWidth: '2.5rem' }}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
