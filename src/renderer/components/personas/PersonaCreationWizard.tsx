import React, { useState } from 'react';
import { z } from 'zod';
import { PersonaData } from '@shared/types/persona';
import { PersonalityTemplate, PERSONALITY_TEMPLATES, TEMPLATE_CATEGORIES } from '@shared/types/personality-templates';

interface PersonaCreationWizardProps {
  onComplete: (persona: Partial<PersonaData>) => Promise<void>;
  onCancel: () => void;
}

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: '📝' },
  { id: 'personality', title: 'Personality Setup', icon: '🧠' },
  { id: 'memory', title: 'Memory Configuration', icon: '💾' },
  { id: 'privacy', title: 'Privacy Settings', icon: '🔒' },
  { id: 'review', title: 'Review & Create', icon: '✅' },
];

const BasicInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
});

export const PersonaCreationWizard: React.FC<PersonaCreationWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Partial<PersonaData>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<PersonalityTemplate | null>(null);

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, WIZARD_STEPS.length - 1));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const handleStepSubmit = (data: any) => {
    const updatedData = { ...wizardData, ...data };
    setWizardData(updatedData);

    if (currentStep === WIZARD_STEPS.length - 1) {
      onComplete(updatedData);
    } else {
      nextStep();
    }
  };

  const renderStepContent = () => {
    const props = {
      onSubmit: handleStepSubmit,
      onCancel: currentStep === 0 ? onCancel : prevStep,
      initialData: wizardData,
    };

    switch (currentStep) {
      case 0:
        return <BasicInfoStep {...props} />;
      case 1:
        return (
          <PersonalityStep
            {...props}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
          />
        );
      case 2:
        return <MemoryConfigStep {...props} />;
      case 3:
        return <PrivacyStep {...props} />;
      case 4:
        return <ReviewStep {...props} personaData={wizardData} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header with steps */}
        <div className="border-b border-gray-600 p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Create New Persona</h2>
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index <= currentStep ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  {index < currentStep ? '✓' : step.icon}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:inline">{step.title}</span>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-blue-400' : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

// Basic Info Step
const BasicInfoStep: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData: Partial<PersonaData>;
}> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      BasicInfoSchema.parse(formData);
      setErrors({});
      onSubmit(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Basic Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Persona Name *
        </label>
        <input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter a name for your persona"
        />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Briefly describe your persona's purpose or characteristics"
        />
        {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  );
};

// Personality Step
const PersonalityStep: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  selectedTemplate: PersonalityTemplate | null;
  onTemplateSelect: (template: PersonalityTemplate | null) => void;
  initialData: Partial<PersonaData>;
}> = ({ onSubmit, onCancel, selectedTemplate, onTemplateSelect, initialData }) => {
  const [useTemplate, setUseTemplate] = useState(!!initialData.templateId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useTemplate && selectedTemplate) {
      onSubmit({
        templateId: selectedTemplate.id,
        personalityProfile: selectedTemplate.personalityProfile,
      });
    } else {
      onSubmit({
        personalityProfile: {
          bigFive: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50,
          },
          customTraits: {},
          dominantTraits: [],
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Personality Setup</h3>
      
      <div className="space-y-4">
        <label className="flex items-center">
          <input
            type="radio"
            checked={useTemplate}
            onChange={() => setUseTemplate(true)}
            className="mr-3"
          />
          <span className="text-white">Use a personality template</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="radio"
            checked={!useTemplate}
            onChange={() => setUseTemplate(false)}
            className="mr-3"
          />
          <span className="text-white">Create custom personality</span>
        </label>
      </div>

      {useTemplate && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-white">Choose a Template</h4>
          <div className="grid gap-4 max-h-60 overflow-y-auto">
            {PERSONALITY_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => onTemplateSelect(template)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-600 bg-opacity-20'
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <h5 className="font-semibold text-white">{template.name}</h5>
                <p className="text-sm text-gray-300 mt-1">{template.description}</p>
                <div className="flex items-center mt-2">
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                    {TEMPLATE_CATEGORIES[template.category].icon} {TEMPLATE_CATEGORIES[template.category].name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

             <div className="flex justify-between">
         <button
           type="button"
           onClick={onCancel}
           className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
         >
           Back
         </button>
         <button
           type="submit"
           className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
         >
           Next
         </button>
       </div>
     </form>
   );
 };

// Memory Config Step
const MemoryConfigStep: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData: Partial<PersonaData>;
}> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    maxMemories: initialData.memoryConfiguration?.maxMemories || 1000,
    memoryImportanceThreshold: initialData.memoryConfiguration?.memoryImportanceThreshold || 50,
    autoOptimize: initialData.memoryConfiguration?.autoOptimize ?? true,
    retentionPeriod: initialData.memoryConfiguration?.retentionPeriod || 90,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ memoryConfiguration: formData });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Memory Configuration</h3>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Maximum Memories
          </label>
          <input
            type="number"
            min="100"
            max="10000"
            value={formData.maxMemories}
            onChange={(e) => setFormData({ ...formData, maxMemories: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Importance Threshold (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.memoryImportanceThreshold}
            onChange={(e) => setFormData({ ...formData, memoryImportanceThreshold: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Retention Period (days)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={formData.retentionPeriod}
            onChange={(e) => setFormData({ ...formData, retentionPeriod: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.autoOptimize}
              onChange={(e) => setFormData({ ...formData, autoOptimize: e.target.checked })}
              className="mr-3"
            />
            <span className="text-white">Auto-optimize memories</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  );
};

// Privacy Step
const PrivacyStep: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData: Partial<PersonaData>;
}> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    dataCollection: initialData.privacySettings?.dataCollection ?? true,
    analyticsEnabled: initialData.privacySettings?.analyticsEnabled ?? false,
    allowPersonalityAnalysis: initialData.privacySettings?.allowPersonalityAnalysis ?? true,
    memoryRetention: initialData.privacySettings?.memoryRetention ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ privacySettings: formData });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Privacy Settings</h3>
      
      <div className="space-y-4">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={formData.dataCollection}
            onChange={(e) => setFormData({ ...formData, dataCollection: e.target.checked })}
            className="mr-3 mt-1"
          />
          <div>
            <span className="text-white font-medium">Allow data collection</span>
            <p className="text-sm text-gray-400">Enable collection of interaction data to improve persona responses</p>
          </div>
        </label>
        
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={formData.analyticsEnabled}
            onChange={(e) => setFormData({ ...formData, analyticsEnabled: e.target.checked })}
            className="mr-3 mt-1"
          />
          <div>
            <span className="text-white font-medium">Enable analytics</span>
            <p className="text-sm text-gray-400">Allow anonymous usage analytics for service improvement</p>
          </div>
        </label>
        
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={formData.allowPersonalityAnalysis}
            onChange={(e) => setFormData({ ...formData, allowPersonalityAnalysis: e.target.checked })}
            className="mr-3 mt-1"
          />
          <div>
            <span className="text-white font-medium">Allow personality analysis</span>
            <p className="text-sm text-gray-400">Enable personality trait analysis and recommendations</p>
          </div>
        </label>
        
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={formData.memoryRetention}
            onChange={(e) => setFormData({ ...formData, memoryRetention: e.target.checked })}
            className="mr-3 mt-1"
          />
          <div>
            <span className="text-white font-medium">Enable memory retention</span>
            <p className="text-sm text-gray-400">Allow persona to retain memories across sessions</p>
          </div>
        </label>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  );
};

// Review Step
const ReviewStep: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  personaData: Partial<PersonaData>;
}> = ({ onSubmit, onCancel, personaData }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Review & Create</h3>
      
      <div className="bg-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="text-lg font-medium text-white mb-2">Basic Information</h4>
          <p className="text-gray-300"><strong>Name:</strong> {personaData.name}</p>
          {personaData.description && (
            <p className="text-gray-300"><strong>Description:</strong> {personaData.description}</p>
          )}
        </div>
        
        <div>
          <h4 className="text-lg font-medium text-white mb-2">Personality</h4>
          {personaData.templateId ? (
            <p className="text-gray-300">
              <strong>Template:</strong> {PERSONALITY_TEMPLATES.find(t => t.id === personaData.templateId)?.name}
            </p>
          ) : (
            <p className="text-gray-300">Custom personality configuration</p>
          )}
        </div>
        
        <div>
          <h4 className="text-lg font-medium text-white mb-2">Memory Configuration</h4>
          <p className="text-gray-300">
            <strong>Max Memories:</strong> {personaData.memoryConfiguration?.maxMemories || 1000}
          </p>
          <p className="text-gray-300">
            <strong>Auto-optimize:</strong> {personaData.memoryConfiguration?.autoOptimize ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        
        <div>
          <h4 className="text-lg font-medium text-white mb-2">Privacy Settings</h4>
          <p className="text-gray-300">
            <strong>Data Collection:</strong> {personaData.privacySettings?.dataCollection ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-gray-300">
            <strong>Analytics:</strong> {personaData.privacySettings?.analyticsEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Create Persona
        </button>
      </div>
    </form>
  );
}; 