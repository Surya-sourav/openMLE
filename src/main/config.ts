import { app } from 'electron';
import path from 'path';

export const config = {
  get cerebrasApiKey()     { return process.env.CEREBRAS_API_KEY ?? ''; },
  get tavilyApiKey()       { return process.env.TAVILY_API_KEY ?? ''; },
  get pythonExecutable()   { return process.env.OPENMLE_PYTHON ?? 'python3'; },
  get sandboxTimeoutMs()   { return Number(process.env.SANDBOX_TIMEOUT_MS ?? 120_000); },
  get maxSelfCorrections() { return Number(process.env.MAX_SELF_CORRECTIONS ?? 3); },
  get maxTaskRetries()     { return Number(process.env.MAX_TASK_RETRIES ?? 3); },
  get jupyterPort()        { return Number(process.env.JUPYTER_PORT ?? 0); },
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
