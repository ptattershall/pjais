import { MemoryEntity, MemoryTier } from '@shared/types/memory';

// Search result types
export interface SearchResult {
  memory: MemoryEntity;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'tag' | 'metadata';
  highlightedContent: string;
  vectorSimilarity?: number;
}

export type SearchMode = 'text' | 'semantic' | 'hybrid';

export type SortBy = 'relevance' | 'date' | 'importance' | 'similarity';
export type SortOrder = 'asc' | 'desc';

// Search filters
export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  importanceRange?: {
    min: number;
    max: number;
  };
  tiers?: MemoryTier[];
  types?: string[];
  tags?: string[];
  hasRelationships?: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

// Search filter value type for updateFilter function
export type SearchFilterValue = 
  | { start?: Date; end?: Date }
  | { min?: number; max?: number }
  | MemoryTier[]
  | string[]
  | boolean
  | SortBy
  | SortOrder
  | undefined;

// Export format types
export type ExportFormat = 'json' | 'csv' | 'txt';

// Component props
export interface MemoryAdvancedSearchProps {
  userId: string;
  memories: MemoryEntity[];
  onMemorySelect?: (memory: MemoryEntity) => void;
  onResultsChange?: (results: SearchResult[]) => void;
  enableSemanticSearch?: boolean;
  enableProvenance?: boolean;
  enableExport?: boolean;
}

// Temporal filtering types (from timeline bookmarks)
export interface TemporalFilter {
  dateRange?: [Date, Date];
  timeOfDay?: {
    start: number; // Hours in 24h format
    end: number;
  };
  dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  memoryDensity?: {
    min: number;
    max: number;
  };
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  importanceThreshold?: number;
  tierFilter?: string[];
  typeFilter?: string[];
}

// Timeline bookmark types
export interface TimelineBookmark {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  timeRange?: [Date, Date];
  filters?: TemporalFilter;
  color: string;
  isGlobal: boolean;
  createdAt: Date;
  tags: string[];
}

export interface MemoryTimelineBookmarksProps {
  memories: MemoryEntity[];
  onFilterChange: (filter: TemporalFilter) => void;
  onBookmarkSelect: (bookmark: TimelineBookmark) => void;
  onMemoriesFiltered: (filteredMemories: MemoryEntity[]) => void;
  enablePersistence?: boolean;
} 