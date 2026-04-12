import { Button } from '@/components/ui/button';

export function NoDataSource({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-2xl sm:text-3xl font-bold">No data source selected</div>
        <Button type="button" variant="outline" onClick={onAdd}>
          Add Datasource
        </Button>
      </div>
    </div>
  );
}
