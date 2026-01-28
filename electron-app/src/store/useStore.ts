import { createWithEqualityFn } from 'zustand/traditional'
import type { AppState, MetricsResult, GroupsFile } from '../types'

export interface SortOption {
    field: string
    order: 'asc' | 'desc'
}

export interface FilterOption {
    minScore: number
    blurryMode: 'all' | 'only' | 'exclude'
}

interface Store extends AppState {
    setInputDir: (dir: string) => void
    setPhotos: (photos: MetricsResult[]) => void
    setGroups: (groups: GroupsFile | null) => void
    setViewMode: (mode: AppState['viewMode']) => void
    setSidebarVisible: (visible: boolean) => void
    setRightPanelVisible: (visible: boolean) => void
    toggleSidebarVisible: () => void
    toggleRightPanelVisible: () => void
    setSelectedGroupId: (groupId: number | null) => void
    toggleShowOnlyGroupBest: () => void
    updateGroupingParams: (params: Partial<AppState['groupingParams']>) => void
    setGrouping: (value: boolean) => void
    setGroupProgress: (p: AppState['groupProgress']) => void
    toggleSelection: (filename: string, multi: boolean) => void
    selectRange: (start: string, end: string) => void
    clearSelection: () => void
    selectAll: (filenames?: string[]) => void
    setProfile: (p: AppState['profile']) => void
    updateConfig: (cfg: Partial<AppState['config']>) => void
    setComputing: (computing: boolean) => void
    setProgress: (progress: { done: number, total: number } | null) => void
    toggleShowUnusable: () => void
    setRebuildCache: (value: boolean) => void
    setSortOption: (option: SortOption) => void
    setFilterOption: (option: Partial<FilterOption>) => void
    sortOption: SortOption
    filterOption: FilterOption
}

export const useStore = createWithEqualityFn<Store>((set) => ({
    inputDir: null,
    photos: [],
    groups: null,
    selectedPhotos: new Set(),
    viewMode: 'all',
    selectedGroupId: null,
    showOnlyGroupBest: false,
    groupingParams: {
        embedModel: 'mobilenet_v3_small',
        thumbLongEdge: 256,
        eps: 0.12,
        minSamples: 2,
        neighborWindow: 80,
        topk: 2,
        workers: 4,
        batchSize: 32,
    },
    grouping: false,
    groupProgress: null,
    profile: 'daylight',
    showUnusable: true,
    sortOption: { field: 'filename', order: 'asc' },
    filterOption: { minScore: 0, blurryMode: 'all' },
    config: {
        max_long_edge: 1024,
        weights: { sharpness: 1.0, exposure: 1.0 },
        thresholds: { sharpness: 60.0, low_light: 10.0 }
    },
    computing: false,
    progress: null,
    rebuildCache: false,
    sidebarVisible: true,
    rightPanelVisible: true,

    setInputDir: (dir) => set({ inputDir: dir }),
    setPhotos: (photos) => set({ photos }),
    setGroups: (groups) => set({ groups }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
    setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
    toggleSidebarVisible: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    toggleRightPanelVisible: () => set((state) => ({ rightPanelVisible: !state.rightPanelVisible })),
    setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
    toggleShowOnlyGroupBest: () => set((state) => ({ showOnlyGroupBest: !state.showOnlyGroupBest })),
    updateGroupingParams: (params) => set((state) => ({ groupingParams: { ...state.groupingParams, ...params } })),
    setGrouping: (value) => set({ grouping: value }),
    setGroupProgress: (p) => set({ groupProgress: p }),
    toggleSelection: (filename, multi) => set((state) => {
        const newSet = multi ? new Set(state.selectedPhotos) : new Set<string>()
        if (multi && newSet.has(filename)) {
            newSet.delete(filename)
        } else {
            newSet.add(filename)
        }
        return { selectedPhotos: newSet }
    }),
    selectRange: (start, end) => set((state) => {
        const startIdx = state.photos.findIndex(p => p.filename === start)
        const endIdx = state.photos.findIndex(p => p.filename === end)
        if (startIdx === -1 || endIdx === -1) return {}
        
        const [low, high] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const range = state.photos.slice(low, high + 1).map(p => p.filename)
        const newSet = new Set(state.selectedPhotos)
        range.forEach(f => newSet.add(f))
        return { selectedPhotos: newSet }
    }),
    clearSelection: () => set({ selectedPhotos: new Set() }),
    selectAll: (filenames) => set((state) => {
        const files = filenames ?? state.photos.map(p => p.filename)
        return { selectedPhotos: new Set(files) }
    }),
    setProfile: (p) => set({ profile: p }),
    updateConfig: (cfg) => set((state) => ({ config: { ...state.config, ...cfg } })),
    setComputing: (c) => set({ computing: c }),
    setProgress: (p) => set({ progress: p }),
    toggleShowUnusable: () => set((state) => ({ showUnusable: !state.showUnusable })),
    setRebuildCache: (value) => set({ rebuildCache: value }),
    setSortOption: (option) => set({ sortOption: option }),
    setFilterOption: (option) => set((state) => ({ filterOption: { ...state.filterOption, ...option } })),
}))
