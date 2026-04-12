import {
  Dialog,
  // DialogClose,
  DialogContent,
  DialogDescription,
  // DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// import { Button } from "@/components/ui/button";

import { Separator } from '@/components/ui/separator';

type DataSourceDialogProps = {
  openState: boolean;
  setOpenState: (open: boolean) => void;
  onSelectPostgres?: () => void;
};

function DataSourceDialog({ openState, setOpenState, onSelectPostgres }: DataSourceDialogProps) {
  const cards = [{ key: 'postgres', label: 'PostgreSQL', img: '/postgresql.svg' }];

  return (
    <Dialog open={openState} onOpenChange={setOpenState}>
      <DialogContent className="sm:max-w-[560px] md:max-w-[720px] lg:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>Select a data source</DialogTitle>
          <DialogDescription>Choose one of the available database providers.</DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.key}
              type="button"
              className="group border rounded-lg p-4 bg-card hover:bg-accent transition-colors"
              onClick={() => {
                if (card.key === 'postgres') {
                  setOpenState(false);
                  onSelectPostgres?.();
                }
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <img
                  src={card.img}
                  alt={`${card.label} logo`}
                  className="size-16 opacity-80 group-hover:opacity-100"
                />
                <span className="text-sm font-medium">{card.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}

export { DataSourceDialog };
