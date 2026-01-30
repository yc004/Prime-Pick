import { createWithEqualityFn } from 'zustand/traditional'
import type { AppState, MetricsResult, GroupsFile } from '../types'

type PersistedPreferences = Pick<
    AppState,
    | 'inputDir'
    | 'themeMode'
    | 'viewMode'
    | 'selectedGroupId'
    | 'profile'
    | 'showUnusable'
    | 'sortOption'
    | 'filterOption'
    | 'photoLayout'
    | 'config'
    | 'profileConfigs'
    | 'groupingParams'
    | 'showOnlyGroupBest'
    | 'rebuildCache'
    | 'computeWorkers'
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
    inputDir: s.inputDir,
    themeMode: s.themeMode,
    viewMode: s.viewMode,
    selectedGroupId: s.selectedGroupId,
    profile: s.profile,
    showUnusable: s.showUnusable,
    sortOption: s.sortOption,
    filterOption: s.filterOption,
    photoLayout: s.photoLayout,
    config: s.config,
    profileConfigs: s.profileConfigs,
    groupingParams: s.groupingParams,
    showOnlyGroupBest: s.showOnlyGroupBest,
    rebuildCache: s.rebuildCache,
    computeWorkers: s.computeWorkers,
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
    minEmotionScore?: number
}

interface Store extends AppState {
    setInputDir: (dir: string) => void
    setThemeMode: (mode: AppState['themeMode']) => void
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
    setComputeWorkers: (workers: number) => void
    setSortOption: (option: SortOption) => void
    setFilterOption: (option: Partial<FilterOption>) => void
    toggleFilterEmotion: (emotion: string) => void
    clearFilterEmotions: () => void
    setPhotoLayout: (layout: AppState['photoLayout']) => void
    setWritingXmp: (writing: boolean) => void
    setXmpProgress: (progress: { done: number, total: number } | null) => void
    sortOption: SortOption
    filterOption: FilterOption
    writingXmp: boolean
    xmpProgress: { done: number, total: number } | null
}

const persisted = loadPreferences()
const initialThemeMode: AppState['themeMode'] =
    (persisted as any).themeMode === 'light' || (persisted as any).themeMode === 'system' || (persisted as any).themeMode === 'dark'
        ? (persisted as any).themeMode
        : 'dark'

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
    weights: { sharpness: 0.6, exposure: 0.4 },
    thresholds: { sharpness: 100.0, low_light: 40.0 },
}

const configForProfile = (profile: AppState['profile']): AppState['config'] => {
    if (profile === 'night') {
        return mergeConfig(defaultConfig, { thresholds: { low_light: 20.0 }, weights: { exposure: 0.3 } } as any)
    }
    if (profile === 'event_indoor') {
        return mergeConfig(defaultConfig, { thresholds: { sharpness: 80.0 } } as any)
    }
    if (profile === 'outdoor_portrait') {
        return mergeConfig(defaultConfig, { weights: { exposure: 2.0 } } as any)
    }
    return defaultConfig
}

const mergeProfileConfigs = (
    incoming: any,
): Partial<AppState['profileConfigs']> => {
    if (!incoming || typeof incoming !== 'object') return {}
    const result: Partial<AppState['profileConfigs']> = {}
    for (const key of ['daylight', 'event_indoor', 'outdoor_portrait', 'night'] as const) {
        const v = (incoming as any)[key]
        if (v && typeof v === 'object') {
            result[key] = mergeConfig(configForProfile(key), v)
        }
    }
    return result
}

export const useStore = createWithEqualityFn<Store>((set) => ({
    inputDir: typeof (persisted as any).inputDir === 'string' ? (persisted as any).inputDir : null,
    photos: [],
    groups: null,
    selectedPhotos: new Set(),
    themeMode: initialThemeMode,
    viewMode: (persisted as any).viewMode === 'grouped' ? 'grouped' : 'all',
    selectedGroupId: typeof (persisted as any).selectedGroupId === 'number' ? (persisted as any).selectedGroupId : null,
    showOnlyGroupBest: typeof (persisted as any).showOnlyGroupBest === 'boolean' ? (persisted as any).showOnlyGroupBest : false,
    groupingParams: mergeGroupingParams(defaultGroupingParams, (persisted as any).groupingParams),
    grouping: false,
    groupProgress: null,
    profile: (persisted as any).profile ?? 'daylight',
    showUnusable: typeof (persisted as any).showUnusable === 'boolean' ? (persisted as any).showUnusable : true,
    sortOption: (persisted as any).sortOption ?? { field: 'filename', order: 'asc' },
    filterOption: (persisted as any).filterOption ?? { minScore: 0, blurryMode: 'all', minEmotionScore: 0 },
    filterEmotions: new Set<string>(),
    photoLayout: (persisted as any).photoLayout === 'grid' ? 'grid' : 'list',
    profileConfigs: {
        daylight: configForProfile('daylight'),
        event_indoor: configForProfile('event_indoor'),
        outdoor_portrait: configForProfile('outdoor_portrait'),
        night: configForProfile('night'),
        ...mergeProfileConfigs((persisted as any).profileConfigs),
        ...(
            !(persisted as any).profileConfigs && (persisted as any).config
                ? { [((persisted as any).profile ?? 'daylight') as AppState['profile']]: mergeConfig(configForProfile(((persisted as any).profile ?? 'daylight') as any), (persisted as any).config) }
                : {}
        ),
    },
    config: mergeConfig(
        configForProfile(((persisted as any).profile ?? 'daylight') as any),
        (
            ((persisted as any).profileConfigs && (persisted as any).profileConfigs[((persisted as any).profile ?? 'daylight') as any])
                ? (persisted as any).profileConfigs[((persisted as any).profile ?? 'daylight') as any]
                : (persisted as any).config
        ),
    ),
    computing: false,
    progress: null,
    writingXmp: false,
    xmpProgress: null,
    rebuildCache: typeof (persisted as any).rebuildCache === 'boolean' ? (persisted as any).rebuildCache : false,
    computeWorkers: typeof (persisted as any).computeWorkers === 'number' ? (persisted as any).computeWorkers : 4,
    rightPanelVisible: typeof (persisted as any).rightPanelVisible === 'boolean' ? (persisted as any).rightPanelVisible : true,

    setInputDir: (dir) => set({ inputDir: dir }),
    setThemeMode: (mode) => set({ themeMode: mode }),
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
    setProfile: (p) => set((state) => {
        const nextProfileConfigs: AppState['profileConfigs'] = { ...state.profileConfigs, [state.profile]: state.config }
        const nextConfig = nextProfileConfigs[p] ?? configForProfile(p)
        return { profile: p, config: nextConfig, profileConfigs: nextProfileConfigs }
    }),
    updateConfig: (cfg) => set((state) => {
        const nextConfig = mergeConfig(state.config, cfg)
        return { config: nextConfig, profileConfigs: { ...state.profileConfigs, [state.profile]: nextConfig } }
    }),
    setComputing: (c) => set({ computing: c }),
    setProgress: (p) => set({ progress: p }),
    setWritingXmp: (writing) => set({ writingXmp: writing }),
    setXmpProgress: (p) => set({ xmpProgress: p }),
    toggleShowUnusable: () => set((state) => ({ showUnusable: !state.showUnusable })), 
    setRebuildCache: (value) => set({ rebuildCache: value }),
    setComputeWorkers: (w) => set({ computeWorkers: w }),
    setSortOption: (option) => set({ sortOption: option }),
    setFilterOption: (option) => set((state) => ({ filterOption: { ...state.filterOption, ...option } })),
    toggleFilterEmotion: (emotion) => set((state) => {
        const newSet = new Set(state.filterEmotions)
        if (newSet.has(emotion)) {
            newSet.delete(emotion)
        } else {
            newSet.add(emotion)
        }
        return { filterEmotions: newSet }
    }),
    clearFilterEmotions: () => set({ filterEmotions: new Set() }),
    setPhotoLayout: (layout) => set({ photoLayout: layout }),
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
                (state) => {
                    const incomingProfile = ((parsed as any).profile ?? state.profile) as AppState['profile']
                    const incomingProfileConfigs = {
                        ...state.profileConfigs,
                        ...mergeProfileConfigs((parsed as any).profileConfigs),
                        ...(
                            !(parsed as any).profileConfigs && (parsed as any).config
                                ? { [incomingProfile]: mergeConfig(configForProfile(incomingProfile), (parsed as any).config) }
                                : {}
                        ),
                    } as AppState['profileConfigs']
                    const incomingConfig = incomingProfileConfigs[incomingProfile] ?? state.config
                    return {
                        inputDir: typeof (parsed as any).inputDir === 'string' ? (parsed as any).inputDir : state.inputDir,
                        themeMode:
                            (parsed as any).themeMode === 'light' || (parsed as any).themeMode === 'system' || (parsed as any).themeMode === 'dark'
                                ? (parsed as any).themeMode
                                : state.themeMode,
                        viewMode: (parsed as any).viewMode === 'grouped' ? 'grouped' : state.viewMode,
                        selectedGroupId:
                            typeof (parsed as any).selectedGroupId === 'number' ? (parsed as any).selectedGroupId : state.selectedGroupId,
                        profile: incomingProfile,
                        showUnusable: typeof (parsed as any).showUnusable === 'boolean' ? (parsed as any).showUnusable : state.showUnusable,
                        sortOption: (parsed as any).sortOption ?? state.sortOption,
                        filterOption: (parsed as any).filterOption ?? state.filterOption,
                        photoLayout: (parsed as any).photoLayout === 'grid' ? 'grid' : state.photoLayout,
                        profileConfigs: incomingProfileConfigs,
                        config: mergeConfig(configForProfile(incomingProfile), incomingConfig),
                        groupingParams: mergeGroupingParams(state.groupingParams, (parsed as any).groupingParams),
                        showOnlyGroupBest:
                            typeof (parsed as any).showOnlyGroupBest === 'boolean' ? (parsed as any).showOnlyGroupBest : state.showOnlyGroupBest,
                        rebuildCache: typeof (parsed as any).rebuildCache === 'boolean' ? (parsed as any).rebuildCache : state.rebuildCache,
                        computeWorkers: typeof (parsed as any).computeWorkers === 'number' ? (parsed as any).computeWorkers : state.computeWorkers,
                        rightPanelVisible:
                            typeof (parsed as any).rightPanelVisible === 'boolean' ? (parsed as any).rightPanelVisible : state.rightPanelVisible,
                    }
                },
                false,
            )
        } catch {}
    })
}
