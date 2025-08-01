import { PersonaRelationship, MockPersona } from '../types/relationship-types';

// Mock persona data for testing
export const mockPersonas: MockPersona[] = [
  { 
    id: '1', 
    name: 'Creative Assistant', 
    personalityProfile: { 
      bigFive: { 
        openness: 85, 
        conscientiousness: 60, 
        extraversion: 70, 
        agreeableness: 80, 
        neuroticism: 30 
      } 
    } 
  },
  { 
    id: '2', 
    name: 'Analytical Advisor', 
    personalityProfile: { 
      bigFive: { 
        openness: 40, 
        conscientiousness: 95, 
        extraversion: 30, 
        agreeableness: 60, 
        neuroticism: 20 
      } 
    } 
  },
  { 
    id: '3', 
    name: 'Social Coordinator', 
    personalityProfile: { 
      bigFive: { 
        openness: 70, 
        conscientiousness: 75, 
        extraversion: 90, 
        agreeableness: 85, 
        neuroticism: 25 
      } 
    } 
  },
  { 
    id: '4', 
    name: 'Strategic Planner', 
    personalityProfile: { 
      bigFive: { 
        openness: 60, 
        conscientiousness: 90, 
        extraversion: 50, 
        agreeableness: 45, 
        neuroticism: 35 
      } 
    } 
  },
];

// Mock relationship data for testing
export const mockRelationships: PersonaRelationship[] = [
  {
    id: 'rel1',
    fromPersonaId: '1',
    toPersonaId: '2',
    type: 'collaboration',
    strength: 75,
    quality: 'good',
    createdAt: new Date('2024-01-15'),
    lastUpdated: new Date('2024-01-20'),
    metadata: {
      successRate: 78,
      conflictScore: 15,
      collaborationHistory: [
        { 
          date: new Date('2024-01-16'), 
          outcome: 'success', 
          description: 'Successful creative-analytical project completion' 
        },
        { 
          date: new Date('2024-01-18'), 
          outcome: 'neutral', 
          description: 'Minor communication adjustments needed' 
        },
      ],
    },
  },
  {
    id: 'rel2',
    fromPersonaId: '2',
    toPersonaId: '4',
    type: 'synergy',
    strength: 90,
    quality: 'excellent',
    createdAt: new Date('2024-01-10'),
    lastUpdated: new Date('2024-01-22'),
    metadata: {
      successRate: 92,
      conflictScore: 5,
      collaborationHistory: [
        { 
          date: new Date('2024-01-12'), 
          outcome: 'success', 
          description: 'Excellent strategic planning session' 
        },
        { 
          date: new Date('2024-01-20'), 
          outcome: 'success', 
          description: 'Highly effective analytical review' 
        },
      ],
    },
  },
]; 