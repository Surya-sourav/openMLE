export const MLChannels = {
  // ── Dataset ──────────────────────────────────────────────────────────────
  DATASET_UPLOAD:           'ml/dataset/upload',
  DATASET_LIST:             'ml/dataset/list',
  DATASET_DELETE:           'ml/dataset/delete',
  DATASET_PREVIEW:          'ml/dataset/preview',

  // ── Mode ─────────────────────────────────────────────────────────────────
  MODE_SET:                 'ml/mode/set',
  MODE_GET:                 'ml/mode/get',

  // ── Query Mode ───────────────────────────────────────────────────────────
  QUERY_ASK:                'ml/query/ask',
  QUERY_STREAM_CHUNK:       'ml/query/stream/chunk',   // push: main → renderer
  QUERY_STREAM_END:         'ml/query/stream/end',     // push: main → renderer

  // ── Projects / Runs ──────────────────────────────────────────────────────
  PROJECT_CREATE:           'ml/project/create',
  PROJECT_LIST:             'ml/project/list',
  RUN_GET:                  'ml/run/get',
  RUN_LIST:                 'ml/run/list',
  RUN_CANCEL:               'ml/run/cancel',

  // ── Agent pipeline ───────────────────────────────────────────────────────
  AGENT_START:              'ml/agent/start',
  AGENT_PLAN_READY:         'ml/agent/plan/ready',       // push: main → renderer
  AGENT_PLAN_APPROVE:       'ml/agent/plan/approve',
  AGENT_PLAN_REJECT:        'ml/agent/plan/reject',

  // ── Execution events (push: main → renderer) ─────────────────────────────
  AGENT_STATUS_UPDATE:      'ml/agent/status/update',
  AGENT_LOG_LINE:           'ml/agent/log/line',
  AGENT_STEP_COMPLETE:      'ml/agent/step/complete',
  AGENT_STEP_FAILED:        'ml/agent/step/failed',
  AGENT_HUMAN_CHECKPOINT:   'ml/agent/human/checkpoint',
  AGENT_HUMAN_RESPONSE:     'ml/agent/human/response',
  AGENT_COMPLETE:           'ml/agent/complete',

  // ── Compute target ───────────────────────────────────────────────────────
  COMPUTE_TARGET_SET:       'ml/compute/target/set',
  COMPUTE_CLOUD_CONFIG:     'ml/compute/cloud/config',
  COMPUTE_LOCAL_DETECT:     'ml/compute/local/detect',

  // ── Jupyter kernel ───────────────────────────────────────────────────────
  KERNEL_START:             'ml/kernel/start',
  KERNEL_STOP:              'ml/kernel/stop',
  KERNEL_EXECUTE:           'ml/kernel/execute',
  KERNEL_OUTPUT:            'ml/kernel/output',          // push: main → renderer
  KERNEL_STATUS:            'ml/kernel/status',          // push: main → renderer

  // ── Task queue ───────────────────────────────────────────────────────────
  TASK_LIST:                'ml/task/list',
  TASK_RETRY:               'ml/task/retry',
  TASK_CANCEL:              'ml/task/cancel',

  // ── Metrics / Report ─────────────────────────────────────────────────────
  METRICS_GET:              'ml/metrics/get',
  REPORT_GET:               'ml/report/get',
} as const;

export type MLChannel = typeof MLChannels[keyof typeof MLChannels];
