import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformUtils } from './platform';
import { app } from 'electron';
import { join } from 'path';

// Since we are mocking electron, we need to cast the mocked app
const mockedApp = app as any;

describe('PlatformUtils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should return the correct app data path', () => {
    const expectedPath = '/mock/app-data';
    mockedApp.getPath.mockReturnValue(expectedPath);
    expect(PlatformUtils.getAppDataPath()).toBe(expectedPath);
    expect(mockedApp.getPath).toHaveBeenCalledWith('userData');
  });

  it('should return the correct plugins path', () => {
    const appDataPath = '/mock/app-data';
    mockedApp.getPath.mockReturnValue(appDataPath);
    const expectedPath = join(appDataPath, 'plugins');
    expect(PlatformUtils.getPluginsPath()).toBe(expectedPath);
  });

  it('should return the correct memory path', () => {
    const appDataPath = '/mock/app-data';
    mockedApp.getPath.mockReturnValue(appDataPath);
    const expectedPath = join(appDataPath, 'memory');
    expect(PlatformUtils.getMemoryPath()).toBe(expectedPath);
  });

  it('should return the correct personas path', () => {
    const appDataPath = '/mock/app-data';
    mockedApp.getPath.mockReturnValue(appDataPath);
    const expectedPath = join(appDataPath, 'personas');
    expect(PlatformUtils.getPersonasPath()).toBe(expectedPath);
  });

  it('should return the correct logs path', () => {
    const appDataPath = '/mock/app-data';
    mockedApp.getPath.mockReturnValue(appDataPath);
    const expectedPath = join(appDataPath, 'logs');
    expect(PlatformUtils.getLogsPath()).toBe(expectedPath);
  });

  it('should correctly identify the platform', () => {
    // This test will depend on the OS running the test.
    // We can also mock process.platform to test all cases.
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });
    expect(PlatformUtils.isMac).toBe(true);
    expect(PlatformUtils.isWindows).toBe(false);
    expect(PlatformUtils.isLinux).toBe(false);

    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });
    expect(PlatformUtils.isMac).toBe(false);
    expect(PlatformUtils.isWindows).toBe(true);
    expect(PlatformUtils.isLinux).toBe(false);

    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });
    expect(PlatformUtils.isMac).toBe(false);
    expect(PlatformUtils.isWindows).toBe(false);
    expect(PlatformUtils.isLinux).toBe(true);
  });
}); 