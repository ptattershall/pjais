import { MemoryEntity, MemoryTier } from '@shared/types/memory';

// =============================================================================
// MEMORY ANALYSIS CALCULATIONS
// =============================================================================

export interface MemoryStatistics {
  totalCount: number;
  totalImportance: number;
  averageImportance: number;
  tierDistribution: Record<MemoryTier, number>;
  tierPercentages: Record<MemoryTier, number>;
  storageSize: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
    span: number; // days
  };
}

export const calculateMemoryStats = (memories: MemoryEntity[]): MemoryStatistics => {
  if (memories.length === 0) {
    return {
      totalCount: 0,
      totalImportance: 0,
      averageImportance: 0,
      tierDistribution: { hot: 0, warm: 0, cold: 0 },
      tierPercentages: { hot: 0, warm: 0, cold: 0 },
      storageSize: 0,
      dateRange: {
        earliest: null,
        latest: null,
        span: 0
      }
    };
  }

  const totalCount = memories.length;
  const totalImportance = memories.reduce((sum, m) => sum + (m.importance || 0), 0);
  const averageImportance = totalImportance / totalCount;

  // Tier distribution
  const tierCounts: Record<MemoryTier, number> = { hot: 0, warm: 0, cold: 0 };
  memories.forEach(memory => {
    const tier = memory.memoryTier || 'cold';
    tierCounts[tier]++;
  });

  const tierPercentages: Record<MemoryTier, number> = {
    hot: (tierCounts.hot / totalCount) * 100,
    warm: (tierCounts.warm / totalCount) * 100,
    cold: (tierCounts.cold / totalCount) * 100
  };

  // Storage size calculation
  const storageSize = memories.reduce((sum, memory) => {
    const content = typeof memory.content === 'string' 
      ? memory.content 
      : JSON.stringify(memory.content);
    return sum + content.length;
  }, 0);

  // Date range calculation
  const validDates = memories
    .filter(m => m.createdAt)
    .map(m => new Date(m.createdAt!))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateRange = validDates.length > 0 ? {
    earliest: validDates[0],
    latest: validDates[validDates.length - 1],
    span: Math.ceil((validDates[validDates.length - 1].getTime() - validDates[0].getTime()) / (1000 * 60 * 60 * 24))
  } : {
    earliest: null,
    latest: null,
    span: 0
  };

  return {
    totalCount,
    totalImportance,
    averageImportance,
    tierDistribution: tierCounts,
    tierPercentages,
    storageSize,
    dateRange
  };
};

// =============================================================================
// EFFICIENCY & OPTIMIZATION CALCULATIONS
// =============================================================================

export interface EfficiencyAnalysis {
  overallScore: number; // 0-100
  tierEfficiency: Record<MemoryTier, {
    score: number;
    averageImportance: number;
    optimalRange: [number, number];
    recommendation: string;
  }>;
  misplacedMemories: Array<{
    memoryId: string;
    currentTier: MemoryTier;
    recommendedTier: MemoryTier;
    importance: number;
    reason: string;
  }>;
}

export const calculateEfficiencyAnalysis = (memories: MemoryEntity[]): EfficiencyAnalysis => {
  if (memories.length === 0) {
    return {
      overallScore: 100,
      tierEfficiency: {
        hot: { score: 100, averageImportance: 0, optimalRange: [70, 100], recommendation: 'No memories in tier' },
        warm: { score: 100, averageImportance: 0, optimalRange: [40, 70], recommendation: 'No memories in tier' },
        cold: { score: 100, averageImportance: 0, optimalRange: [0, 40], recommendation: 'No memories in tier' }
      },
      misplacedMemories: []
    };
  }

  const tierGroups = memories.reduce((groups, memory) => {
    const tier = memory.memoryTier || 'cold';
    if (!groups[tier]) groups[tier] = [];
    groups[tier].push(memory);
    return groups;
  }, {} as Record<MemoryTier, MemoryEntity[]>);

  // Define optimal importance ranges for each tier
  const optimalRanges: Record<MemoryTier, [number, number]> = {
    hot: [70, 100],
    warm: [40, 70],
    cold: [0, 40]
  };

  const tierEfficiency: EfficiencyAnalysis['tierEfficiency'] = {
    hot: { score: 100, averageImportance: 0, optimalRange: [70, 100], recommendation: 'No memories in tier' },
    warm: { score: 100, averageImportance: 0, optimalRange: [40, 70], recommendation: 'No memories in tier' },
    cold: { score: 100, averageImportance: 0, optimalRange: [0, 40], recommendation: 'No memories in tier' }
  };

  const misplacedMemories: EfficiencyAnalysis['misplacedMemories'] = [];

  // Analyze each tier
  Object.entries(tierGroups).forEach(([tier, tierMemories]) => {
    const tierKey = tier as MemoryTier;
    const importanceValues = tierMemories.map(m => m.importance || 0);
    const averageImportance = importanceValues.reduce((sum, val) => sum + val, 0) / importanceValues.length;
    const [minOptimal, maxOptimal] = optimalRanges[tierKey];

    // Calculate efficiency score
    let score = 100;
    let recommendation = 'Well optimized';

    if (averageImportance < minOptimal) {
      score = Math.max(20, 100 - ((minOptimal - averageImportance) * 2));
      recommendation = `Average importance too low for ${tier} tier. Consider demoting some memories.`;
    } else if (averageImportance > maxOptimal) {
      score = Math.max(20, 100 - ((averageImportance - maxOptimal) * 2));
      recommendation = `Some high-importance memories could be in a higher tier.`;
    }

    tierEfficiency[tierKey] = {
      score,
      averageImportance,
      optimalRange: [minOptimal, maxOptimal],
      recommendation
    };

    // Identify misplaced memories
    tierMemories.forEach(memory => {
      const importance = memory.importance || 0;
      let recommendedTier: MemoryTier = tierKey;
      let reason = '';

      if (importance >= 70 && tierKey !== 'hot') {
        recommendedTier = 'hot';
        reason = 'High importance warrants hot tier';
      } else if (importance >= 40 && importance < 70 && tierKey !== 'warm') {
        recommendedTier = 'warm';
        reason = 'Medium importance suits warm tier';
      } else if (importance < 40 && tierKey !== 'cold') {
        recommendedTier = 'cold';
        reason = 'Low importance belongs in cold tier';
      }

      if (recommendedTier !== tierKey && memory.id) {
        misplacedMemories.push({
          memoryId: memory.id,
          currentTier: tierKey,
          recommendedTier,
          importance,
          reason
        });
      }
    });
  });

  // Calculate overall efficiency score
  const tierScores = Object.values(tierEfficiency).map(tier => tier.score);
  const overallScore = tierScores.reduce((sum, score) => sum + score, 0) / tierScores.length;

  return {
    overallScore,
    tierEfficiency,
    misplacedMemories
  };
};

// =============================================================================
// FRAGMENTATION ANALYSIS
// =============================================================================

export interface FragmentationAnalysis {
  score: number; // 0-100, higher = more fragmented
  distribution: {
    current: Record<MemoryTier, number>;
    optimal: Record<MemoryTier, number>;
    deviation: number;
  };
  hotSpots: Array<{
    tier: MemoryTier;
    severity: 'low' | 'medium' | 'high';
    count: number;
    recommendation: string;
  }>;
  wasteMetrics: {
    overAllocated: number; // bytes
    underUtilized: number; // percentage
    efficiency: number; // percentage
  };
}

export const calculateFragmentationAnalysis = (memories: MemoryEntity[]): FragmentationAnalysis => {
  if (memories.length === 0) {
    return {
      score: 0,
      distribution: {
        current: { hot: 0, warm: 0, cold: 0 },
        optimal: { hot: 0.2, warm: 0.3, cold: 0.5 },
        deviation: 0
      },
      hotSpots: [],
      wasteMetrics: {
        overAllocated: 0,
        underUtilized: 0,
        efficiency: 100
      }
    };
  }

  const totalCount = memories.length;
  const stats = calculateMemoryStats(memories);
  
  // Current distribution (as ratios)
  const currentDistribution = {
    hot: stats.tierDistribution.hot / totalCount,
    warm: stats.tierDistribution.warm / totalCount,
    cold: stats.tierDistribution.cold / totalCount
  };

  // Optimal distribution (industry best practices)
  const optimalDistribution = {
    hot: 0.2,   // 20% hot
    warm: 0.3,  // 30% warm  
    cold: 0.5   // 50% cold
  };

  // Calculate deviation from optimal
  const deviation = Object.keys(currentDistribution).reduce((sum, tier) => {
    const tierKey = tier as MemoryTier;
    return sum + Math.abs(currentDistribution[tierKey] - optimalDistribution[tierKey]);
  }, 0);

  const fragmentationScore = Math.min(100, deviation * 100 * 2); // Scale appropriately

  // Identify hotspots
  const hotSpots: FragmentationAnalysis['hotSpots'] = [];
  
  Object.entries(currentDistribution).forEach(([tier, ratio]) => {
    const tierKey = tier as MemoryTier;
    const optimal = optimalDistribution[tierKey];
    const deviation = Math.abs(ratio - optimal);
    
    if (deviation > 0.15) { // High deviation threshold
      hotSpots.push({
        tier: tierKey,
        severity: 'high',
        count: stats.tierDistribution[tierKey],
        recommendation: ratio > optimal 
          ? `Reduce ${tier} tier allocation by ${((ratio - optimal) * 100).toFixed(1)}%`
          : `Increase ${tier} tier allocation by ${((optimal - ratio) * 100).toFixed(1)}%`
      });
    } else if (deviation > 0.08) { // Medium deviation threshold
      hotSpots.push({
        tier: tierKey,
        severity: 'medium',
        count: stats.tierDistribution[tierKey],
        recommendation: `Fine-tune ${tier} tier allocation`
      });
    }
  });

  // Calculate waste metrics
  const efficiency = calculateEfficiencyAnalysis(memories);
  const avgEfficiency = efficiency.overallScore;
  
  const wasteMetrics = {
    overAllocated: stats.storageSize * (1 - avgEfficiency / 100),
    underUtilized: Math.max(0, 100 - avgEfficiency),
    efficiency: avgEfficiency
  };

  return {
    score: fragmentationScore,
    distribution: {
      current: currentDistribution,
      optimal: optimalDistribution,
      deviation
    },
    hotSpots,
    wasteMetrics
  };
};

// =============================================================================
// SEARCH RELEVANCE CALCULATIONS
// =============================================================================

export interface RelevanceScore {
  textMatch: number;      // 0-1
  semanticMatch: number;  // 0-1
  importanceWeight: number; // 0-1
  recencyWeight: number;  // 0-1
  combined: number;       // 0-1
}

export const calculateTextRelevance = (query: string, content: string): number => {
  if (!query.trim() || !content.trim()) return 0;

  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let score = 0;
  let exactMatches = 0;
  let partialMatches = 0;

  queryWords.forEach(word => {
    if (contentWords.includes(word)) {
      exactMatches++;
      score += 1.0;
    } else {
      // Check for partial matches
      const partialMatch = contentWords.some(contentWord => 
        contentWord.includes(word) || word.includes(contentWord)
      );
      if (partialMatch) {
        partialMatches++;
        score += 0.5;
      }
    }
  });

  // Bonus for exact phrase match
  if (content.toLowerCase().includes(query.toLowerCase())) {
    score += queryWords.length * 0.5;
  }

  // Normalize by query length
  return Math.min(score / Math.max(queryWords.length, 1), 1.0);
};

export const calculateSemanticSimilarity = (queryWords: string[], contentWords: string[]): number => {
  // Simplified semantic similarity using word overlap
  // In a real implementation, this would use embeddings or more sophisticated NLP
  
  const querySet = new Set(queryWords.map(w => w.toLowerCase()));
  const contentSet = new Set(contentWords.map(w => w.toLowerCase()));
  
  const intersection = new Set([...querySet].filter(word => contentSet.has(word)));
  const union = new Set([...querySet, ...contentSet]);
  
  // Jaccard similarity
  return intersection.size / union.size;
};

export const calculateRelevanceScore = (
  query: string,
  memory: MemoryEntity,
  currentDate = new Date()
): RelevanceScore => {
  const content = typeof memory.content === 'string' 
    ? memory.content 
    : JSON.stringify(memory.content);

  // Text relevance
  const textMatch = calculateTextRelevance(query, content);

  // Semantic relevance (simplified)
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  const semanticMatch = calculateSemanticSimilarity(queryWords, contentWords);

  // Importance weight (higher importance = higher relevance)
  const importanceWeight = (memory.importance || 0) / 100;

  // Recency weight (more recent = slightly higher relevance)
  let recencyWeight = 0.5; // Default neutral weight
  if (memory.createdAt) {
    const memoryDate = new Date(memory.createdAt);
    const daysSince = (currentDate.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Decay function: more recent memories get slightly higher weight
    recencyWeight = Math.max(0.1, Math.min(1.0, 1 - (daysSince / 365))); // Year-based decay
  }

  // Combined score with weighted factors
  const combined = (
    textMatch * 0.4 +           // 40% text relevance
    semanticMatch * 0.3 +       // 30% semantic relevance  
    importanceWeight * 0.2 +    // 20% importance
    recencyWeight * 0.1         // 10% recency
  );

  return {
    textMatch,
    semanticMatch,
    importanceWeight,
    recencyWeight,
    combined: Math.min(combined, 1.0)
  };
};

// =============================================================================
// CLUSTERING & GROUPING CALCULATIONS
// =============================================================================

export interface MemoryCluster {
  id: string;
  center: { importance: number; date: number }; // date as timestamp
  memories: MemoryEntity[];
  radius: number;
  cohesion: number; // 0-1, how tightly grouped the cluster is
}

export const calculateMemoryClusters = (
  memories: MemoryEntity[],
  maxClusters = 5,
  minClusterSize = 2
): MemoryCluster[] => {
  if (memories.length < minClusterSize) return [];

  // Simple K-means clustering based on importance and date
  const points = memories
    .filter(m => m.createdAt && m.importance !== undefined)
    .map(memory => ({
      memory,
      importance: memory.importance || 0,
      date: new Date(memory.createdAt!).getTime()
    }));

  if (points.length < minClusterSize) return [];

  // Normalize coordinates for clustering
  const importanceExtent = [
    Math.min(...points.map(p => p.importance)),
    Math.max(...points.map(p => p.importance))
  ];
  const dateExtent = [
    Math.min(...points.map(p => p.date)),
    Math.max(...points.map(p => p.date))
  ];

  const normalizeImportance = (val: number) => 
    importanceExtent[1] === importanceExtent[0] ? 0.5 : 
    (val - importanceExtent[0]) / (importanceExtent[1] - importanceExtent[0]);
  
  const normalizeDate = (val: number) => 
    dateExtent[1] === dateExtent[0] ? 0.5 :
    (val - dateExtent[0]) / (dateExtent[1] - dateExtent[0]);

  // Simplified clustering - in practice, you'd use a proper K-means implementation
  const numClusters = Math.min(maxClusters, Math.floor(points.length / minClusterSize));
  const clusters: MemoryCluster[] = [];

  // Initialize cluster centers
  for (let i = 0; i < numClusters; i++) {
    const centerPoint = points[Math.floor(i * points.length / numClusters)];
    clusters.push({
      id: `cluster-${i}`,
      center: {
        importance: centerPoint.importance,
        date: centerPoint.date
      },
      memories: [],
      radius: 0,
      cohesion: 0
    });
  }

  // Assign points to clusters (simplified)
  points.forEach(point => {
    let bestCluster = clusters[0];
    let minDistance = Infinity;

    clusters.forEach(cluster => {
      const distanceImportance = Math.abs(normalizeImportance(point.importance) - normalizeImportance(cluster.center.importance));
      const distanceDate = Math.abs(normalizeDate(point.date) - normalizeDate(cluster.center.date));
      const distance = Math.sqrt(distanceImportance ** 2 + distanceDate ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        bestCluster = cluster;
      }
    });

    bestCluster.memories.push(point.memory);
  });

  // Filter clusters by minimum size and calculate metrics
  return clusters
    .filter(cluster => cluster.memories.length >= minClusterSize)
    .map(cluster => {
      // Calculate actual center based on assigned memories
      const avgImportance = cluster.memories.reduce((sum, m) => sum + (m.importance || 0), 0) / cluster.memories.length;
      const avgDate = cluster.memories.reduce((sum, m) => sum + new Date(m.createdAt!).getTime(), 0) / cluster.memories.length;

      // Calculate radius (max distance from center)
      const radius = Math.max(...cluster.memories.map(memory => {
        const distanceImportance = Math.abs(normalizeImportance(memory.importance || 0) - normalizeImportance(avgImportance));
        const distanceDate = Math.abs(normalizeDate(new Date(memory.createdAt!).getTime()) - normalizeDate(avgDate));
        return Math.sqrt(distanceImportance ** 2 + distanceDate ** 2);
      }));

      // Calculate cohesion (inverse of average distance from center)
      const avgDistance = cluster.memories.reduce((sum, memory) => {
        const distanceImportance = Math.abs(normalizeImportance(memory.importance || 0) - normalizeImportance(avgImportance));
        const distanceDate = Math.abs(normalizeDate(new Date(memory.createdAt!).getTime()) - normalizeDate(avgDate));
        return sum + Math.sqrt(distanceImportance ** 2 + distanceDate ** 2);
      }, 0) / cluster.memories.length;

      const cohesion = Math.max(0, 1 - avgDistance);

      return {
        ...cluster,
        center: { importance: avgImportance, date: avgDate },
        radius,
        cohesion
      };
    });
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatScore = (score: number, decimals = 1): string => {
  return score.toFixed(decimals);
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (start: number, end: number, factor: number): number => {
  return start + (end - start) * factor;
};

export const normalize = (value: number, min: number, max: number): number => {
  return max === min ? 0.5 : (value - min) / (max - min);
}; 