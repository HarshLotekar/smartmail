import { create } from 'zustand'

// UI store for shared inbox filters/search and sync triggers
export const useUIStore = create((set, get) => ({
  // Filters
  searchQuery: '',
  selectedFilter: 'all',
  labelFilter: '',

  // Sync/refresh trigger
  refreshCounter: 0,
  syncing: false,
  lastSyncTime: null,
  syncError: null,

  // Actions
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedFilter: (f) => set({ selectedFilter: f }),
  setLabelFilter: (l) => set({ labelFilter: l }),
  triggerRefresh: () => set({ refreshCounter: get().refreshCounter + 1 }),
  setSyncing: (v) => set({ syncing: v }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setSyncError: (error) => set({ syncError: error })
}))
