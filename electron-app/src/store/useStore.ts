import { createWithEqualityFn } from 'zustand/traditional'
import type { AppState, MetricsResult, GroupsFile } from '../types'

type PersistedPreferences = Pick<
    AppState,
    | 'profile'
    | 'showUnusable'
    | 'sortOption'
    | 'filterOption'
    | 'config'
    | 'groupingParams'
    | 'showOnlyGroupBest'
    | 'rebuildCache'
    | 'rightPanelVisible'
>

const PREFERENCES_KEY = 'primepick:preferences:v1'

const loadPreferences = (): Partial<PersistedPreferences> => {
    if (typeof window === 'undefined') return {}
    try {
        const raw = window.localStorage.getItem(PREFERENCES_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return {}
        return parsed
    } catch {
        return {}
    }
}

const persistablePreferences = (s: AppState): PersistedPreferences => ({
    profile: s.profile,
    showUnusable: s.showUnusable,
    sortOption: s.sortOption,
    filterOption: s.filterOption,
    config: s.config,
    groupingParams: s.groupingParams,
    showOnlyGroupBest: s.showOnlyGroupBest,
    rebuildCache: s.rebuildCache,
    rightPanelVisible: s.rightPanelVisible,
})

const mergeConfig = (base: AppState['config'], incoming?: Partial<AppState['config']>) => {
    if (!incoming) return base
    return {
        ...base,
        ...incoming,
        weights: { ...base.weights, ...(incoming as any).weights },
        thresholds: { ...base.thresholds, ...(incoming as any).thresholds },
    }
}

const mergeGroupingParams = (base: AppState['groupingParams'], incoming?: Partial<AppState['groupingParams']>) => {
    if (!incoming) return base
    return { ...base, ...incoming }
}

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
    setRightPanelVisible: (visible: boolean) => void
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

const persisted = loadPreferences()

const defaultGroupingParams: AppState['groupingParams'] = {
    embedModel: 'mobilenet_v3_small',
    thumbLongEdge: 256,
    eps: 0.12,
    minSamples: 2,
    neighborWindow: 80,
    timeWindowSecs: 6,
    timeSource: 'auto',
    topk: 2,
    workers: 4,
    batchSize: 32,
}

const defaultConfig: AppState['config'] = {
    max_long_edge: 1024,
    weights: { sharpness: 1.0, exposure: 1.0 },
    thresholds: { sharpness: 60.0, low_light: 10.0 },
}

export const useStore = createWithEqualityFn<Store>((set) => ({
    inputDir: null,
    photos: [],
    groups: null,
    selectedPhotos: new Set(),
    viewMode: 'all',
    selectedGroupId: null,
    showOnlyGroupBest: typeof (persisted as any).showOnlyGroupBest === 'boolean' ? (persisted as any).showOnlyGroupBest : false,
    groupingParams: mergeGroupingParams(defaultGroupingParams, (persisted as any).groupingParams),
    grouping: false,
    groupProgress: null,
    profile: (persisted as any).profile ?? 'daylight',
    showUnusable: typeof (persisted as any).showUnusable === 'boolean' ? (persisted as any).showUnusable : true,
    sortOption: (persisted as any).sortOption ?? { field: 'filename', order: 'asc' },
    filterOption: (persisted as any).filterOption ?? { minScore: 0, blurryMode: 'all' },
    config: mergeConfig(defaultConfig, (persisted as any).config),
    computing: false,
    progress: null,
    rebuildCache: typeof (persisted as any).rebuildCache === 'boolean' ? (persisted as any).rebuildCache : false,
    rightPanelVisible: typeof (persisted as any).rightPanelVisible === 'boolean' ? (persisted as any).rightPanelVisible : true,

    setInputDir: (dir) => set({ inputDir: dir }),
    setPhotos: (photos) => set({ photos }),
    setGroups: (groups) => set({ groups }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),
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

if (typeof window !== 'undefined') {
    let last = window.localStorage.getItem(PREFERENCES_KEY) ?? ''

    useStore.subscribe((state) => {
        const next = JSON.stringify(persistablePreferences(state))
        if (next === last) return
        const existing = window.localStorage.getItem(PREFERENCES_KEY) ?? ''
        if (existing !== next) window.localStorage.setItem(PREFERENCES_KEY, next)
        last = next
    })

    window.addEventListener('storage', (e) => {
        if (e.key !== PREFERENCES_KEY) return
        const nv = e.newValue ?? ''
        if (!nv || nv === last) return
        last = nv
        try {
            const parsed = JSON.parse(nv)
            if (!parsed || typeof parsed !== 'object') return
            useStore.setState(
                (state) => ({
                    profile: (parsed as any).profile ?? state.profile,
                    showUnusable: typeof (parsed as any).showUnusable === 'boolean' ? (parsed as any).showUnusable : state.showUnusable,
                    sortOption: (parsed as any).sortOption ?? state.sortOption,
                    filterOption: (parsed as any).filterOption ?? state.filterOption,
                    config: mergeConfig(state.config, (parsed as any).config),
                    groupingParams: mergeGroupingParams(state.groupingParams, (parsed as any).groupingParams),
                    showOnlyGroupBest:
                        typeof (parsed as any).showOnlyGroupBest === 'boolean' ? (parsed as any).showOnlyGroupBest : state.showOnlyGroupBest,
                    rebuildCache: typeof (parsed as any).rebuildCache === 'boolean' ? (parsed as any).rebuildCache : state.rebuildCache,
                    rightPanelVisible:
                        typeof (parsed as any).rightPanelVisible === 'boolean' ? (parsed as any).rightPanelVisible : state.rightPanelVisible,
                }),
                false,
            )
        } catch {}
    })
}
