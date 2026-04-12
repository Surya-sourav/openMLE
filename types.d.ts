import { DatabaseAPI } from "./src/electron/preload.cts";
import type { MLAgentAPI } from "./src/electron/preloads/ml-agent.preload.js";
import type { LLMAPI } from "./src/electron/preloads/llm.preload.js";

declare global {
  interface Window {
    database: DatabaseAPI;
    mlAgent: MLAgentAPI;
    llm: LLMAPI;
  }
}
export {};
