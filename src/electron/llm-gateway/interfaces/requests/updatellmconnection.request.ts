export interface UpdateLLMConnectionRequest {
  id: number;
  provider?: string;
  key?: string;
  model?: string;
  is_default?: boolean;
}
