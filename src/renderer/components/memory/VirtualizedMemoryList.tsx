import React, { useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
  Memory as MemoryIcon,
  Schedule as ScheduleIcon,
  Label as LabelIcon
} from '@mui/icons-material';
import { MemoryEntity } from '@shared/types/memory';
import { VirtualizedList } from '../common/VirtualizedList';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';

interface VirtualizedMemoryListProps {
  memories: MemoryEntity[];
  onMemorySelect?: (memory: MemoryEntity) => void;
  onMemoryEdit?: (memory: MemoryEntity) => void;
  onMemoryDelete?: (memoryId: string) => void;
  onMemoryFavorite?: (memoryId: string, favorite: boolean) => void;
  selectedMemoryId?: string;
  containerHeight?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  searchQuery?: string;
  showActions?: boolean;
  showDetails?: boolean;
  groupByTier?: boolean;
  sortBy?: 'createdAt' | 'lastAccessed' | 'importance' | 'type';
  sortOrder?: 'asc' | 'desc';
  onEndReached?: () => void;
  className?: string;
}

interface MemoryItemProps {
  memory: MemoryEntity;
  isSelected: boolean;
  onSelect?: (memory: MemoryEntity) => void;
  onEdit?: (memory: MemoryEntity) => void;
  onDelete?: (memoryId: string) => void;
  onFavorite?: (memoryId: string, favorite: boolean) => void;
  showActions?: boolean;
  showDetails?: boolean;
  searchQuery?: string;
  index: number;
}

const MemoryItem: React.FC<MemoryItemProps> = ({
  memory,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onFavorite,
  showActions = true,
  showDetails = true,
  searchQuery,
  index
}) => {
  const theme = useTheme();
  const isFavorite = memory.metadata?.favorite || false;

  const handleSelect = useCallback(() => {
    onSelect?.(memory);
  }, [onSelect, memory]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(memory);
  }, [onEdit, memory]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (memory.id) {
      onDelete?.(memory.id);
    }
  }, [onDelete, memory.id]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (memory.id) {
      onFavorite?.(memory.id, !isFavorite);
    }
  }, [onFavorite, memory.id, isFavorite]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'active': return theme.palette.primary.main;
      case 'archived': return theme.palette.warning.main;
      case 'cold': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return theme.palette.error.main;
    if (importance >= 6) return theme.palette.warning.main;
    if (importance >= 4) return theme.palette.success.main;
    return theme.palette.grey[500];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatContent = (content: string) => {
    if (typeof content !== 'string') return 'Complex content';
    
    let formatted = content;
    
    // Highlight search query if provided
    if (searchQuery && searchQuery.length > 0) {
      const regex = new RegExp(`(${searchQuery})`, 'gi');
      formatted = formatted.replace(regex, '<mark>$1</mark>');
    }
    
    // Truncate long content
    if (formatted.length > 150) {
      formatted = formatted.substring(0, 150) + '...';
    }
    
    return formatted;
  };

  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        backgroundColor: isSelected
          ? alpha(theme.palette.primary.main, 0.1)
          : 'background.paper',
        borderLeft: isSelected
          ? `4px solid ${theme.palette.primary.main}`
          : `4px solid transparent`,
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
        },
        position: 'relative'
      }}
      onClick={handleSelect}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <MemoryIcon sx={{ color: getTierColor(memory.memoryTier), fontSize: 20 }} />
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {memory.type}
              </Typography>
              <Chip
                label={memory.memoryTier}
                size="small"
                sx={{
                  backgroundColor: alpha(getTierColor(memory.memoryTier), 0.1),
                  color: getTierColor(memory.memoryTier),
                  fontSize: '0.7rem',
                  height: 20
                }}
              />
              {memory.importance !== undefined && (
                <Tooltip title={`Importance: ${memory.importance}/10`}>
                  <Chip
                    label={memory.importance}
                    size="small"
                    sx={{
                      backgroundColor: alpha(getImportanceColor(memory.importance), 0.1),
                      color: getImportanceColor(memory.importance),
                      fontSize: '0.7rem',
                      height: 20,
                      minWidth: 28
                    }}
                  />
                </Tooltip>
              )}
            </Box>
            
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                lineHeight: 1.4,
                mb: 1,
                '& mark': {
                  backgroundColor: alpha(theme.palette.warning.main, 0.3),
                  color: theme.palette.warning.contrastText,
                  padding: '0 2px',
                  borderRadius: '2px'
                }
              }}
              dangerouslySetInnerHTML={{
                __html: formatContent(typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content))
              }}
            />
            
            {showDetails && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                {memory.createdAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(memory.createdAt)}
                    </Typography>
                  </Box>
                )}
                
                {memory.tags && memory.tags.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LabelIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {memory.tags.slice(0, 2).join(', ')}
                      {memory.tags.length > 2 && ` +${memory.tags.length - 2}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          
          {showActions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}>
              <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <IconButton
                  size="small"
                  onClick={handleFavorite}
                  sx={{ color: isFavorite ? theme.palette.warning.main : 'text.secondary' }}
                >
                  {isFavorite ? <StarIcon fontSize="small" /> : <StarOutlineIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              
              <Tooltip title="View details">
                <IconButton size="small" onClick={handleSelect}>
                  <ViewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Edit memory">
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Delete memory">
                <IconButton size="small" onClick={handleDelete} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const VirtualizedMemoryList: React.FC<VirtualizedMemoryListProps> = ({
  memories,
  onMemorySelect,
  onMemoryEdit,
  onMemoryDelete,
  onMemoryFavorite,
  selectedMemoryId,
  containerHeight = 400,
  isLoading = false,
  emptyMessage = 'No memories found',
  searchQuery,
  showActions = true,
  showDetails = true,
  groupByTier = false,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onEndReached,
  className
}) => {
  // Sort and group memories
  const processedMemories = useMemo(() => {
    let sorted = [...memories];
    
    // Sort memories
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'lastAccessed':
          aValue = new Date(a.lastAccessed || 0).getTime();
          bValue = new Date(b.lastAccessed || 0).getTime();
          break;
        case 'importance':
          aValue = a.importance || 0;
          bValue = b.importance || 0;
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        default:
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Group by tier if requested
    if (groupByTier) {
      const grouped = sorted.reduce((acc, memory) => {
        const tier = memory.memoryTier || 'unknown';
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(memory);
        return acc;
      }, {} as Record<string, MemoryEntity[]>);
      
      // Flatten back to array with tier headers
      const flattened: (MemoryEntity | { type: 'tierHeader', tier: string })[] = [];
      Object.entries(grouped).forEach(([tier, mems]) => {
        flattened.push({ type: 'tierHeader', tier });
        flattened.push(...mems);
      });
      
      return flattened;
    }
    
    return sorted;
  }, [memories, sortBy, sortOrder, groupByTier]);

  const renderItem = useCallback((item: MemoryEntity | { type: 'tierHeader', tier: string }, index: number) => {
    // Handle tier header
    if ('type' in item && item.type === 'tierHeader') {
      return (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            backgroundColor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
            {item.tier} Tier
          </Typography>
        </Box>
      );
    }
    
    // Handle memory item
    const memory = item as MemoryEntity;
    const isSelected = memory.id === selectedMemoryId;
    
    return (
      <Box sx={{ width: '100%', height: '100%', p: 1 }}>
        <MemoryItem
          memory={memory}
          isSelected={isSelected}
          onSelect={onMemorySelect}
          onEdit={onMemoryEdit}
          onDelete={onMemoryDelete}
          onFavorite={onMemoryFavorite}
          showActions={showActions}
          showDetails={showDetails}
          searchQuery={searchQuery}
          index={index}
        />
      </Box>
    );
  }, [
    selectedMemoryId,
    onMemorySelect,
    onMemoryEdit,
    onMemoryDelete,
    onMemoryFavorite,
    showActions,
    showDetails,
    searchQuery
  ]);

  const getItemHeight = useCallback((index: number) => {
    const item = processedMemories[index];
    if ('type' in item && item.type === 'tierHeader') {
      return 48; // Height for tier header
    }
    return showDetails ? 120 : 80; // Height for memory item
  }, [processedMemories, showDetails]);

  const keyExtractor = useCallback((item: MemoryEntity | { type: 'tierHeader', tier: string }, index: number) => {
    if ('type' in item && item.type === 'tierHeader') {
      return `tier-${item.tier}`;
    }
    return `memory-${(item as MemoryEntity).id || index}`;
  }, []);

  return (
    <AsyncErrorBoundary context="VirtualizedMemoryList">
      <VirtualizedList
        items={processedMemories}
        renderItem={renderItem}
        itemHeight={showDetails ? 120 : 80}
        containerHeight={containerHeight}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onEndReached={onEndReached}
        className={className}
        keyExtractor={keyExtractor}
        variableHeight={groupByTier}
        getItemSize={groupByTier ? getItemHeight : undefined}
        overscan={3}
      />
    </AsyncErrorBoundary>
  );
};

export default VirtualizedMemoryList;