export interface LLMConnectionListItem {
  id: number;
  provider: string;
  model: string;
  is_default: boolean | null;
  created_at: Date;
}
