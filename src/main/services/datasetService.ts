import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import type { DatasetMeta, ColumnMeta, MLTaskType } from '../types/dataset.js';

const REGISTRY_FILE = () => path.join(config.datasetStorePath, 'registry.json');

export class DatasetService {
  private registry: DatasetMeta[] = [];

  loadRegistry(): void {
    const file = REGISTRY_FILE();
    if (fs.existsSync(file)) {
      try {
        this.registry = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch {
        this.registry = [];
      }
    }
  }

  private saveRegistry(): void {
    const file = REGISTRY_FILE();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(this.registry, null, 2), 'utf-8');
  }

  async uploadDataset(
    originalName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<DatasetMeta> {
    const id = randomUUID();
    const ext = path.extname(originalName);
    const datasetDir = path.join(config.datasetStorePath, id);
    fs.mkdirSync(datasetDir, { recursive: true });
    const storedPath = path.join(datasetDir, originalName);
    fs.writeFileSync(storedPath, buffer);

    let csvPath = storedPath;
    if (ext.toLowerCase() === '.xlsx' || ext.toLowerCase() === '.xls') {
      csvPath = await this.convertXlsxToCsv(storedPath, datasetDir);
    }

    const { columns, rowCount } = await this.analyseCSV(csvPath);

    const meta: DatasetMeta = {
      id,
      originalName,
      storedPath: csvPath,
      uploadedAt: new Date().toISOString(),
      sizeBytes: buffer.length,
      rowCount,
      columnCount: columns.length,
      columns,
    };

    fs.writeFileSync(path.join(datasetDir, 'meta.json'), JSON.stringify(meta, null, 2));
    this.registry.push(meta);
    this.saveRegistry();
    return meta;
  }

  private async convertXlsxToCsv(xlsxPath: string, destDir: string): Promise<string> {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(xlsxPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(ws);
    const csvPath = path.join(destDir, path.basename(xlsxPath, path.extname(xlsxPath)) + '.csv');
    fs.writeFileSync(csvPath, csv, 'utf-8');
    return csvPath;
  }

  private async analyseCSV(
    csvPath: string
  ): Promise<{ columns: ColumnMeta[]; rowCount: number }> {
    const Papa = await import('papaparse');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const rows = parsed.data as Record<string, string>[];
    const headers = parsed.meta.fields ?? [];

    const columns: ColumnMeta[] = headers.map((name: string) => {
      const values = rows.map((r) => r[name]);
      const nonNull = values.filter((v) => v !== '' && v !== null && v !== undefined);
      const nullCount = values.length - nonNull.length;
      const uniqueVals = new Set(nonNull);
      const numericValues = nonNull.filter((v) => !isNaN(Number(v)));
      const isNumeric = nonNull.length > 0 && numericValues.length / nonNull.length > 0.8;
      const isCategorical = !isNumeric && uniqueVals.size < 20 && rows.length > 50;

      let dtype: ColumnMeta['dtype'] = 'unknown';
      if (isNumeric) dtype = 'numeric';
      else if (isCategorical) dtype = 'categorical';
      else dtype = 'text';

      const sample = Array.from(uniqueVals).slice(0, 5).map((v) =>
        isNumeric ? Number(v) : v
      ) as (string | number | null)[];

      return {
        name,
        dtype,
        nullCount,
        uniqueCount: uniqueVals.size,
        sample,
      };
    });

    return { columns, rowCount: rows.length };
  }

  listDatasets(): DatasetMeta[] {
    return this.registry;
  }

  getDataset(id: string): DatasetMeta | undefined {
    return this.registry.find((d) => d.id === id);
  }

  async previewDataset(
    id: string,
    rows = 100
  ): Promise<{ headers: string[]; rows: (string | number | null)[][] }> {
    const meta = this.getDataset(id);
    if (!meta) throw new Error(`Dataset ${id} not found`);

    const Papa = await import('papaparse');
    const content = fs.readFileSync(meta.storedPath, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const headers = parsed.meta.fields ?? [];
    const data = (parsed.data as Record<string, unknown>[])
      .slice(0, rows)
      .map((row) => headers.map((h: string) => row[h] as string | number | null));

    return { headers, rows: data };
  }

  async deleteDataset(id: string): Promise<void> {
    const meta = this.getDataset(id);
    if (!meta) return;
    const datasetDir = path.join(config.datasetStorePath, id);
    fs.rmSync(datasetDir, { recursive: true, force: true });
    this.registry = this.registry.filter((d) => d.id !== id);
    this.saveRegistry();
  }

  updateInferredTask(id: string, taskType: MLTaskType): void {
    const meta = this.getDataset(id);
    if (!meta) return;
    meta.inferredTask = taskType;
    this.saveRegistry();
  }
}
