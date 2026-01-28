export interface MetricsResult {
    filename: string
    sharpness: { score: number, is_blurry: boolean }
    exposure: { score: number, flags: string[] }
    technical_score: number
    is_unusable: boolean
    reasons: string[]
    group_id?: number
    group_size?: number
    rank_in_group?: number
    is_group_best?: boolean
}

export interface GroupItem {
    filename: string
    technical_score: number
    rank_in_group: number
    is_group_best: boolean
}

export interface GroupInfo {
    group_id: number
    group_size: number
    best: string[]
    items: GroupItem[]
}

export interface GroupsFile {
    input_dir: string
    embed_model: string
    thumb_long_edge: number
    eps: number
    min_samples: number
    neighbor_window: number
    topk: number
    groups: GroupInfo[]
    noise_group_id: number
    noise: GroupItem[]
}

export interface SortOption {
    field: string
    order: 'asc' | 'desc'
}

export interface FilterOption {
    minScore: number
    blurryMode: 'all' | 'only' | 'exclude'
}

export interface AppState {
    inputDir: string | null
    photos: MetricsResult[]
    selectedPhotos: Set<string> // filenames

    viewMode: 'all' | 'grouped'
    groups: GroupsFile | null
    selectedGroupId: number | null
    showOnlyGroupBest: boolean
    groupingParams: {
        embedModel: string
        thumbLongEdge: number
        eps: number
        minSamples: number
        neighborWindow: number
        topk: number
        workers: number
        batchSize: number
    }
    grouping: boolean
    groupProgress: { stage: string, done: number, total: number, cache_hit?: number } | null
    
    // Filters
    profile: 'daylight' | 'event_indoor' | 'outdoor_portrait' | 'night'
    showUnusable: boolean
    sortOption: SortOption
    filterOption: FilterOption
    
    // Params
    config: {
        max_long_edge: number
        weights: { sharpness: number, exposure: number }
        thresholds: { sharpness: number, low_light: number }
    }
    
    // Status
    computing: boolean
    progress: { done: number, total: number } | null

    rebuildCache: boolean

    sidebarVisible: boolean
    rightPanelVisible: boolean
}
