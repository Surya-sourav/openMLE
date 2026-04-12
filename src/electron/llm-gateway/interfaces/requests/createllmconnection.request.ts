export interface CreateLLMConnectionRequest {
  provider: string;
  key: string;
  model: string;
  is_default?: boolean;
}
