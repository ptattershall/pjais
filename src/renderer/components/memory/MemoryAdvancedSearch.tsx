import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MemoryEntity, MemoryTier } from '@shared/types/memory';
import { 
  SearchResult, 
  SearchFilters, 
  MemoryAdvancedSearchProps,
  SearchFilterValue
} from './types';
import '../../styles/memory-advanced-search.css';
import { useMemoryFiltering } from './hooks/useMemoryFiltering';
import { MemoryLegend } from './ui/MemoryLegend';
import { FixedSizeList as List } from 'react-window';

interface ProvenanceNode {
  memoryId: string;
  timestamp: Date;
  action: 'created' | 'modified' | 'accessed' | 'linked' | 'tagged';
  userId?: string;
  relationshipId?: string;
}

export const MemoryAdvancedSearch: React.FC<MemoryAdvancedSearchProps> = ({
  userId: _userId,
  memories,
  onMemorySelect,
  onResultsChange,
  enableSemanticSearch = true,
  enableProvenance = true,
  enableExport = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic' | 'hybrid'>('hybrid');
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showProvenance, setShowProvenance] = useState(false);
  const [provenance, setProvenance] = useState<ProvenanceNode[]>([]);

  // Available memory types and tags for filters
  const availableTypes = useMemo(() => {
    const types = new Set(memories.map(m => m.type));
    return Array.from(types).sort();
  }, [memories]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    memories.forEach(m => {
      if (m.tags) {
        m.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [memories]);

  // Use shared filtering hook for filtered memories
  const filteredMemories = useMemoryFiltering(memories, filters);

  // Perform advanced search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() && Object.keys(filters).length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    // Text-based search implementation
    const performTextSearch = (query: string, memories: MemoryEntity[]): SearchResult[] => {
      if (!query.trim()) return [];

      const lowercaseQuery = query.toLowerCase();
      const results: SearchResult[] = [];

      memories.forEach(memory => {
        const content = typeof memory.content === 'string' 
          ? memory.content 
          : JSON.stringify(memory.content);
        
        const lowercaseContent = content.toLowerCase();
        
        // Exact match
        if (lowercaseContent.includes(lowercaseQuery)) {
          const relevanceScore = calculateTextRelevance(query, content);
          const highlightedContent = highlightText(content, query);
          
          results.push({
            memory,
            relevanceScore,
            matchType: 'exact',
            highlightedContent
          });
        }

        // Tag match
        if (memory.tags) {
          const matchingTags = memory.tags.filter(tag => 
            tag.toLowerCase().includes(lowercaseQuery)
          );
          
          if (matchingTags.length > 0) {
            results.push({
              memory,
              relevanceScore: 0.8,
              matchType: 'tag',
              highlightedContent: content
            });
          }
        }
      });

      return results;
    };

    // Semantic search implementation (simulated)
    const performSemanticSearch = async (query: string, memories: MemoryEntity[]): Promise<SearchResult[]> => {
      if (!query.trim()) return [];

      // In a real implementation, this would use the embedding service
      // For now, we'll simulate semantic similarity based on keyword overlap
      const queryWords = query.toLowerCase().split(/\s+/);
      const results: SearchResult[] = [];

      memories.forEach(memory => {
        const content = typeof memory.content === 'string' 
          ? memory.content 
          : JSON.stringify(memory.content);
        
        const contentWords = content.toLowerCase().split(/\s+/);
        const similarity = calculateSemanticSimilarity(queryWords, contentWords);
        
        if (similarity > 0.3) { // Threshold for semantic relevance
          results.push({
            memory,
            relevanceScore: similarity,
            matchType: 'semantic',
            highlightedContent: content,
            vectorSimilarity: similarity
          });
        }
      });

      return results;
    };
    
    try {
      let searchResults: SearchResult[] = [];

      // Text-based search
      if (searchMode === 'text' || searchMode === 'hybrid') {
        const textResults = performTextSearch(searchQuery, filteredMemories);
        searchResults = [...searchResults, ...textResults];
      }

      // Semantic search (simulated for now)
      if (enableSemanticSearch && (searchMode === 'semantic' || searchMode === 'hybrid')) {
        const semanticResults = await performSemanticSearch(searchQuery, filteredMemories);
        searchResults = [...searchResults, ...semanticResults];
      }

      // Remove duplicates and sort
      const uniqueResults = deduplicateResults(searchResults);
      const sortedResults = sortResults(uniqueResults, filters.sortBy || 'relevance', filters.sortOrder || 'desc');

      setResults(sortedResults);
      onResultsChange?.(sortedResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchMode, filters, filteredMemories, enableSemanticSearch, onResultsChange]);

  // Calculate text relevance score
  const calculateTextRelevance = (query: string, content: string): number => {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    let score = 0;
    
    queryWords.forEach(word => {
      if (contentWords.includes(word)) {
        score += 1.0;
      } else {
        // Partial matches
        contentWords.forEach(contentWord => {
          if (contentWord.includes(word) || word.includes(contentWord)) {
            score += 0.5;
          }
        });
      }
    });

    // Bonus for exact phrase match
    if (content.toLowerCase().includes(query.toLowerCase())) {
      score += queryWords.length * 0.5;
    }

    // Normalize by content length
    return Math.min(score / Math.max(queryWords.length, 1), 1.0);
  };

  // Calculate semantic similarity (simplified)
  const calculateSemanticSimilarity = (queryWords: string[], contentWords: string[]): number => {
    const intersection = queryWords.filter(word => contentWords.includes(word));
    const union = new Set([...queryWords, ...contentWords]);
    
    return intersection.length / union.size;
  };

  // Highlight matching text
  const highlightText = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // Remove duplicate results
  const deduplicateResults = (results: SearchResult[]): SearchResult[] => {
    const seen = new Set<string>();
    return results.filter(result => {
      const memoryId = result.memory.id;
      if (!memoryId || seen.has(memoryId)) {
        return false;
      }
      seen.add(memoryId);
      return true;
    });
  };

  // Sort results
  const sortResults = (results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] => {
    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date': {
          const dateA = a.memory.createdAt ? new Date(a.memory.createdAt).getTime() : 0;
          const dateB = b.memory.createdAt ? new Date(b.memory.createdAt).getTime() : 0;
          comparison = dateB - dateA;
          break;
        }
        case 'importance':
          comparison = (b.memory.importance || 0) - (a.memory.importance || 0);
          break;
        case 'similarity':
          comparison = (b.vectorSimilarity || 0) - (a.vectorSimilarity || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  };

  // Load memory provenance
  const loadProvenance = useCallback(async (memoryId: string) => {
    try {
      // Simulate provenance data - in real implementation, this would call an API
      const mockProvenance: ProvenanceNode[] = [
        {
          memoryId,
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          action: 'created'
        },
        {
          memoryId,
          timestamp: new Date(Date.now() - 43200000), // 12 hours ago
          action: 'accessed'
        },
        {
          memoryId,
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          action: 'modified'
        }
      ];

      setProvenance(mockProvenance);
    } catch (error) {
      console.error('Error loading provenance:', error);
      setProvenance([]);
    }
  }, []);

  // Export search results
  const exportResults = useCallback((format: 'json' | 'csv' | 'txt') => {
    if (results.length === 0) return;

    let content = '';
    let filename = `memory-search-results-${new Date().getTime()}`;

    switch (format) {
      case 'json':
        content = JSON.stringify(results.map(r => ({
          id: r.memory.id,
          content: r.memory.content,
          type: r.memory.type,
          importance: r.memory.importance,
          tier: r.memory.memoryTier,
          relevanceScore: r.relevanceScore,
          matchType: r.matchType,
          createdAt: r.memory.createdAt
        })), null, 2);
        filename += '.json';
        break;
      
      case 'csv': {
        const headers = 'ID,Content,Type,Importance,Tier,Relevance Score,Match Type,Created At\n';
        const rows = results.map(r => {
          const content = typeof r.memory.content === 'string' 
            ? r.memory.content.replace(/"/g, '""') 
            : JSON.stringify(r.memory.content).replace(/"/g, '""');
          return `"${r.memory.id}","${content}","${r.memory.type}","${r.memory.importance || 0}","${r.memory.memoryTier || 'cold'}","${r.relevanceScore}","${r.matchType}","${r.memory.createdAt || ''}"`;
        }).join('\n');
        content = headers + rows;
        filename += '.csv';
        break;
      }
      
      case 'txt':
        content = results.map(r => {
          const content = typeof r.memory.content === 'string' 
            ? r.memory.content 
            : JSON.stringify(r.memory.content);
          return `Memory ID: ${r.memory.id}\nContent: ${content}\nType: ${r.memory.type}\nImportance: ${r.memory.importance || 0}\nTier: ${r.memory.memoryTier || 'cold'}\nRelevance: ${r.relevanceScore.toFixed(3)}\nMatch Type: ${r.matchType}\nCreated: ${r.memory.createdAt || 'Unknown'}\n\n---\n\n`;
        }).join('');
        filename += '.txt';
        break;
    }

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results]);

  // Update filter
  const updateFilter = useCallback((key: keyof SearchFilters, value: SearchFilterValue) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [performSearch]);

  // Virtualized row renderer
  const ROW_HEIGHT = 72;
  const MemoryResultRow: React.FC<{ index: number; style: React.CSSProperties; data: SearchResult[] }> = ({ index, style, data }) => {
    const result = data[index];
    return (
      <div
        key={`${result.memory.id}-${index}`}
        style={style}
        className={`result-item ${selectedResult?.memory.id === result.memory.id ? 'selected' : ''}`}
        tabIndex={0}
        aria-label={`Memory ${result.memory.id}`}
        onClick={() => {
          setSelectedResult(result);
          onMemorySelect?.(result.memory);
        }}
      >
        <div className="result-header">
          <div className="result-meta">
            <span className={`match-type ${result.matchType}`}>{result.matchType.toUpperCase()}</span>
            <span className={`memory-tier ${result.memory.memoryTier || 'cold'}`}>{(result.memory.memoryTier || 'cold').toUpperCase()}</span>
            <span className="relevance-score">{(result.relevanceScore * 100).toFixed(1)}% match</span>
            {result.vectorSimilarity && (
              <span className="similarity-score">{(result.vectorSimilarity * 100).toFixed(1)}% similar</span>
            )}
          </div>
          <div className="result-actions">
            {enableProvenance && (
              <button
                className="provenance-button"
                onClick={e => {
                  e.stopPropagation();
                  if (result.memory.id) {
                    setShowProvenance(true);
                    loadProvenance(result.memory.id);
                  }
                }}
              >
                History
              </button>
            )}
          </div>
        </div>
        <div className="result-content">
          <div className="memory-info">
            <span className="memory-type">{result.memory.type}</span>
            <span className="memory-importance">Importance: {result.memory.importance || 0}</span>
            <span className="memory-date">{result.memory.createdAt ? new Date(result.memory.createdAt).toLocaleDateString() : 'Unknown date'}</span>
          </div>
          <div className="highlighted-content" dangerouslySetInnerHTML={{ __html: result.highlightedContent }} />
          {result.memory.tags && result.memory.tags.length > 0 && (
            <div className="memory-tags">
              {result.memory.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="memory-advanced-search">
      <div className="search-header">
        <h2>Advanced Memory Search</h2>
        <p>Search through your memories using text matching, semantic similarity, and advanced filters</p>
        <div className="mt-2 mb-2">
          <MemoryLegend />
        </div>
      </div>

      <div className="search-controls">
        <div className="search-input-section">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Enter search query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-mode-selector">
              <label>Search Mode:</label>
              <select 
                value={searchMode} 
                onChange={(e) => setSearchMode(e.target.value as typeof searchMode)}
              >
                <option value="text">Text Only</option>
                {enableSemanticSearch && <option value="semantic">Semantic Only</option>}
                {enableSemanticSearch && <option value="hybrid">Hybrid (Text + Semantic)</option>}
              </select>
            </div>
          </div>
        </div>

        <div className="advanced-filters">
          <div className="filter-group">
            <label>Date Range:</label>
            <input
              type="date"
              value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => updateFilter('dateRange', {
                ...filters.dateRange,
                start: e.target.value ? new Date(e.target.value) : undefined
              })}
            />
            <span>to</span>
            <input
              type="date"
              value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => updateFilter('dateRange', {
                ...filters.dateRange,
                end: e.target.value ? new Date(e.target.value) : undefined
              })}
            />
          </div>

          <div className="filter-group">
            <label>Importance Range:</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Min"
              value={filters.importanceRange?.min || ''}
              onChange={(e) => updateFilter('importanceRange', {
                ...filters.importanceRange,
                min: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Max"
              value={filters.importanceRange?.max || ''}
              onChange={(e) => updateFilter('importanceRange', {
                ...filters.importanceRange,
                max: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
          </div>

          <div className="filter-group">
            <label>Memory Tiers:</label>
            <div className="checkbox-group">
              {(['hot', 'warm', 'cold'] as MemoryTier[]).map(tier => (
                <label key={tier} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.tiers?.includes(tier) || false}
                    onChange={(e) => {
                      const currentTiers = filters.tiers || [];
                      const newTiers = e.target.checked
                        ? [...currentTiers, tier]
                        : currentTiers.filter(t => t !== tier);
                      updateFilter('tiers', newTiers.length > 0 ? newTiers : undefined);
                    }}
                  />
                  <span className={`tier-indicator ${tier}`}></span>
                  {tier.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Memory Types:</label>
            <div className="checkbox-group">
              {availableTypes.map(type => (
                <label key={type} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.types?.includes(type) || false}
                    onChange={(e) => {
                      const currentTypes = filters.types || [];
                      const newTypes = e.target.checked
                        ? [...currentTypes, type]
                        : currentTypes.filter(t => t !== type);
                      updateFilter('types', newTypes.length > 0 ? newTypes : undefined);
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Tags:</label>
            <div className="checkbox-group">
              {availableTags.map(tag => (
                <label key={tag} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.tags?.includes(tag) || false}
                    onChange={(e) => {
                      const currentTags = filters.tags || [];
                      const newTags = e.target.checked
                        ? [...currentTags, tag]
                        : currentTags.filter(t => t !== tag);
                      updateFilter('tags', newTags.length > 0 ? newTags : undefined);
                    }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select 
              value={filters.sortBy || 'relevance'} 
              onChange={(e) => updateFilter('sortBy', e.target.value as SearchFilterValue)}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="importance">Importance</option>
              {enableSemanticSearch && <option value="similarity">Similarity</option>}
            </select>
            <select 
              value={filters.sortOrder || 'desc'} 
              onChange={(e) => updateFilter('sortOrder', e.target.value as SearchFilterValue)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {enableExport && results.length > 0 && (
          <div className="export-controls">
            <label>Export Results:</label>
            <button onClick={() => exportResults('json')}>JSON</button>
            <button onClick={() => exportResults('csv')}>CSV</button>
            <button onClick={() => exportResults('txt')}>Text</button>
          </div>
        )}
      </div>

      <div className="search-results">
        <div className="results-header">
          <h3>
            {isSearching ? 'Searching...' : `${results.length} Results Found`}
          </h3>
        </div>

        <div className="results-list">
          {results.length > 0 ? (
            <List
              height={Math.min(600, results.length * ROW_HEIGHT)}
              itemCount={results.length}
              itemSize={ROW_HEIGHT}
              width="100%"
              itemData={results}
            >
              {({ index, style, data }: { index: number; style: React.CSSProperties; data: SearchResult[] }) => (
                <MemoryResultRow index={index} style={style} data={data} />
              )}
            </List>
          ) : (
            !isSearching && searchQuery && (
              <div className="no-results">
                <p>No memories found matching your search criteria.</p>
                <p>Try adjusting your search query or filters.</p>
              </div>
            )
          )}
        </div>
      </div>

      {showProvenance && (
        <div className="provenance-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Memory Provenance</h3>
              <button onClick={() => setShowProvenance(false)}>×</button>
            </div>
            <div className="provenance-timeline">
              {provenance.map((node, index) => (
                <div key={index} className="provenance-item">
                  <div className="provenance-timestamp">
                    {node.timestamp.toLocaleString()}
                  </div>
                  <div className={`provenance-action ${node.action}`}>
                    {node.action.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 