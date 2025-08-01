import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication } from 'playwright';
import path from 'path';

test('Debug: Can launch Electron app', async () => {
  let electronApp: ElectronApplication | null = null;
  
  try {
    // Path to the built Electron app
    const mainProcessPath = path.join(__dirname, '..', '.vite', 'build', 'main-test.js');
    console.log('Attempting to launch Electron with main process:', mainProcessPath);

    electronApp = await electron.launch({
      args: [mainProcessPath],
      timeout: 10000,
      executablePath: undefined, // Let Playwright find electron
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    console.log('Electron app launched successfully');

    // Just check if we can get windows (don't wait for any specific content)
    const windows = electronApp.windows();
    console.log('Number of windows at launch:', windows.length);

    // Wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 3000));
    const windowsAfter = electronApp.windows();
    console.log('Number of windows after 3s:', windowsAfter.length);

    console.log('Test completed successfully');
    
  } catch (error) {
    console.log('Electron launch failed:', error);
    throw error;
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
  }
}); 