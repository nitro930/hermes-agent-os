import { create } from 'zustand';

export type ActiveView = 'dashboard' | 'agents' | 'chat' | 'memory' | 'tasks' | 'automations' | 'teams' | 'skills' | 'goals' | 'voice' | 'mcp';

export interface Notification {
  id: string;
  title: string;
  description?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface AppState {
  activeView: ActiveView;
  selectedAgentId: string | null;
  selectedConversationId: string | null;
  selectedMemoryId: string | null;
  selectedFolder: string;
  sidebarOpen: boolean;
  notifications: Notification[];
  setActiveView: (view: ActiveView) => void;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSelectedMemoryId: (id: string | null) => void;
  setSelectedFolder: (folder: string) => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  selectedAgentId: null,
  selectedConversationId: null,
  selectedMemoryId: null,
  selectedFolder: 'General',
  sidebarOpen: true,
  notifications: [],
  setActiveView: (view) => set({ activeView: view }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSelectedMemoryId: (id) => set({ selectedMemoryId: id }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addNotification: (notification) => set((state) => ({
    notifications: [
      { ...notification, id: Date.now().toString(), timestamp: new Date(), read: false },
      ...state.notifications,
    ].slice(0, 50), // Keep max 50 notifications
  })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
  })),
  clearNotifications: () => set({ notifications: [] }),
}));
