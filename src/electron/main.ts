import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { isDev } from './util.js';
import { getPreloadPath } from './path-resolver.js';
import {
  connect,
  isDatabaseExisting,
  disconnect,
} from './internal-database/local.database-config.js';
import { ConnectionService } from './services/connection.sevice.js';
import { DBHandler } from './handlers/db-handler.js';
import { LLMservice } from './llm-gateway/services/llm.service.js';
import { LLMhandler } from './handlers/llm-handler.js';
import { AgentHandler } from './handlers/sql-agent-handler.js';
// ── OpenMLE ML Agent ────────────────────────────────────────────────────────
import { MLAgentHandler } from '../main/ipc/handlers.js';
import { MLOrchestrator } from '../main/agents/orchestrator.js';
import { DatasetService } from '../main/services/datasetService.js';
import { SandboxService } from '../main/services/sandboxService.js';
import { KernelService } from '../main/services/kernelService.js';
import { VectorKBService } from '../main/services/vectorKBService.js';
import { LogStreamService } from '../main/services/logStreamService.js';

let connectionService: ConnectionService;
let mainWindow: BrowserWindow | null = null;
let dbHandler: DBHandler;
let llmservice: LLMservice;
let llmhandler: LLMhandler;
let agenthandler: AgentHandler;
// ── OpenMLE singletons ──────────────────────────────────────────────────────
let datasetService: DatasetService;
let sandboxService: SandboxService;
let kernelService: KernelService;
let vectorKBService: VectorKBService;
let mlOrchestrator: MLOrchestrator;
let mlAgentHandler: MLAgentHandler;

// Disable sandbox in development mode to avoid Linux compatibility issues
if (isDev()) {
  app.commandLine.appendSwitch('no-sandbox');
}

app.on('ready', async () => {
  console.log('===Data-sage Starting===');

  // Step 1 : Check if the run is the first run
  const isFirstRun = isDatabaseExisting();
  if (isFirstRun) {
    console.log(' Setting up the Database');
  } else {
    console.log('Connecting to the Database...');
  }

  //Step 2 : Initialize the Local DB :
  await connect();
  console.log('Database Ready !');

  //Step 3 : Initialize Connection Service :
  connectionService = new ConnectionService();
  await connectionService.initializeConnection();
  console.log('Connection Service Ready');

  // Initialize LLMs :
  llmservice = LLMservice.getInstance();
  await llmservice.initializellm();
  console.log('LLM Provider is Ready');

  // Register the DB Handlers
  dbHandler = new DBHandler(connectionService);
  dbHandler.registerHandlers();

  //  Register LLM Handlers
  llmhandler = new LLMhandler(llmservice);
  llmhandler.registerllmhandlers();
  console.log(' LLM Handlers Registered');

  // Initialize and Register Agent Handlers
  agenthandler = new AgentHandler();
  agenthandler.registerAgentHandlers();
  console.log(' SQL Agent Handlers Registered');

  // ── OpenMLE: initialise ML services ──────────────────────────────────────
  datasetService = new DatasetService();
  sandboxService = new SandboxService();
  kernelService = new KernelService();
  vectorKBService = new VectorKBService();
  const logStreamService = LogStreamService.getInstance();

  mlOrchestrator = new MLOrchestrator({
    datasetService,
    sandboxService,
    kernelService,
    vectorKBService,
    logStreamService,
  });
  mlAgentHandler = new MLAgentHandler(mlOrchestrator, datasetService, sandboxService, kernelService);

  //Step 4 : Create Main Window :

  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: getPreloadPath(),
    },
    width: 1200,
    height: 800,
  });

  // ── OpenMLE: register ML IPC handlers + post-window init ─────────────────
  logStreamService.setWindow(mainWindow);
  mlAgentHandler.registerHandlers(mainWindow);
  console.log(' ML Agent Handlers Registered');

  // Non-blocking background init
  datasetService.loadRegistry();
  vectorKBService.init().catch((e: unknown) => console.error('[VectorKB] Init failed:', e));

  if (isDev()) {
    console.log('Loading from Dev Server...');
    mainWindow.loadURL('http://localhost:5123');
  } else {
    console.log('Loading from Production Build...');
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }

  // Step 5 :
  if (!isFirstRun) {
    const hasConnections = await connectionService.hasConnections();

    if (hasConnections) {
      console.log('Checking for Default Connection');
      const autoConnected = await connectionService.autoConnectDefault();

      if (autoConnected) {
        console.log('Auto Connect Successful !');

        mainWindow.webContents.send('connection:auto-connected');
      } else {
        console.log('No Default Connections');

        mainWindow.webContents.send('connection:show-selector');
      }
    } else {
      console.log('No saved connections');
      mainWindow.webContents.send('connection:show-add-connection');
    }
  } else {
    console.log('First Run Successfully Setup');
    mainWindow.webContents.send('connection:show-setup-page');
  }

  mainWindow.show();

  // Handle Closing :
});

app.on('before-quit', async () => {
  mlOrchestrator?.shutdownAll();
  await kernelService?.shutdown().catch(() => {});
  vectorKBService?.close();
  disconnect();
});
