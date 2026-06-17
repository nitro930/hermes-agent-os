import { create } from 'zustand';

export type ActiveView = 'dashboard' | 'agents' | 'chat' | 'memory' | 'tasks' | 'automations' | 'teams' | 'skills' | 'goals' | 'voice' | 'mcp' | 'dev' | 'fusion';

export const VALID_VIEWS: ActiveView[] = ['dashboard', 'agents', 'chat', 'memory', 'tasks', 'automations', 'teams', 'skills', 'goals', 'voice', 'mcp', 'dev', 'fusion'];

/** Read the initial view from the URL hash (e.g. #agents) */
function getInitialView(): ActiveView {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#', '');
  if (VALID_VIEWS.includes(hash as ActiveView)) return hash as ActiveView;
  return 'dashboard';
}

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
  // Dev Server state
  selectedArtifactId: string | null;
  devServerLive: boolean;
  setActiveView: (view: ActiveView) => void;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSelectedMemoryId: (id: string | null) => void;
  setSelectedFolder: (folder: string) => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setSelectedArtifactId: (id: string | null) => void;
  setDevServerLive: (live: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: getInitialView(),
  selectedAgentId: null,
  selectedConversationId: null,
  selectedMemoryId: null,
  selectedFolder: 'General',
  sidebarOpen: true,
  notifications: [],
  selectedArtifactId: null,
  devServerLive: true,
  setActiveView: (view) => {
    // Sync with URL hash for deep linking & browser back/forward
    if (typeof window !== 'undefined') {
      const newHash = `#${view}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }
    }
    set({ activeView: view });
  },
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
  setSelectedArtifactId: (id) => set({ selectedArtifactId: id }),
  setDevServerLive: (live) => set({ devServerLive: live }),
}));
