import { EventEmitter } from 'events';

// =============================================================================
// BEHAVIOR SYSTEM INTERFACES
// =============================================================================

export interface BehaviorScript {
  id: string;
  name: string;
  description: string;
  version: string;
  personaId: string;
  category: BehaviorCategory;
  priority: number; // 1-100, higher = more priority
  conditions: BehaviorCondition[];
  actions: BehaviorAction[];
  isActive: boolean;
  isTemplate: boolean;
  parentTemplateId?: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  testResults?: BehaviorTestResult[];
  usageStats: BehaviorUsageStats;
}

export enum BehaviorCategory {
  COMMUNICATION = 'communication',
  DECISION_MAKING = 'decision_making',
  EMOTIONAL_RESPONSE = 'emotional_response',
  MEMORY_PROCESSING = 'memory_processing',
  LEARNING = 'learning',
  CUSTOM = 'custom'
}

export interface BehaviorCondition {
  type: 'context' | 'emotion' | 'memory' | 'time' | 'user_input' | 'custom';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches' | 'and' | 'or';
  value: any;
  weight: number; // 0-1, how much this condition affects triggering
}

export interface BehaviorAction {
  type: 'response_modifier' | 'emotion_trigger' | 'memory_action' | 'workflow_trigger' | 'custom';
  parameters: Record<string, any>;
  delay?: number; // milliseconds
  probability?: number; // 0-1, chance this action executes
}

export interface BehaviorTemplate {
  id: string;
  name: string;
  description: string;
  category: BehaviorCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  script: Omit<BehaviorScript, 'id' | 'personaId' | 'createdAt' | 'updatedAt' | 'usageStats' | 'testResults'>;
  examples: BehaviorExample[];
  popularity: number;
  rating: number;
}

export interface BehaviorExample {
  scenario: string;
  expectedOutcome: string;
  testInputs: any[];
}

export interface BehaviorConflict {
  id: string;
  personaId: string;
  conflictingBehaviors: string[]; // behavior IDs
  conflictType: 'priority' | 'condition_overlap' | 'action_contradiction' | 'resource_contention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedResolution: string;
  autoResolvable: boolean;
  detectedAt: Date;
}

export interface BehaviorTestResult {
  id: string;
  behaviorId: string;
  testScenario: string;
  testInputs: any[];
  expectedOutput: any;
  actualOutput: any;
  success: boolean;
  executionTime: number;
  timestamp: Date;
  notes?: string;
}

export interface BehaviorUsageStats {
  timesTriggered: number;
  averageExecutionTime: number;
  successRate: number;
  lastTriggered?: Date;
  errorCount: number;
  popularityScore: number;
}

// =============================================================================
// PERSONA BEHAVIOR MANAGER
// =============================================================================

export class PersonaBehaviorManager extends EventEmitter {
  private behaviors: Map<string, BehaviorScript> = new Map();
  private templates: Map<string, BehaviorTemplate> = new Map();
  private conflicts: Map<string, BehaviorConflict> = new Map();
  private executionQueue: Array<{ behaviorId: string; context: any }> = [];

  constructor() {
    super();
    this.initializeBuiltInTemplates();
  }

  // =============================================================================
  // BEHAVIOR SCRIPT MANAGEMENT
  // =============================================================================

  async createBehavior(behavior: Omit<BehaviorScript, 'id' | 'createdAt' | 'updatedAt' | 'usageStats'>): Promise<string> {
    const id = `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newBehavior: BehaviorScript = {
      ...behavior,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageStats: {
        timesTriggered: 0,
        averageExecutionTime: 0,
        successRate: 0,
        errorCount: 0,
        popularityScore: 0
      }
    };

    this.behaviors.set(id, newBehavior);
    
    // Check for conflicts
    await this.detectConflicts(behavior.personaId);
    
    this.emit('behaviorCreated', newBehavior);
    return id;
  }

  async updateBehavior(id: string, updates: Partial<BehaviorScript>): Promise<void> {
    const behavior = this.behaviors.get(id);
    if (!behavior) {
      throw new Error(`Behavior ${id} not found`);
    }

    const updatedBehavior = {
      ...behavior,
      ...updates,
      updatedAt: new Date(),
      version: this.incrementVersion(behavior.version)
    };

    this.behaviors.set(id, updatedBehavior);
    
    // Re-check conflicts after update
    await this.detectConflicts(behavior.personaId);
    
    this.emit('behaviorUpdated', updatedBehavior);
  }

  async deleteBehavior(id: string): Promise<void> {
    const behavior = this.behaviors.get(id);
    if (!behavior) {
      throw new Error(`Behavior ${id} not found`);
    }

    this.behaviors.delete(id);
    
    // Clean up related conflicts
    this.cleanupConflicts(id);
    
    this.emit('behaviorDeleted', { id, personaId: behavior.personaId });
  }

  getBehavior(id: string): BehaviorScript | undefined {
    return this.behaviors.get(id);
  }

  getBehaviorsByPersona(personaId: string): BehaviorScript[] {
    return Array.from(this.behaviors.values())
      .filter(behavior => behavior.personaId === personaId)
      .sort((a, b) => b.priority - a.priority);
  }

  // =============================================================================
  // BEHAVIOR EXECUTION SIMULATION
  // =============================================================================

  async executeBehaviors(personaId: string, context: any): Promise<any[]> {
    const behaviors = this.getBehaviorsByPersona(personaId)
      .filter(behavior => behavior.isActive);

    const results = [];

    for (const behavior of behaviors) {
      try {
        const shouldExecute = await this.evaluateConditions(behavior.conditions, context);
        
        if (shouldExecute) {
          const startTime = Date.now();
          const result = await this.executeBehaviorActions(behavior.actions, context);
          const executionTime = Date.now() - startTime;
          
          // Update usage stats
          this.updateUsageStats(behavior.id, executionTime, true);
          
          results.push({
            behaviorId: behavior.id,
            result,
            executionTime
          });
        }
      } catch (error) {
        console.error(`Error executing behavior ${behavior.id}:`, error);
        this.updateUsageStats(behavior.id, 0, false);
      }
    }

    return results;
  }

  private async evaluateConditions(conditions: BehaviorCondition[], context: any): Promise<boolean> {
    if (conditions.length === 0) return true;

    // Simple evaluation - can be enhanced with complex logic
    let score = 0;
    let totalWeight = 0;

    for (const condition of conditions) {
      totalWeight += condition.weight;
      
      if (this.evaluateCondition(condition, context)) {
        score += condition.weight;
      }
    }

    return score / totalWeight > 0.5; // Threshold for activation
  }

  private evaluateCondition(condition: BehaviorCondition, context: any): boolean {
    const contextValue = this.getContextValue(condition.type, context);
    
    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'contains':
        return String(contextValue).includes(String(condition.value));
      case 'greater_than':
        return Number(contextValue) > Number(condition.value);
      case 'less_than':
        return Number(contextValue) < Number(condition.value);
      case 'matches':
        return new RegExp(condition.value).test(String(contextValue));
      default:
        return false;
    }
  }

  private getContextValue(type: string, context: any): any {
    switch (type) {
      case 'context':
        return context.situationContext;
      case 'emotion':
        return context.currentEmotion;
      case 'memory':
        return context.recentMemories;
      case 'time':
        return new Date();
      case 'user_input':
        return context.userInput;
      default:
        return context[type];
    }
  }

  private async executeBehaviorActions(actions: BehaviorAction[], context: any): Promise<any[]> {
    const results = [];

    for (const action of actions) {
      if (action.probability && Math.random() > action.probability) {
        continue; // Skip based on probability
      }

      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      const result = await this.executeAction(action, context);
      results.push(result);
    }

    return results;
  }

  private async executeAction(action: BehaviorAction, context: any): Promise<any> {
    switch (action.type) {
      case 'response_modifier':
        return this.modifyResponse(action.parameters, context);
      case 'emotion_trigger':
        return this.triggerEmotion(action.parameters, context);
      case 'memory_action':
        return this.performMemoryAction(action.parameters, context);
      case 'workflow_trigger':
        return this.triggerWorkflow(action.parameters, context);
      default:
        return this.executeCustomAction(action, context);
    }
  }

  private modifyResponse(parameters: any, _context: any): any {
    return {
      type: 'response_modification',
      modifications: parameters,
      applied: true
    };
  }

  private triggerEmotion(parameters: any, _context: any): any {
    return {
      type: 'emotion_trigger',
      emotion: parameters.emotion,
      intensity: parameters.intensity,
      duration: parameters.duration
    };
  }

  private performMemoryAction(parameters: any, _context: any): any {
    return {
      type: 'memory_action',
      action: parameters.action,
      target: parameters.target,
      executed: true
    };
  }

  private triggerWorkflow(parameters: any, _context: any): any {
    return {
      type: 'workflow_trigger',
      workflowId: parameters.workflowId,
      parameters: parameters.workflowParameters,
      triggered: true
    };
  }

  private executeCustomAction(action: BehaviorAction, _context: any): any {
    return {
      type: 'custom_action',
      action: action.type,
      parameters: action.parameters,
      result: 'executed'
    };
  }

  // =============================================================================
  // BEHAVIOR TEMPLATES
  // =============================================================================

  getTemplates(): BehaviorTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.popularity - a.popularity);
  }

  getTemplatesByCategory(category: BehaviorCategory): BehaviorTemplate[] {
    return this.getTemplates()
      .filter(template => template.category === category);
  }

  createBehaviorFromTemplate(templateId: string, personaId: string, customizations?: Partial<BehaviorScript>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const behaviorData = {
      ...template.script,
      personaId,
      parentTemplateId: templateId,
      author: 'user',
      ...customizations
    };

    return this.createBehavior(behaviorData);
  }

  // =============================================================================
  // CONFLICT DETECTION & RESOLUTION
  // =============================================================================

  async detectConflicts(personaId: string): Promise<BehaviorConflict[]> {
    const behaviors = this.getBehaviorsByPersona(personaId);
    const conflicts: BehaviorConflict[] = [];

    // Check for priority conflicts
    conflicts.push(...this.detectPriorityConflicts(behaviors));
    
    // Check for condition overlaps
    conflicts.push(...this.detectConditionOverlaps(behaviors));

    // Store detected conflicts
    conflicts.forEach(conflict => {
      this.conflicts.set(conflict.id, conflict);
    });

    this.emit('conflictsDetected', { personaId, conflicts });
    return conflicts;
  }

  private detectPriorityConflicts(behaviors: BehaviorScript[]): BehaviorConflict[] {
    const conflicts: BehaviorConflict[] = [];
    const priorityGroups = new Map<number, BehaviorScript[]>();

    // Group by priority
    behaviors.forEach(behavior => {
      if (!priorityGroups.has(behavior.priority)) {
        priorityGroups.set(behavior.priority, []);
      }
      priorityGroups.get(behavior.priority)!.push(behavior);
    });

    // Find conflicts in high-priority groups
    priorityGroups.forEach((group, priority) => {
      if (group.length > 1 && priority > 80) {
        conflicts.push({
          id: `conflict_priority_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          personaId: group[0].personaId,
          conflictingBehaviors: group.map(b => b.id),
          conflictType: 'priority',
          severity: 'medium',
          description: `Multiple high-priority behaviors (${priority}) may compete for execution`,
          suggestedResolution: 'Adjust priorities to create clear hierarchy',
          autoResolvable: true,
          detectedAt: new Date()
        });
      }
    });

    return conflicts;
  }

  private detectConditionOverlaps(behaviors: BehaviorScript[]): BehaviorConflict[] {
    const conflicts: BehaviorConflict[] = [];
    
    for (let i = 0; i < behaviors.length; i++) {
      for (let j = i + 1; j < behaviors.length; j++) {
        const overlap = this.calculateConditionOverlap(behaviors[i].conditions, behaviors[j].conditions);
        
        if (overlap > 0.7) {
          conflicts.push({
            id: `conflict_overlap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            personaId: behaviors[i].personaId,
            conflictingBehaviors: [behaviors[i].id, behaviors[j].id],
            conflictType: 'condition_overlap',
            severity: overlap > 0.9 ? 'high' : 'medium',
            description: `High condition overlap (${Math.round(overlap * 100)}%) between behaviors`,
            suggestedResolution: 'Refine conditions to reduce overlap or merge behaviors',
            autoResolvable: false,
            detectedAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  private calculateConditionOverlap(conditions1: BehaviorCondition[], conditions2: BehaviorCondition[]): number {
    if (conditions1.length === 0 || conditions2.length === 0) return 0;

    let matches = 0;
    let total = 0;

    conditions1.forEach(c1 => {
      conditions2.forEach(c2 => {
        total++;
        if (c1.type === c2.type && c1.operator === c2.operator) {
          matches++;
        }
      });
    });

    return total > 0 ? matches / total : 0;
  }

  async resolveConflict(conflictId: string, resolution: 'auto' | 'manual', resolutionData?: any): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    if (resolution === 'auto' && conflict.autoResolvable) {
      await this.autoResolveConflict(conflict);
    } else if (resolution === 'manual' && resolutionData) {
      await this.manualResolveConflict(conflict, resolutionData);
    }

    this.conflicts.delete(conflictId);
    this.emit('conflictResolved', { conflictId, resolution });
  }

  private async autoResolveConflict(conflict: BehaviorConflict): Promise<void> {
    switch (conflict.conflictType) {
      case 'priority':
        await this.autoResolvePriorityConflict(conflict);
        break;
      default:
        throw new Error(`Auto-resolution not implemented for ${conflict.conflictType}`);
    }
  }

  private async autoResolvePriorityConflict(conflict: BehaviorConflict): Promise<void> {
    // Automatically adjust priorities to create hierarchy
    const behaviors = conflict.conflictingBehaviors.map(id => this.behaviors.get(id)!);
    
    behaviors.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Older behaviors get higher priority
    
    for (let i = 0; i < behaviors.length; i++) {
      await this.updateBehavior(behaviors[i].id, {
        priority: behaviors[i].priority - i
      });
    }
  }

  private async manualResolveConflict(_conflict: BehaviorConflict, _resolutionData: any): Promise<void> {
    // Apply manual resolution based on resolutionData
    // Implementation depends on specific resolution strategy
  }

  // =============================================================================
  // BEHAVIOR TESTING
  // =============================================================================

  async testBehavior(behaviorId: string, testScenarios: any[]): Promise<BehaviorTestResult[]> {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) {
      throw new Error(`Behavior ${behaviorId} not found`);
    }

    const results: BehaviorTestResult[] = [];

    for (const scenario of testScenarios) {
      const startTime = Date.now();
      
      try {
        const actualOutput = await this.executeBehaviors(behavior.personaId, scenario.input);
        const executionTime = Date.now() - startTime;
        
        const result: BehaviorTestResult = {
          id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          behaviorId,
          testScenario: scenario.description,
          testInputs: scenario.input,
          expectedOutput: scenario.expectedOutput,
          actualOutput,
          success: this.compareOutputs(scenario.expectedOutput, actualOutput),
          executionTime,
          timestamp: new Date(),
          notes: scenario.notes
        };

        results.push(result);
      } catch (error) {
        results.push({
          id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          behaviorId,
          testScenario: scenario.description,
          testInputs: scenario.input,
          expectedOutput: scenario.expectedOutput,
          actualOutput: { error: error instanceof Error ? error.message : String(error) },
          success: false,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          notes: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Store test results
    const updatedBehavior = { ...behavior };
    updatedBehavior.testResults = (updatedBehavior.testResults || []).concat(results);
    this.behaviors.set(behaviorId, updatedBehavior);

    this.emit('behaviorTested', { behaviorId, results });
    return results;
  }

  private compareOutputs(expected: any, actual: any): boolean {
    // Simplified comparison - can be enhanced
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
  }

  private updateUsageStats(behaviorId: string, executionTime: number, success: boolean): void {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) return;

    const stats = behavior.usageStats;
    stats.timesTriggered++;
    
    if (success) {
      stats.averageExecutionTime = (stats.averageExecutionTime * (stats.timesTriggered - 1) + executionTime) / stats.timesTriggered;
      stats.lastTriggered = new Date();
    } else {
      stats.errorCount++;
    }
    
    stats.successRate = (stats.timesTriggered - stats.errorCount) / stats.timesTriggered;
    stats.popularityScore = Math.min(100, stats.timesTriggered * stats.successRate);

    this.behaviors.set(behaviorId, behavior);
  }

  private cleanupConflicts(behaviorId: string): void {
    const conflictsToRemove = Array.from(this.conflicts.entries())
      .filter(([, conflict]) => conflict.conflictingBehaviors.includes(behaviorId))
      .map(([id]) => id);

    conflictsToRemove.forEach(id => this.conflicts.delete(id));
  }

  private initializeBuiltInTemplates(): void {
    const templates: BehaviorTemplate[] = [
      {
        id: 'helpful-assistant',
        name: 'Helpful Assistant',
        description: 'Always tries to be helpful and provide useful responses',
        category: BehaviorCategory.COMMUNICATION,
        difficulty: 'beginner',
        tags: ['helpful', 'polite', 'responsive'],
        script: {
          name: 'Helpful Assistant Behavior',
          description: 'Modifies responses to be more helpful and constructive',
          version: '1.0.0',
          category: BehaviorCategory.COMMUNICATION,
          priority: 70,
          conditions: [
            {
              type: 'user_input',
              operator: 'contains',
              value: 'help',
              weight: 0.8
            }
          ],
          actions: [
            {
              type: 'response_modifier',
              parameters: {
                tone: 'helpful',
                includeAlternatives: true,
                offerFollowUp: true
              }
            }
          ],
          isActive: true,
          isTemplate: true,
          author: 'system'
        },
        examples: [
          {
            scenario: 'User asks for help with a task',
            expectedOutcome: 'Provides helpful response with alternatives',
            testInputs: [{ userInput: 'Can you help me with this problem?' }]
          }
        ],
        popularity: 85,
        rating: 4.5
      },
      {
        id: 'empathetic-listener',
        name: 'Empathetic Listener',
        description: 'Responds with empathy and emotional support',
        category: BehaviorCategory.EMOTIONAL_RESPONSE,
        difficulty: 'intermediate',
        tags: ['empathy', 'support', 'emotional'],
        script: {
          name: 'Empathetic Listener Behavior',
          description: 'Provides empathetic responses based on emotional context',
          version: '1.0.0',
          category: BehaviorCategory.EMOTIONAL_RESPONSE,
          priority: 75,
          conditions: [
            {
              type: 'emotion',
              operator: 'equals',
              value: 'sadness',
              weight: 0.9
            },
            {
              type: 'user_input',
              operator: 'contains',
              value: 'sad|upset|frustrated',
              weight: 0.7
            }
          ],
          actions: [
            {
              type: 'response_modifier',
              parameters: {
                tone: 'empathetic',
                acknowledgment: true,
                supportive: true
              }
            },
            {
              type: 'emotion_trigger',
              parameters: {
                emotion: 'empathy',
                intensity: 70,
                duration: 300000
              }
            }
          ],
          isActive: true,
          isTemplate: true,
          author: 'system'
        },
        examples: [
          {
            scenario: 'User expresses sadness or frustration',
            expectedOutcome: 'Provides empathetic and supportive response',
            testInputs: [{ userInput: 'I\'m feeling really sad today', currentEmotion: 'sadness' }]
          }
        ],
        popularity: 78,
        rating: 4.3
      },
      {
        id: 'creative-collaborator',
        name: 'Creative Collaborator',
        description: 'Enhances creative thinking and brainstorming',
        category: BehaviorCategory.DECISION_MAKING,
        difficulty: 'intermediate',
        tags: ['creativity', 'brainstorming', 'innovation'],
        script: {
          name: 'Creative Collaborator Behavior',
          description: 'Stimulates creative thinking and alternative perspectives',
          version: '1.0.0',
          category: BehaviorCategory.DECISION_MAKING,
          priority: 65,
          conditions: [
            {
              type: 'user_input',
              operator: 'contains',
              value: 'creative|idea|brainstorm|innovative',
              weight: 0.8
            },
            {
              type: 'context',
              operator: 'equals',
              value: 'creative_session',
              weight: 0.9
            }
          ],
          actions: [
            {
              type: 'response_modifier',
              parameters: {
                style: 'creative',
                includeAlternatives: true,
                encourageExploration: true,
                suggestUnconventional: true
              }
            }
          ],
          isActive: true,
          isTemplate: true,
          author: 'system'
        },
        examples: [
          {
            scenario: 'User requests creative input or brainstorming',
            expectedOutcome: 'Provides creative suggestions and alternative perspectives',
            testInputs: [{ userInput: 'I need some creative ideas for this project', situationContext: 'creative_session' }]
          }
        ],
        popularity: 71,
        rating: 4.2
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  getPersonaConflicts(personaId: string): BehaviorConflict[] {
    return Array.from(this.conflicts.values())
      .filter(conflict => conflict.personaId === personaId);
  }

  getBehaviorTestResults(behaviorId: string): BehaviorTestResult[] {
    const behavior = this.behaviors.get(behaviorId);
    return behavior?.testResults || [];
  }

  getUsageStatistics(personaId: string): any {
    const behaviors = this.getBehaviorsByPersona(personaId);
    
    return {
      totalBehaviors: behaviors.length,
      activeBehaviors: behaviors.filter(b => b.isActive).length,
      averageSuccessRate: behaviors.length > 0 ? behaviors.reduce((sum, b) => sum + b.usageStats.successRate, 0) / behaviors.length : 0,
      totalTriggers: behaviors.reduce((sum, b) => sum + b.usageStats.timesTriggered, 0),
      conflicts: this.getPersonaConflicts(personaId).length
    };
  }

  // Version history and sharing methods
  getBehaviorVersionHistory(_behaviorId: string): any[] {
    // Implementation for version history tracking
    return [];
  }

  exportBehavior(behaviorId: string): any {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) {
      throw new Error(`Behavior ${behaviorId} not found`);
    }
    
    return {
      ...behavior,
      exportedAt: new Date(),
      version: behavior.version
    };
  }

  importBehavior(behaviorData: any, personaId: string): Promise<string> {
    const importedBehavior = {
      ...behaviorData,
      personaId,
      author: 'imported',
      parentTemplateId: behaviorData.id, // Reference original
      isTemplate: false
    };

    delete importedBehavior.id; // Generate new ID
    delete importedBehavior.exportedAt;

    return this.createBehavior(importedBehavior);
  }
}
