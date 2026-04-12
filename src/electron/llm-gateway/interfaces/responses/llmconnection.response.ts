export interface LLMConnectionResponse {
  id: number;
  provider: string;
  key: string;
  model: string;
  is_default: boolean | null;
  created_at: Date;
  updated_at: Date;
}
