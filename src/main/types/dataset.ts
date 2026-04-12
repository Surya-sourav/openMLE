export type MLTaskType =
  | 'binary_classification'
  | 'multiclass_classification'
  | 'regression'
  | 'clustering'
  | 'time_series'
  | 'nlp_classification'
  | 'object_detection'
  | 'unknown';

export interface ColumnMeta {
  name: string;
  dtype: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean' | 'unknown';
  nullCount: number;
  uniqueCount: number;
  sample: (string | number | null)[];
}

export interface DatasetMeta {
  id: string;
  originalName: string;
  storedPath: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  inferredTask?: MLTaskType;
}
