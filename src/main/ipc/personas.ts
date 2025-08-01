import { PersonaManager } from '../services/persona-manager';
import { PersonaData } from '../../shared/types/persona';

export const createPersona = (personaManager: PersonaManager) => {
  return (event: any, data: PersonaData) => personaManager.create(data);
};

export const updatePersona = (personaManager: PersonaManager) => {
  return (event: any, id: string, updates: Partial<PersonaData>) =>
    personaManager.update(id, updates);
};

export const deletePersona = (personaManager: PersonaManager) => {
  return (event: any, id: string) => personaManager.delete(id);
};

export const getPersona = (personaManager: PersonaManager) => {
  return (event: any, id: string) => personaManager.get(id);
};

export const listPersonas = (personaManager: PersonaManager) => {
  return () => personaManager.list();
};