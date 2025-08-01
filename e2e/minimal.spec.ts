import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication } from 'playwright';
import path from 'path';
import fs from 'fs';

test('Minimal: Create test main.js with window only', async () => {
  // Create a minimal main.js for testing
  const minimalMain = `
const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('Minimal test main process starting...');

app.on('ready', () => {
  console.log('App ready event fired');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  
  console.log('BrowserWindow created');
  
  // Load a simple HTML content
  win.loadURL('data:text/html,<html><head><title>Test App</title></head><body><h1>Test Window</h1></body></html>');
  
  console.log('Window content loaded');
});

app.on('window-all-closed', () => {
  app.quit();
});

console.log('Main process setup complete');
`;

  const testMainPath = path.join(__dirname, '..', 'test-main.js');
  fs.writeFileSync(testMainPath, minimalMain);

  let electronApp: ElectronApplication | null = null;
  
  try {
    console.log('Attempting to launch minimal Electron app...');

    electronApp = await electron.launch({
      args: [testMainPath],
      timeout: 10000,
    });

    console.log('Minimal Electron app launched');

    // Wait for window to appear
    const page = await electronApp.firstWindow();
    console.log('Got first window!');

    // Check basic properties
    const title = await page.title();
    console.log('Window title:', title);
    expect(title).toBe('Test App');

    const h1Text = await page.locator('h1').textContent();
    console.log('H1 text:', h1Text);
    expect(h1Text).toBe('Test Window');

    console.log('Minimal test completed successfully!');
    
  } catch (error) {
    console.error('Minimal Electron launch failed:', error);
    throw error;
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
    // Clean up test file
    try {
      fs.unlinkSync(testMainPath);
    } catch (err) {
      console.warn('Could not clean up test file:', err);
    }
  }
}); 