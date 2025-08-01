// Persona Components
export { PersonaListItem } from './PersonaListItem';
export { PersonaCreationWizard } from './PersonaCreationWizard';
export { PersonaMemoryDashboard } from './PersonaMemoryDashboard';
export { PersonaEmotionalProfile } from './PersonaEmotionalProfile';
export { PersonaBehaviorConfiguration } from './PersonaBehaviorConfiguration';
export { PersonaDashboard } from './PersonaDashboard';
export { PersonaAdvancedEditor } from './PersonaAdvancedEditor';
export { PersonaManagement } from './PersonaManagement';
export { default as PersonaRelationshipModeling } from './PersonaRelationshipModeling';

// Export relationship modeling sub-components
export { RelationshipGraph } from './components/RelationshipGraph';
export { ConflictDetectionPanel } from './components/ConflictDetectionPanel';
export { CollaborationAnalysisPanel } from './components/CollaborationAnalysisPanel';
export { AnalyticsDashboard } from './components/AnalyticsDashboard';

// Export types and utilities
export type * from './types/relationship-types';
export * from './utils/mock-data';

// Re-export personality template types and utilities
export type { PersonalityTemplate } from '@shared/types/personality-templates';
export { 
  PERSONALITY_TEMPLATES, 
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  getPopularTemplates,
  searchTemplates,
  getTemplateById 
} from '@shared/types/personality-templates'; 