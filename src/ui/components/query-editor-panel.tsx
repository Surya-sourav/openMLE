import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Editor from '@monaco-editor/react';

export function QueryEditorPanel() {
  const [sql, setSql] = useState(
    "SELECT 1 AS id, 'Alice' AS name UNION ALL SELECT 2 AS id, 'Bob' AS name;",
  );
  const [rows, setRows] = useState<Array<Record<string, string | number>>>([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
  const [activeTab, setActiveTab] = useState<'code' | 'output'>('code');
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const applyTheme = () => setIsDark(root.classList.contains('dark'));
    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  function runQuery() {
    // placeholder for future execution logic
    setRows((r) => [...r]);
    setActiveTab('output');
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="flex h-full flex-col min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'code' | 'output')}
        className="flex-1 flex flex-col min-h-0 gap-0"
      >
        <div className="px-1">
          <TabsList className="bg-transparent border-b p-0 h-auto gap-0 rounded-none">
            <TabsTrigger
              value="code"
              className="h-9 rounded-t-md rounded-b-none border border-b-0 -mb-px px-3 py-1 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-b-transparent"
            >
              Code
            </TabsTrigger>
            <TabsTrigger
              value="output"
              className="h-9 rounded-t-md rounded-b-none border border-b-0 -mb-px px-3 py-1 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-b-transparent"
            >
              Output
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="code" className="flex-1 min-h-0 m-0 p-0">
          <div className="relative h-full min-h-0 border rounded-md">
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={sql}
              onChange={(value) => setSql(value ?? '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                fontSize: 13,
                tabSize: 2,
                automaticLayout: true,
                renderLineHighlight: 'line',
              }}
              className="rounded-md"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 bg-transparent hover:bg-transparent text-emerald-400 hover:text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
              onClick={runQuery}
              aria-label="Run SQL"
            >
              <Play className="size-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="output" className="flex-1 min-h-0 m-0 p-0">
          <div className="h-full border rounded-md overflow-auto">
            <div className="w-full overflow-auto p-3">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted">
                    {columns.map((col) => (
                      <TableHead key={col} className="border px-2 py-1 text-left">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((col) => (
                        <TableCell key={col} className="border px-2 py-1">
                          {String(row[col] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
