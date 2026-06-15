import { create } from 'zustand';

export type ActiveView = 'dashboard' | 'agents' | 'chat' | 'memory' | 'tasks' | 'automations' | 'teams';

interface AppState {
  activeView: ActiveView;
  selectedAgentId: string | null;
  selectedConversationId: string | null;
  selectedMemoryId: string | null;
  selectedFolder: string;
  sidebarOpen: boolean;
  setActiveView: (view: ActiveView) => void;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSelectedMemoryId: (id: string | null) => void;
  setSelectedFolder: (folder: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  selectedAgentId: null,
  selectedConversationId: null,
  selectedMemoryId: null,
  selectedFolder: 'General',
  sidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSelectedMemoryId: (id) => set({ selectedMemoryId: id }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
