import { useState, useCallback, useMemo } from 'react';
import {
  ValidationError,
  isNotNullish,
  isEmptyString
} from '@shared/utils/validation';

export interface ValidationRule<T> {
  validator: (value: T) => boolean | string;
  message?: string;
  when?: (formData: Record<string, unknown>) => boolean;
}

export interface FieldConfig<T> {
  required?: boolean;
  rules?: ValidationRule<T>[];
  initialValue?: T;
  transform?: (value: T) => T;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  hasError: (field: string) => boolean;
  getError: (field: string) => string | undefined;
  getErrors: (field: string) => string[];
}

export interface FormValidationHook<T extends Record<string, unknown>> {
  values: T;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  touch: (field: keyof T) => void;
  touchAll: () => void;
  validate: (field?: keyof T) => Promise<boolean>;
  validateField: (field: keyof T, value: T[keyof T]) => Promise<string[]>;
  submit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>;
  reset: (values?: Partial<T>) => void;
  hasError: (field: keyof T) => boolean;
  getError: (field: keyof T) => string | undefined;
  getErrors: (field: keyof T) => string[];
}

export function useValidation<T extends Record<string, unknown>>(
  initialValues: T,
  fieldConfigs: Partial<Record<keyof T, FieldConfig<T[keyof T]>>> = {} as Partial<Record<keyof T, FieldConfig<T[keyof T]>>>
): FormValidationHook<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Record<string, string[]>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = useMemo(() => {
    return Object.values(errors).every(fieldErrors => fieldErrors.length === 0);
  }, [errors]);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => {
      const config = fieldConfigs[field];
      const transformedValue = config?.transform ? config.transform(value) : value;
      return { ...prev, [field]: transformedValue };
    });
  }, [fieldConfigs]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({
      ...prev,
      [field]: [error]
    }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrorsState(prev => ({
      ...prev,
      [field]: []
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  const touch = useCallback((field: keyof T) => {
    setTouchedState(prev => ({
      ...prev,
      [field]: true
    }));
  }, []);

  const touchAll = useCallback(() => {
    const touchedFields = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouchedState(touchedFields);
  }, [values]);

  const validateField = useCallback(async (field: keyof T, value: T[keyof T]): Promise<string[]> => {
    const config = fieldConfigs[field];
    const fieldErrors: string[] = [];
    const fieldName = String(field);

    if (config?.required && !isNotNullish(value)) {
      fieldErrors.push(`${fieldName} is required`);
      return fieldErrors;
    }

    if (config?.required && typeof value === 'string' && isEmptyString(value)) {
      fieldErrors.push(`${fieldName} is required`);
      return fieldErrors;
    }

    if (config?.rules) {
      for (const rule of config.rules) {
        if (rule.when && !rule.when(values)) {
          continue;
        }

        const result = await Promise.resolve(rule.validator(value));
        if (result !== true) {
          const errorMessage = typeof result === 'string' ? result : (rule.message || `${fieldName} is invalid`);
          fieldErrors.push(errorMessage);
        }
      }
    }

    return fieldErrors;
  }, [fieldConfigs, values]);

  const validate = useCallback(async (field?: keyof T): Promise<boolean> => {
    if (field) {
      const fieldErrors = await validateField(field, values[field]);
      setErrorsState(prev => ({
        ...prev,
        [field]: fieldErrors
      }));
      return fieldErrors.length === 0;
    }

    const newErrors: Record<string, string[]> = {};
    let hasErrors = false;

    for (const [key, value] of Object.entries(values)) {
      const fieldErrors = await validateField(key as keyof T, value as T[keyof T]);
      newErrors[key] = fieldErrors;
      if (fieldErrors.length > 0) {
        hasErrors = true;
      }
    }

    setErrorsState(newErrors);
    return !hasErrors;
  }, [values, validateField]);

  const submit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    setIsSubmitting(true);
    touchAll();

    try {
      const isFormValid = await validate();
      if (!isFormValid) {
        throw new ValidationError('Form validation failed');
      }

      await onSubmit(values);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Validation error - handled by form validation
      } else {
        // Submit error - handled by error boundary
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, touchAll]);

  const reset = useCallback((newValues?: Partial<T>) => {
    setValuesState({ ...initialValues, ...newValues });
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
  }, [initialValues]);

  const hasError = useCallback((field: keyof T) => {
    return Boolean(errors[String(field)]?.length);
  }, [errors]);

  const getError = useCallback((field: keyof T) => {
    return errors[String(field)]?.[0];
  }, [errors]);

  const getErrors = useCallback((field: keyof T) => {
    return errors[String(field)] || [];
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    touch,
    touchAll,
    validate,
    validateField,
    submit,
    reset,
    hasError,
    getError,
    getErrors
  };
}

// Predefined validation rules
export const validationRules = {
  required: <T>(message?: string): ValidationRule<T> => ({
    validator: (value: T) => isNotNullish(value) && (typeof value !== 'string' || !isEmptyString(value)),
    message: message || 'This field is required'
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validator: (value: string) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validator: (value: string) => !value || value.length <= max,
    message: message || `Must be at most ${max} characters long`
  }),

  email: (message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: message || 'Must be a valid email address'
  }),

  number: (message?: string): ValidationRule<string | number> => ({
    validator: (value: string | number) => {
      if (!value) return true;
      return !isNaN(Number(value));
    },
    message: message || 'Must be a valid number'
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validator: (value: number) => value >= min,
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validator: (value: number) => value <= max,
    message: message || `Must be at most ${max}`
  }),

  pattern: (pattern: RegExp, message?: string): ValidationRule<string> => ({
    validator: (value: string) => !value || pattern.test(value),
    message: message || 'Invalid format'
  }),

  custom: <T>(validator: (value: T) => boolean | string, message?: string): ValidationRule<T> => ({
    validator,
    message
  })
};

// Hook for simple field validation
export function useFieldValidation<T>(
  initialValue: T,
  rules: ValidationRule<T>[] = []
) {
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const validate = useCallback(async (val: T = value): Promise<boolean> => {
    for (const rule of rules) {
      const result = await Promise.resolve(rule.validator(val));
      if (result !== true) {
        const errorMessage = typeof result === 'string' ? result : (rule.message || 'Invalid value');
        setError(errorMessage);
        return false;
      }
    }
    setError(undefined);
    return true;
  }, [rules, value]);

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  const reset = useCallback((newValue?: T) => {
    setValue(newValue ?? initialValue);
    setError(undefined);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    error,
    touched,
    isValid: !error,
    setValue: handleChange,
    setError,
    validate,
    onBlur: handleBlur,
    reset
  };
}
