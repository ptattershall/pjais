import React, { useState, useEffect } from 'react';

interface PersonaBehaviorConfigurationProps {
  personaId: string;
  onUpdate?: (behaviorId: string) => void;
  onClose?: () => void;
}

interface BehaviorScript {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: number;
  conditions: BehaviorCondition[];
  actions: BehaviorAction[];
  isActive: boolean;
  author: string;
}

interface BehaviorCondition {
  type: string;
  operator: string;
  value: any;
  weight: number;
}

interface BehaviorAction {
  type: string;
  parameters: Record<string, any>;
}

interface BehaviorTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
  popularity: number;
}

interface BehaviorConflict {
  id: string;
  conflictingBehaviors: string[];
  conflictType: string;
  severity: string;
  description: string;
  suggestedResolution: string;
}

export const PersonaBehaviorConfiguration: React.FC<PersonaBehaviorConfigurationProps> = ({
  personaId,
  onUpdate,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'behaviors' | 'templates' | 'conflicts' | 'testing'>('behaviors');
  const [behaviors, setBehaviors] = useState<BehaviorScript[]>([]);
  const [templates, setTemplates] = useState<BehaviorTemplate[]>([]);
  const [conflicts, setConflicts] = useState<BehaviorConflict[]>([]);
  const [selectedBehavior, setSelectedBehavior] = useState<BehaviorScript | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    loadPersonaBehaviors();
    loadTemplates();
    loadConflicts();
  }, [personaId]);

  const loadPersonaBehaviors = async () => {
    try {
      // Simulated API call - replace with actual IPC
      const result = await window.electronAPI?.personas?.getBehaviorsByPersona?.(personaId);
      setBehaviors(result || []);
    } catch (error) {
      console.error('Failed to load behaviors:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const result = await window.electronAPI?.personas?.getBehaviorTemplates?.();
      setTemplates(result || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadConflicts = async () => {
    try {
      const result = await window.electronAPI?.personas?.getPersonaConflicts?.(personaId);
      setConflicts(result || []);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      await window.electronAPI?.personas?.createBehaviorFromTemplate?.(templateId, personaId);
      loadPersonaBehaviors();
      onUpdate?.(templateId);
    } catch (error) {
      console.error('Failed to create behavior from template:', error);
    }
  };

  const handleToggleBehavior = async (behaviorId: string, isActive: boolean) => {
    try {
      await window.electronAPI?.personas?.updateBehavior?.(behaviorId, { isActive });
      loadPersonaBehaviors();
      onUpdate?.(behaviorId);
    } catch (error) {
      console.error('Failed to toggle behavior:', error);
    }
  };

  const handleTestBehavior = async (behaviorId: string) => {
    try {
      const testScenarios = [
        {
          description: 'Basic functionality test',
          input: { userInput: 'test input', currentEmotion: 'neutral' },
          expectedOutput: { triggered: true }
        }
      ];
      
      const results = await window.electronAPI?.personas?.testBehavior?.(behaviorId, testScenarios);
      setTestResults(results || []);
      setActiveTab('testing');
    } catch (error) {
      console.error('Failed to test behavior:', error);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'auto' | 'manual') => {
    try {
      await window.electronAPI?.personas?.resolveConflict?.(conflictId, resolution);
      loadConflicts();
      loadPersonaBehaviors();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const renderBehaviorsList = () => (
    <div className="behaviors-list">
      <div className="behaviors-header">
        <h3>Active Behaviors ({behaviors.filter(b => b.isActive).length})</h3>
        <button 
          className="btn-primary"
          onClick={() => setShowEditor(true)}
        >
          Create New Behavior
        </button>
      </div>
      
      <div className="behaviors-grid">
        {behaviors.map(behavior => (
          <div key={behavior.id} className="behavior-card">
            <div className="behavior-header">
              <h4>{behavior.name}</h4>
              <div className="behavior-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={behavior.isActive}
                    onChange={(e) => handleToggleBehavior(behavior.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <p className="behavior-description">{behavior.description}</p>
            
            <div className="behavior-metadata">
              <span className="category-tag">{behavior.category}</span>
              <span className="priority-badge">Priority: {behavior.priority}</span>
            </div>
            
            <div className="behavior-stats">
              <span>Conditions: {behavior.conditions.length}</span>
              <span>Actions: {behavior.actions.length}</span>
            </div>
            
            <div className="behavior-actions">
              <button 
                className="btn-secondary"
                onClick={() => setSelectedBehavior(behavior)}
              >
                Edit
              </button>
              <button 
                className="btn-outline"
                onClick={() => handleTestBehavior(behavior.id)}
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplatesList = () => (
    <div className="templates-list">
      <h3>Behavior Templates</h3>
      <div className="templates-grid">
        {templates.map(template => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <h4>{template.name}</h4>
              <span className="difficulty-badge">{template.difficulty}</span>
            </div>
            
            <p className="template-description">{template.description}</p>
            
            <div className="template-metadata">
              <span className="category-tag">{template.category}</span>
              <div className="template-tags">
                {template.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="template-stats">
              <span>Popularity: {template.popularity}%</span>
            </div>
            
            <button 
              className="btn-primary"
              onClick={() => handleCreateFromTemplate(template.id)}
            >
              Add to Persona
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConflictsList = () => (
    <div className="conflicts-list">
      <h3>Behavior Conflicts ({conflicts.length})</h3>
      {conflicts.length === 0 ? (
        <div className="no-conflicts">
          <p>No conflicts detected! Your behaviors are working harmoniously.</p>
        </div>
      ) : (
        <div className="conflicts-grid">
          {conflicts.map(conflict => (
            <div key={conflict.id} className={`conflict-card severity-${conflict.severity}`}>
              <div className="conflict-header">
                <h4>{conflict.conflictType.replace('_', ' ').toUpperCase()}</h4>
                <span className="severity-badge">{conflict.severity}</span>
              </div>
              
              <p className="conflict-description">{conflict.description}</p>
              <p className="conflict-resolution">{conflict.suggestedResolution}</p>
              
              <div className="conflict-behaviors">
                <strong>Affected Behaviors:</strong>
                {conflict.conflictingBehaviors.map(behaviorId => {
                  const behavior = behaviors.find(b => b.id === behaviorId);
                  return behavior ? (
                    <span key={behaviorId} className="behavior-name">{behavior.name}</span>
                  ) : null;
                })}
              </div>
              
              <div className="conflict-actions">
                <button 
                  className="btn-primary"
                  onClick={() => handleResolveConflict(conflict.id, 'auto')}
                >
                  Auto Resolve
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => handleResolveConflict(conflict.id, 'manual')}
                >
                  Manual Resolution
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTestingPanel = () => (
    <div className="testing-panel">
      <h3>Behavior Testing Results</h3>
      {testResults.length === 0 ? (
        <div className="no-tests">
          <p>No test results available. Select a behavior and click "Test" to run tests.</p>
        </div>
      ) : (
        <div className="test-results">
          {testResults.map((result, index) => (
            <div key={index} className={`test-result ${result.success ? 'success' : 'failure'}`}>
              <div className="test-header">
                <h4>{result.testScenario}</h4>
                <span className="test-status">{result.success ? 'PASS' : 'FAIL'}</span>
              </div>
              
              <div className="test-details">
                <div className="test-timing">
                  Execution Time: {result.executionTime}ms
                </div>
                
                <div className="test-inputs">
                  <strong>Input:</strong>
                  <pre>{JSON.stringify(result.testInputs, null, 2)}</pre>
                </div>
                
                <div className="test-output">
                  <strong>Output:</strong>
                  <pre>{JSON.stringify(result.actualOutput, null, 2)}</pre>
                </div>
                
                {result.notes && (
                  <div className="test-notes">
                    <strong>Notes:</strong> {result.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="persona-behavior-configuration">
      <div className="behavior-header">
        <h2>Behavior Configuration</h2>
        {onClose && (
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="behavior-tabs">
        <button 
          className={`tab ${activeTab === 'behaviors' ? 'active' : ''}`}
          onClick={() => setActiveTab('behaviors')}
        >
          Behaviors ({behaviors.length})
        </button>
        <button 
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates ({templates.length})
        </button>
        <button 
          className={`tab ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          Conflicts {conflicts.length > 0 && `(${conflicts.length})`}
        </button>
        <button 
          className={`tab ${activeTab === 'testing' ? 'active' : ''}`}
          onClick={() => setActiveTab('testing')}
        >
          Testing
        </button>
      </div>

      <div className="behavior-content">
        {activeTab === 'behaviors' && renderBehaviorsList()}
        {activeTab === 'templates' && renderTemplatesList()}
        {activeTab === 'conflicts' && renderConflictsList()}
        {activeTab === 'testing' && renderTestingPanel()}
      </div>
    </div>
  );
};
