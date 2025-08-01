/**
 * Comprehensive validation utilities for null/undefined checks and data validation
 */

// Type guards
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function isEmptyString(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isEmptyArray<T>(value: T[] | null | undefined): boolean {
  return !value || value.length === 0;
}

export function isEmptyObject(value: Record<string, unknown> | null | undefined): boolean {
  return !value || Object.keys(value).length === 0;
}

// Safe accessors
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}

export function safeGetDeep<T>(obj: T | null | undefined, path: string): unknown {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  
  return current;
}

export function safeArrayGet<T>(arr: T[] | null | undefined, index: number): T | undefined {
  if (!arr || index < 0 || index >= arr.length) return undefined;
  return arr[index];
}

export function safeFind<T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T | undefined {
  if (!arr) return undefined;
  return arr.find(predicate);
}

export function safeFindIndex<T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): number {
  if (!arr) return -1;
  return arr.findIndex(predicate);
}

export function safeFilter<T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!arr) return [];
  return arr.filter(predicate);
}

export function safeMap<T, U>(
  arr: T[] | null | undefined,
  mapper: (item: T, index: number) => U
): U[] {
  if (!arr) return [];
  return arr.map(mapper);
}

// Validation functions
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): value is T {
  if (!isNotNullish(value)) {
    throw new Error(`${fieldName} is required`);
  }
  return true;
}

export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): value is string {
  if (!isString(value)) {
    throw new Error(`${fieldName} must be a string`);
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must be at least ${options.minLength} characters long`);
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must be at most ${options.maxLength} characters long`);
  }
  
  if (options?.pattern && !options.pattern.test(value)) {
    throw new Error(`${fieldName} does not match the required pattern`);
  }
  
  return true;
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean }
): value is number {
  if (!isNumber(value)) {
    throw new Error(`${fieldName} must be a number`);
  }
  
  if (options?.min !== undefined && value < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined && value > options.max) {
    throw new Error(`${fieldName} must be at most ${options.max}`);
  }
  
  if (options?.integer && !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  
  return true;
}

export function validateArray<T>(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; itemValidator?: (item: unknown) => boolean }
): value is T[] {
  if (!isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (options?.minLength && value.length < options.minLength) {
    throw new Error(`${fieldName} must have at least ${options.minLength} items`);
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    throw new Error(`${fieldName} must have at most ${options.maxLength} items`);
  }
  
  if (options?.itemValidator) {
    for (let i = 0; i < value.length; i++) {
      if (!options.itemValidator(value[i])) {
        throw new Error(`${fieldName}[${i}] is invalid`);
      }
    }
  }
  
  return true;
}

export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  fieldName: string,
  schema?: Record<keyof T, (value: unknown) => boolean>
): value is T {
  if (!isObject(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  
  if (schema) {
    for (const [key, validator] of Object.entries(schema)) {
      if (!validator(value[key])) {
        throw new Error(`${fieldName}.${key} is invalid`);
      }
    }
  }
  
  return true;
}

// Safe transformation functions
export function safeParseInt(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value || isEmptyString(value)) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function safeParseFloat(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value || isEmptyString(value)) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function safeParseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value || isEmptyString(value)) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (isString(value)) return value;
  if (isNumber(value) || isBoolean(value)) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Null-safe operations
export function nullSafeEquals<T>(a: T | null | undefined, b: T | null | undefined): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return a === b;
}

export function nullSafeCompare<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  compareFn: (a: T, b: T) => number
): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  return compareFn(a, b);
}

export function coalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  return values.find(isNotNullish);
}

export function defaultValue<T>(value: T | null | undefined, defaultVal: T): T {
  return isNotNullish(value) ? value : defaultVal;
}

// Error handling helpers
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function wrapValidation<T>(
  fn: () => T,
  errorMessage?: string
): { success: true; data: T } | { success: false; error: Error } {
  try {
    return { success: true, data: fn() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(errorMessage || 'Validation failed')
    };
  }
}

// Advanced validation patterns
export function validateMemoryEntity(value: unknown): boolean {
  if (!isObject(value)) return false;
  
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.id) &&
    isString(obj.type) &&
    isString(obj.personaId) &&
    isNotNullish(obj.content) &&
    isString(obj.memoryTier) &&
    isNumber(obj.importance)
  );
}

export function validatePersonaData(value: unknown): boolean {
  if (!isObject(value)) return false;
  
  const obj = value as Record<string, unknown>;
  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isString(obj.description) &&
    isObject(obj.personality) &&
    isObject(obj.memoryConfig) &&
    isObject(obj.behavior)
  );
}

export function validateId(value: unknown): boolean {
  return isString(value) && value.length > 0;
}

export function validateEmail(value: unknown): boolean {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function validateUrl(value: unknown): boolean {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateDate(value: unknown): boolean {
  if (!isString(value) && !isNumber(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}