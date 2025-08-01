import { MemoryEntity } from '@shared/types/memory';

// Optimization rule types
export type OptimizationCategory = 'tier_management' | 'cleanup' | 'performance' | 'storage';
export type OptimizationPriority = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  category: OptimizationCategory;
  priority: OptimizationPriority;
  enabled: boolean;
  condition: (memories: MemoryEntity[]) => boolean;
  action: (memories: MemoryEntity[]) => Promise<OptimizationAction[]>;
}

// Optimization action types
export type OptimizationActionType = 'tier_promote' | 'tier_demote' | 'archive' | 'delete' | 'compress' | 'index_rebuild';

export interface OptimizationAction {
  id: string;
  type: OptimizationActionType;
  memoryIds: string[];
  description: string;
  estimatedImpact: {
    performanceGain: number;
    storageReduction: number;
    accessTimeImprovement: number;
  };
  reversible: boolean;
  riskLevel: RiskLevel;
}

// Optimization session types
export type OptimizationStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface OptimizationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: OptimizationStatus;
  rulesExecuted: string[];
  actionsApplied: OptimizationAction[];
  results: {
    memoriesProcessed: number;
    totalImpact: {
      performanceGain: number;
      storageReduction: number;
      accessTimeImprovement: number;
    };
    errors: string[];
  };
}

// Component props
export interface MemoryOptimizationEngineProps {
  memories: MemoryEntity[];
  onOptimizationComplete?: (session: OptimizationSession) => void;
  onOptimizationProgress?: (progress: number) => void;
  autoOptimize?: boolean;
  optimizationInterval?: number;
} 