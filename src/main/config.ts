import { app } from 'electron';
import path from 'path';

export const config = {
  anthropicApiKey:    process.env.ANTHROPIC_API_KEY ?? '',
  tavilyApiKey:       process.env.TAVILY_API_KEY ?? '',
  pythonExecutable:   process.env.OPENMLE_PYTHON ?? 'python3',
  sandboxTimeoutMs:   Number(process.env.SANDBOX_TIMEOUT_MS ?? 120_000),
  maxSelfCorrections: Number(process.env.MAX_SELF_CORRECTIONS ?? 3),
  maxTaskRetries:     Number(process.env.MAX_TASK_RETRIES ?? 3),
  jupyterPort:        Number(process.env.JUPYTER_PORT ?? 0),
  get pythonScriptsPath() {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'python')
      : path.join(app.getAppPath(), 'src', 'main', 'python', 'scripts');
  },
  get vectorKBPath()      { return path.join(app.getPath('userData'), 'vectorkb'); },
  get workspacePath()     { return path.join(app.getPath('userData'), 'workspace'); },
  get datasetStorePath()  { return path.join(app.getPath('userData'), 'datasets'); },
  get sandboxPath()       { return path.join(app.getPath('userData'), 'sandbox'); },
  get logsPath()          { return path.join(app.getPath('userData'), 'logs'); },
};
