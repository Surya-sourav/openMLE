import { useState, useCallback } from 'react';
import { ProjectSidebar } from '../components/agent/ProjectSidebar';
import { ChatPanel } from '../components/agent/ChatPanel';
import { NotebookPanel } from '../components/agent/NotebookPanel';
import { TerminalPanel } from '../components/agent/TerminalPanel';
import { PanelResizer } from '../components/layout/PanelResizer';

export function MainPage() {
  const [chatPct, setChatPct] = useState(26);
  const [terminalPct, setTerminalPct] = useState(27);
  const notebookPct = 100 - chatPct - terminalPct;

  const dragChat = useCallback((dx: number) => {
    setChatPct((p) => Math.max(18, Math.min(42, p + (dx / window.innerWidth) * 100)));
  }, []);

  const dragTerminal = useCallback((dx: number) => {
    setTerminalPct((p) => Math.max(18, Math.min(42, p - (dx / window.innerWidth) * 100)));
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Far-left: dataset / project navigation sidebar */}
      <div className="w-[200px] flex-shrink-0">
        <ProjectSidebar />
      </div>

      {/* Panel 1 — Chat (Query + Agent mode toggle lives here) */}
      <div
        style={{ width: `${chatPct}%` }}
        className="flex flex-col h-full min-w-[220px] flex-shrink-0"
      >
        <ChatPanel />
      </div>

      <PanelResizer onDrag={dragChat} />

      {/* Panel 2 — Notebook / Kernel output */}
      <div
        style={{ width: `${notebookPct}%` }}
        className="flex flex-col h-full min-w-[280px] border-x border-zinc-800"
      >
        <NotebookPanel />
      </div>

      <PanelResizer onDrag={dragTerminal} />

      {/* Panel 3 — Terminal */}
      <div
        style={{ width: `${terminalPct}%` }}
        className="flex flex-col h-full min-w-[200px] flex-shrink-0"
      >
        <TerminalPanel />
      </div>
    </div>
  );
}
