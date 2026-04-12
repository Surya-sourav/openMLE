/**
 * Ambient module stubs for optional npm dependencies.
 *
 * TypeScript uses these when the packages are not yet installed
 * (e.g., before running `npm install`). Once installed, the real
 * package types from node_modules take precedence automatically.
 *
 * All imports from these modules will resolve to `any` until the
 * packages are present.
 */

// Core LLM
declare module '@anthropic-ai/sdk';

// Dataset parsing
declare module 'papaparse';
declare module 'xlsx';

// WebSocket / port utilities
declare module 'ws';
declare module 'get-port';

// Cloud adapters
declare module 'ssh2';
declare module '@aws-sdk/client-sagemaker';
declare module '@aws-sdk/client-s3';
declare module '@aws-sdk/client-cloudwatch-logs';
declare module '@azure/ai-ml';
declare module '@azure/identity';
declare module '@google-cloud/aiplatform';

// Vector KB (native bindings — replaced by in-memory impl, kept for future use)
declare module 'vectordb';
