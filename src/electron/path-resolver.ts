import path from 'path';
import { app } from 'electron';
import { isDev } from './util.js';

export function getPreloadPath(): string {
  return path.join(app.getAppPath(), isDev() ? '.' : '..', 'dist-electron', 'electron', 'preload.cjs');
}
