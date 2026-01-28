export interface MetricsResult {
    filename: string
    sharpness: { score: number, is_blurry: boolean }
    exposure: { score: number, flags: string[] }
    technical_score: number
    is_unusable: boolean
    reasons: string[]
}

export interface AppState {
    inputDir: string | null
    photos: MetricsResult[]
    selectedPhotos: Set<string> // filenames
    
    // Filters
    profile: 'daylight' | 'event_indoor' | 'outdoor_portrait' | 'night'
    showUnusable: boolean
    
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
}
