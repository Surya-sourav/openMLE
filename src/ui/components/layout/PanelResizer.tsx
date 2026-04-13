import { useRef } from 'react';

interface Props {
  onDrag: (dx: number) => void;
}

export function PanelResizer({ onDrag }: Props) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    };

    const handleUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      className="w-1 flex-shrink-0 bg-zinc-800 hover:bg-zinc-600 active:bg-blue-500 transition-colors cursor-col-resize"
      onMouseDown={handleMouseDown}
    />
  );
}
