import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EllipsisVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type TreeNodeType = 'data_source' | 'schema' | 'table';

type TreeNodeMetadata = {
  monochrome?: boolean;
  [key: string]: unknown;
};

export type TreeNode = {
  type: TreeNodeType;
  icon: string;
  name: string;
  metadata?: TreeNodeMetadata;
  childrens?: TreeNode[];
};

type DatabaseTreeProps = {
  nodes?: TreeNode[];
  onDeleteConnection?: (id: number) => void;
};

function TreeRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex items-center gap-2 py-0.5', className)}>{children}</div>;
}

function ChevronIcon() {
  return (
    <img
      src="/chevron-down.svg"
      alt="toggle"
      className="size-4 transition-transform group-data-[state=closed]:-rotate-90 icon-mono"
    />
  );
}

function NodeIcon({ node }: { node: TreeNode }) {
  const isMonochrome = node?.metadata?.monochrome !== false;
  return (
    <img src={node.icon} alt="" className={cn('size-4 opacity-80', isMonochrome && 'icon-mono')} />
  );
}

function TreeNodeItem({
  node,
  onDeleteConnection,
}: {
  node: TreeNode;
  onDeleteConnection?: (id: number) => void;
}) {
  const isLeaf = node.type !== 'data_source';
  const connectionId =
    typeof node.metadata?.connectionId === 'number' ? node.metadata.connectionId : undefined;
  const isConnectionNode = node.type === 'data_source' && connectionId != null;

  if (isLeaf) {
    return (
      <TreeRow>
        <NodeIcon node={node} />
        <span>{node.name}</span>
      </TreeRow>
    );
  }

  return (
    <div className="flex items-start gap-1">
      <Collapsible className="flex-1">
        <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left mb-1">
          <ChevronIcon />
          <NodeIcon node={node} />
          <span className="flex-1 truncate">{node.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-5">
          {node.childrens?.map((child, idx) => (
            <TreeNodeItem
              node={child}
              key={`${node.name}-${child.name}-${idx}`}
              onDeleteConnection={onDeleteConnection}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
      {isConnectionNode && onDeleteConnection && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Connection options"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-xs text-destructive"
              onClick={() => onDeleteConnection(connectionId)}
            >
              Delete connection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function DatabaseTree({ nodes, onDeleteConnection }: DatabaseTreeProps) {
  const defaultNodes: TreeNode[] = [
    {
      type: 'data_source',
      icon: '/postgresql.svg',
      name: 'production_db',
      metadata: { monochrome: false },
      childrens: [
        {
          type: 'schema',
          icon: '/folder-tree.svg',
          name: 'public',
          metadata: { monochrome: true },
          childrens: [
            {
              type: 'table',
              icon: '/table.svg',
              name: 'table name1',
              metadata: { monochrome: true },
            },
            {
              type: 'table',
              icon: '/table.svg',
              name: 'table name2',
              metadata: { monochrome: true },
            },
          ],
        },
      ],
    },
  ];

  const data = nodes && nodes.length > 0 ? nodes : defaultNodes;

  return (
    <div className="p-2 text-sm">
      {data.map((node, index) => (
        <TreeNodeItem
          node={node}
          key={`${node.name}-${index}`}
          onDeleteConnection={onDeleteConnection}
        />
      ))}
    </div>
  );
}
