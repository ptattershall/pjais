import React, { useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Avatar,
  useTheme,
  alpha,
  LinearProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Memory as MemoryIcon,
  Schedule as ScheduleIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { PersonaData } from '@shared/types/persona';
import { VirtualizedList } from '../common/VirtualizedList';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';

interface PersonaStats {
  memoryCount: number;
  lastInteraction: string;
  averageImportance: number;
  totalInteractions: number;
}

interface VirtualizedPersonaListProps {
  personas: PersonaData[];
  onPersonaSelect?: (persona: PersonaData) => void;
  onPersonaEdit?: (persona: PersonaData) => void;
  onPersonaDelete?: (personaId: string) => void;
  onPersonaFavorite?: (personaId: string, favorite: boolean) => void;
  selectedPersonaId?: string;
  containerHeight?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  searchQuery?: string;
  showActions?: boolean;
  showDetails?: boolean;
  showStats?: boolean;
  personaStats?: Map<string, PersonaStats>;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memoryCount';
  sortOrder?: 'asc' | 'desc';
  onEndReached?: () => void;
  className?: string;
  itemHeight?: number;
}

interface PersonaItemProps {
  persona: PersonaData;
  isSelected: boolean;
  onSelect?: (persona: PersonaData) => void;
  onEdit?: (persona: PersonaData) => void;
  onDelete?: (personaId: string) => void;
  onFavorite?: (personaId: string, favorite: boolean) => void;
  showActions?: boolean;
  showDetails?: boolean;
  showStats?: boolean;
  stats?: PersonaStats;
  searchQuery?: string;
  index: number;
}

const PersonaItem: React.FC<PersonaItemProps> = ({
  persona,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onFavorite,
  showActions = true,
  showDetails = true,
  showStats = true,
  stats,
  searchQuery,
  index
}) => {
  const theme = useTheme();
  const isFavorite = persona.metadata?.favorite || false;

  const handleSelect = useCallback(() => {
    onSelect?.(persona);
  }, [onSelect, persona]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(persona);
  }, [onEdit, persona]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (persona.id) {
      onDelete?.(persona.id);
    }
  }, [onDelete, persona.id]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (persona.id) {
      onFavorite?.(persona.id, !isFavorite);
    }
  }, [onFavorite, persona.id, isFavorite]);

  const getPersonalityColor = (trait: string) => {
    const colors = {
      'creative': theme.palette.secondary.main,
      'analytical': theme.palette.primary.main,
      'empathetic': theme.palette.success.main,
      'adventurous': theme.palette.warning.main,
      'calm': theme.palette.info.main,
      'energetic': theme.palette.error.main,
    };
    return colors[trait as keyof typeof colors] || theme.palette.grey[500];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightText = (text: string, query?: string) => {
    if (!query || query.length === 0) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const getActivityLevel = (stats?: PersonaStats) => {
    if (!stats) return 'inactive';
    
    const lastInteraction = new Date(stats.lastInteraction);
    const now = new Date();
    const daysSinceLastInteraction = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastInteraction <= 1) return 'active';
    if (daysSinceLastInteraction <= 7) return 'recent';
    if (daysSinceLastInteraction <= 30) return 'moderate';
    return 'inactive';
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'active': return theme.palette.success.main;
      case 'recent': return theme.palette.info.main;
      case 'moderate': return theme.palette.warning.main;
      case 'inactive': return theme.palette.grey[500];
      default: return theme.palette.grey[500];
    }
  };

  const activityLevel = getActivityLevel(stats);
  const mainTrait = persona.personality?.traits?.[0] || 'creative';

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
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                backgroundColor: alpha(getPersonalityColor(mainTrait), 0.1),
                color: getPersonalityColor(mainTrait),
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {getInitials(persona.name)}
            </Avatar>
            <CircleIcon
              sx={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                fontSize: 16,
                color: getActivityColor(activityLevel),
                backgroundColor: 'background.paper',
                borderRadius: '50%'
              }}
            />
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  '& mark': {
                    backgroundColor: alpha(theme.palette.warning.main, 0.3),
                    color: theme.palette.warning.contrastText,
                    padding: '0 2px',
                    borderRadius: '2px'
                  }
                }}
                dangerouslySetInnerHTML={{
                  __html: highlightText(persona.name, searchQuery)
                }}
              />
              
              <Tooltip title={`Activity: ${activityLevel}`}>
                <Chip
                  label={activityLevel}
                  size="small"
                  sx={{
                    backgroundColor: alpha(getActivityColor(activityLevel), 0.1),
                    color: getActivityColor(activityLevel),
                    fontSize: '0.7rem',
                    height: 20,
                    textTransform: 'capitalize'
                  }}
                />
              </Tooltip>
            </Box>
            
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3
              }}
            >
              {persona.description}
            </Typography>
            
            {showDetails && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PsychologyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {persona.personality?.temperament || 'Balanced'}
                </Typography>
                
                {persona.personality?.traits && persona.personality.traits.length > 0 && (
                  <>
                    <Box sx={{ mx: 0.5, fontSize: 12, color: 'text.secondary' }}>•</Box>
                    <Typography variant="caption" color="text.secondary">
                      {persona.personality.traits.slice(0, 2).join(', ')}
                      {persona.personality.traits.length > 2 && ` +${persona.personality.traits.length - 2}`}
                    </Typography>
                  </>
                )}
              </Box>
            )}
            
            {showStats && stats && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MemoryIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {stats.memoryCount} memories
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(stats.lastInteraction)}
                  </Typography>
                </Box>
                
                {stats.averageImportance > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <StarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {stats.averageImportance.toFixed(1)} avg
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {showStats && stats && stats.totalInteractions > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Engagement Level
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (stats.totalInteractions / 100) * 100)}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.primary.main
                    }
                  }}
                />
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
              
              <Tooltip title="Edit persona">
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="More options">
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const VirtualizedPersonaList: React.FC<VirtualizedPersonaListProps> = ({
  personas,
  onPersonaSelect,
  onPersonaEdit,
  onPersonaDelete,
  onPersonaFavorite,
  selectedPersonaId,
  containerHeight = 400,
  isLoading = false,
  emptyMessage = 'No personas found',
  searchQuery,
  showActions = true,
  showDetails = true,
  showStats = true,
  personaStats,
  sortBy = 'name',
  sortOrder = 'asc',
  onEndReached,
  className,
  itemHeight = 140
}) => {
  // Sort personas
  const sortedPersonas = useMemo(() => {
    const sorted = [...personas];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || 0).getTime();
          bValue = new Date(b.updatedAt || 0).getTime();
          break;
        case 'memoryCount':
          aValue = personaStats?.get(a.id || '')?.memoryCount || 0;
          bValue = personaStats?.get(b.id || '')?.memoryCount || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [personas, sortBy, sortOrder, personaStats]);

  const renderItem = useCallback((persona: PersonaData, index: number) => {
    const isSelected = persona.id === selectedPersonaId;
    const stats = persona.id ? personaStats?.get(persona.id) : undefined;
    
    return (
      <Box sx={{ width: '100%', height: '100%', p: 1 }}>
        <PersonaItem
          persona={persona}
          isSelected={isSelected}
          onSelect={onPersonaSelect}
          onEdit={onPersonaEdit}
          onDelete={onPersonaDelete}
          onFavorite={onPersonaFavorite}
          showActions={showActions}
          showDetails={showDetails}
          showStats={showStats}
          stats={stats}
          searchQuery={searchQuery}
          index={index}
        />
      </Box>
    );
  }, [
    selectedPersonaId,
    personaStats,
    onPersonaSelect,
    onPersonaEdit,
    onPersonaDelete,
    onPersonaFavorite,
    showActions,
    showDetails,
    showStats,
    searchQuery
  ]);

  const keyExtractor = useCallback((persona: PersonaData, index: number) => {
    return `persona-${persona.id || index}`;
  }, []);

  return (
    <AsyncErrorBoundary context="VirtualizedPersonaList">
      <VirtualizedList
        items={sortedPersonas}
        renderItem={renderItem}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onEndReached={onEndReached}
        className={className}
        keyExtractor={keyExtractor}
        overscan={2}
      />
    </AsyncErrorBoundary>
  );
};

export default VirtualizedPersonaList;