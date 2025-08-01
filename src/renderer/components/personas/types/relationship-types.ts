// Persona Relationship Types and Interfaces

export interface PersonaRelationship {
  id: string;
  fromPersonaId: string;
  toPersonaId: string;
  type: 'collaboration' | 'conflict' | 'hierarchy' | 'mentorship' | 'competition' | 'synergy';
  strength: number; // 0-100
  quality: 'excellent' | 'good' | 'neutral' | 'poor' | 'problematic';
  createdAt: Date;
  lastUpdated: Date;
  metadata: {
    successRate: number;
    conflictScore: number;
    collaborationHistory: Array<{
      date: Date;
      outcome: 'success' | 'failure' | 'neutral';
      description: string;
    }>;
  };
}

export interface ConflictDetection {
  personas: [string, string];
  conflictType: 'personality' | 'goal' | 'communication' | 'workflow';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  affectedTraits: string[];
}

export interface CollaborationPattern {
  personas: string[];
  patternType: 'highly_compatible' | 'complementary' | 'neutral' | 'requires_mediation';
  successRate: number;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

export interface RelationshipStats {
  totalRelationships: number;
  averageStrength: number;
  conflictCount: number;
  collaborationOpportunities: number;
  networkDensity: number;
}

// Mock data interfaces
export interface MockPersona {
  id: string;
  name: string;
  personalityProfile?: {
    bigFive: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
  };
}

// D3 visualization types
export interface GraphNode {
  id: string;
  name: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
  type: string;
  quality: string;
} 