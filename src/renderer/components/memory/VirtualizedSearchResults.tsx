import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { VirtualizedList } from '../common/VirtualizedList';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';

interface SearchResult {
  memory: {
    id: string;
    type: string;
    content: string | Record<string, unknown>;
    memoryTier: string;
    importance?: number;
    createdAt?: string;
    lastAccessed?: string;
    tags?: string[];
  };
  relevanceScore: number;
  matchType: 'content' | 'metadata' | 'semantic' | 'hybrid';
  vectorSimilarity?: number;
  matches?: Array<{
    field: string;
    value: string;
    highlights: string[];
  }>;
}

interface VirtualizedSearchResultsProps {
  results: SearchResult[];
  selectedResult?: SearchResult;
  onResultSelect?: (result: SearchResult) => void;
  onMemorySelect?: (memory: SearchResult['memory']) => void;
  enableProvenance?: boolean;
  enableExport?: boolean;
  onShowProvenance?: (memoryId: string) => void;
  onExportResult?: (result: SearchResult) => void;
  containerHeight?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  searchQuery?: string;
  className?: string;
}

const MEMORY_TIER_COLORS = {
  active: '#4caf50',
  archived: '#ff9800',
  cold: '#2196f3',
  unknown: '#9e9e9e'
};

const MATCH_TYPE_COLORS = {
  content: '#2196f3',
  metadata: '#4caf50',
  semantic: '#9c27b0',
  hybrid: '#ff5722'
};

const SearchResultItem: React.FC<{
  result: SearchResult;
  isSelected: boolean;
  onSelect: (result: SearchResult) => void;
  onMemorySelect?: (memory: SearchResult['memory']) => void;
  enableProvenance?: boolean;
  enableExport?: boolean;
  onShowProvenance?: (memoryId: string) => void;
  onExportResult?: (result: SearchResult) => void;
  searchQuery?: string;
  index: number;
}> = ({
  result,
  isSelected,
  onSelect,
  onMemorySelect,
  enableProvenance,
  enableExport,
  onShowProvenance,
  onExportResult,
  searchQuery,
  index
}) => {
  const theme = useTheme();

  const handleSelect = useCallback(() => {
    onSelect(result);
    onMemorySelect?.(result.memory);
  }, [onSelect, onMemorySelect, result]);

  const handleShowProvenance = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShowProvenance?.(result.memory.id);
  }, [onShowProvenance, result.memory.id]);

  const handleExport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onExportResult?.(result);
  }, [onExportResult, result]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const highlightText = (text: string, query?: string) => {
    if (!query || query.length === 0) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const getContentPreview = (content: string | Record<string, unknown>, maxLength = 200) => {
    let text = typeof content === 'string' ? content : JSON.stringify(content);
    
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return highlightText(text, searchQuery);
  };

  const contentLength = typeof result.memory.content === 'string' 
    ? result.memory.content.length 
    : JSON.stringify(result.memory.content).length;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.1)
          : 'background.paper',
        borderLeft: isSelected
          ? `4px solid ${theme.palette.primary.main}`
          : `4px solid transparent`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          transform: 'translateX(4px)',
        },
      }}
      onClick={handleSelect}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={result.matchType.toUpperCase()}
            size="small"
            sx={{
              backgroundColor: alpha(MATCH_TYPE_COLORS[result.matchType], 0.1),
              color: MATCH_TYPE_COLORS[result.matchType],
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22
            }}
          />
          
          <Chip
            label={result.memory.memoryTier?.toUpperCase() || 'UNKNOWN'}
            size="small"
            sx={{
              backgroundColor: alpha(MEMORY_TIER_COLORS[result.memory.memoryTier as keyof typeof MEMORY_TIER_COLORS] || MEMORY_TIER_COLORS.unknown, 0.1),
              color: MEMORY_TIER_COLORS[result.memory.memoryTier as keyof typeof MEMORY_TIER_COLORS] || MEMORY_TIER_COLORS.unknown,
              fontSize: '0.7rem',
              height: 22
            }}
          />
          
          <Typography variant="caption" color="text.secondary">
            {(result.relevanceScore * 100).toFixed(1)}% relevance
          </Typography>
          
          {result.vectorSimilarity && (
            <Typography variant="caption" color="text.secondary">
              {(result.vectorSimilarity * 100).toFixed(1)}% similar
            </Typography>
          )}
          
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(contentLength)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {enableProvenance && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<TimelineIcon />}
              onClick={handleShowProvenance}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Trace
            </Button>
          )}
          
          {enableExport && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Export
            </Button>
          )}
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {result.memory.type}
        </Typography>
        
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            lineHeight: 1.5,
            '& mark': {
              backgroundColor: alpha(theme.palette.warning.main, 0.3),
              color: theme.palette.warning.contrastText,
              padding: '0 2px',
              borderRadius: '2px'
            }
          }}
          dangerouslySetInnerHTML={{
            __html: getContentPreview(result.memory.content)
          }}
        />
      </Box>
      
      {result.matches && result.matches.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Matches:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {result.matches.slice(0, 3).map((match, idx) => (
              <Chip
                key={idx}
                label={`${match.field}: ${match.value}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            ))}
            {result.matches.length > 3 && (
              <Chip
                label={`+${result.matches.length - 3} more`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </Box>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Created: {formatDate(result.memory.createdAt)}
          </Typography>
          
          {result.memory.lastAccessed && (
            <Typography variant="caption" color="text.secondary">
              Last accessed: {formatDate(result.memory.lastAccessed)}
            </Typography>
          )}
          
          {result.memory.importance !== undefined && (
            <Typography variant="caption" color="text.secondary">
              Importance: {result.memory.importance}/10
            </Typography>
          )}
        </Box>
        
        {result.memory.tags && result.memory.tags.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Tags:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {result.memory.tags.slice(0, 2).join(', ')}
              {result.memory.tags.length > 2 && ` +${result.memory.tags.length - 2}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export const VirtualizedSearchResults: React.FC<VirtualizedSearchResultsProps> = ({
  results,
  selectedResult,
  onResultSelect,
  onMemorySelect,
  enableProvenance = false,
  enableExport = false,
  onShowProvenance,
  onExportResult,
  containerHeight = 600,
  isLoading = false,
  emptyMessage = 'No search results found',
  searchQuery,
  className
}) => {
  const renderItem = useCallback((result: SearchResult, index: number) => {
    const isSelected = selectedResult?.memory.id === result.memory.id;
    
    return (
      <SearchResultItem
        result={result}
        isSelected={isSelected}
        onSelect={onResultSelect || (() => {})}
        onMemorySelect={onMemorySelect}
        enableProvenance={enableProvenance}
        enableExport={enableExport}
        onShowProvenance={onShowProvenance}
        onExportResult={onExportResult}
        searchQuery={searchQuery}
        index={index}
      />
    );
  }, [
    selectedResult,
    onResultSelect,
    onMemorySelect,
    enableProvenance,
    enableExport,
    onShowProvenance,
    onExportResult,
    searchQuery
  ]);

  const keyExtractor = useCallback((result: SearchResult, index: number) => {
    return `search-result-${result.memory.id}-${index}`;
  }, []);

  return (
    <AsyncErrorBoundary context="VirtualizedSearchResults">
      <VirtualizedList
        items={results}
        renderItem={renderItem}
        itemHeight={180}
        containerHeight={containerHeight}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        className={className}
        keyExtractor={keyExtractor}
        overscan={2}
        variableHeight={true}
        estimatedItemSize={180}
      />
    </AsyncErrorBoundary>
  );
};

export default VirtualizedSearchResults;