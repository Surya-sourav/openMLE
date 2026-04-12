import type { LogAction, LogContext } from '../../types/agent.js';

export function parseLine(line: string, context: LogContext): LogAction {
  // Try to parse as JSON log line
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(line);
  } catch {
    // Plain text line — no action
    return { type: 'continue' };
  }

  if (!parsed) return { type: 'continue' };

  // Check for NaN in any loss field
  const lossFields = ['train_loss', 'val_loss', 'loss'];
  for (const field of lossFields) {
    const val = parsed[field];
    if (val !== undefined && (String(val).toLowerCase().includes('nan') || String(val).toLowerCase().includes('inf'))) {
      return { type: 'stop_nan' };
    }
  }

  // Parse epoch + losses
  const epoch = typeof parsed.epoch === 'number' ? parsed.epoch : null;
  const trainLoss = typeof parsed.train_loss === 'number' ? parsed.train_loss : null;
  const valLoss = typeof parsed.val_loss === 'number' ? parsed.val_loss : null;

  if (epoch !== null && trainLoss !== null) {
    context.recentLossHistory.push({ epoch, trainLoss, valLoss: valLoss ?? undefined });
    // Keep only last 15 entries
    if (context.recentLossHistory.length > 15) context.recentLossHistory.shift();
  }

  const history = context.recentLossHistory;

  // Check for val_loss increasing for 5 consecutive epochs (overfitting)
  if (history.length >= 6) {
    const recent = history.slice(-6);
    const hasValLoss = recent.every((e) => e.valLoss !== undefined);
    if (hasValLoss) {
      const best = context.bestValLoss ?? recent[0].valLoss!;
      if (recent[0].valLoss !== undefined && recent[0].valLoss < best) {
        context.bestValLoss = recent[0].valLoss;
      }
      const increasing = recent.slice(1).every((e, i) => e.valLoss! > recent[i].valLoss!);
      if (increasing) {
        return { type: 'add_early_stopping', patience: 3 };
      }
    }
  }

  // Check for slow convergence: train_loss delta < 0.001 over last 10 epochs
  if (history.length >= 10) {
    const last10 = history.slice(-10);
    const delta = Math.abs(last10[0].trainLoss - last10[last10.length - 1].trainLoss);
    if (delta < 0.001) {
      return { type: 'flag_slow_convergence' };
    }
  }

  return { type: 'continue' };
}
