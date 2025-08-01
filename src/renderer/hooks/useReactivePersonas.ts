import { useState, useEffect, useCallback } from 'react';
import { PersonaData } from '../../shared/types/persona';
import { hybridDatabaseManager } from '../../main/services/hybrid-database-manager';

interface UseReactivePersonasReturn {
  personas: PersonaData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPersona: (data: Omit<PersonaData, 'id'>) => Promise<string>;
  updatePersona: (id: string, updates: Partial<PersonaData>) => Promise<PersonaData | null>;
  deletePersona: (id: string) => Promise<boolean>;
  activatePersona: (id: string) => Promise<boolean>;
  deactivatePersona: (id: string) => Promise<boolean>;
}

export const useReactivePersonas = (): UseReactivePersonasReturn => {
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPersonas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hybridDatabaseManager.getAllPersonas();
      setPersonas(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load personas';
      setError(errorMessage);
      console.error('Failed to load personas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPersona = useCallback(async (data: Omit<PersonaData, 'id'>): Promise<string> => {
    try {
      const id = await hybridDatabaseManager.createPersona(data);
      // The reactive system will automatically update the personas list
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create persona';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updatePersona = useCallback(async (id: string, updates: Partial<PersonaData>): Promise<PersonaData | null> => {
    try {
      const updatedPersona = await hybridDatabaseManager.updatePersona(id, updates);
      // The reactive system will automatically update the personas list
      return updatedPersona;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update persona';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deletePersona = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await hybridDatabaseManager.deletePersona(id);
      // The reactive system will automatically update the personas list
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete persona';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const activatePersona = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await hybridDatabaseManager.activatePersona(id);
      // The reactive system will automatically update the personas list
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate persona';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deactivatePersona = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await hybridDatabaseManager.deactivatePersona(id);
      // The reactive system will automatically update the personas list
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate persona';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Initialize the database manager and set up reactive subscriptions
  useEffect(() => {
    const initializeAndSubscribe = async () => {
      try {
        // Initialize the hybrid database manager
        await hybridDatabaseManager.initialize();

        // Set up reactive subscription
        const unsubscribe = hybridDatabaseManager.getAllPersonas$().subscribe((data) => {
          setPersonas(data);
          setLoading(false);
        });

        // Initial load
        await loadPersonas();

        return unsubscribe;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize database';
        setError(errorMessage);
        setLoading(false);
        console.error('Failed to initialize database:', err);
      }
    };

    const unsubscribe = initializeAndSubscribe();

    return () => {
      // Cleanup subscription when component unmounts
      unsubscribe.then(unsub => unsub?.());
    };
  }, [loadPersonas]);

  return {
    personas,
    loading,
    error,
    refresh: loadPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    activatePersona,
    deactivatePersona
  };
}; 