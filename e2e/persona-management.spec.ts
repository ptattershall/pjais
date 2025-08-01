import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch the Electron app
  const mainProcessPath = path.join(__dirname, '..', '.vite', 'build', 'main.js');
  
  electronApp = await electron.launch({
    args: [mainProcessPath],
    timeout: 30000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_IS_DEV: '0'
    }
  });

  // Get the main window
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('Persona Management E2E Tests', () => {
  test.beforeEach(async () => {
    // Navigate to personas page
    await page.click('[data-testid="nav-personas"]');
    await page.waitForSelector('[data-testid="persona-dashboard"]');
  });

  test('should create a new persona', async () => {
    // Click create persona button
    await page.click('[data-testid="create-persona-btn"]');
    
    // Fill persona creation form
    await page.fill('[data-testid="persona-name-input"]', 'Test Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'A helpful assistant for testing');
    
    // Select personality traits
    await page.click('[data-testid="trait-helpful"]');
    await page.click('[data-testid="trait-analytical"]');
    
    // Set temperament
    await page.selectOption('[data-testid="temperament-select"]', 'balanced');
    
    // Submit form
    await page.click('[data-testid="create-persona-submit"]');
    
    // Verify persona was created
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Test Assistant"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Test Assistant"] .persona-description')).toContainText('A helpful assistant for testing');
  });

  test('should edit an existing persona', async () => {
    // First create a persona
    await page.click('[data-testid="create-persona-btn"]');
    await page.fill('[data-testid="persona-name-input"]', 'Editable Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'Original description');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Wait for persona to appear
    await page.waitForSelector('[data-testid="persona-card"][data-persona-name="Editable Assistant"]');
    
    // Click edit button
    await page.click('[data-testid="persona-card"][data-persona-name="Editable Assistant"] [data-testid="edit-persona-btn"]');
    
    // Update description
    await page.fill('[data-testid="persona-description-input"]', 'Updated description');
    
    // Submit changes
    await page.click('[data-testid="update-persona-submit"]');
    
    // Verify changes
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Editable Assistant"] .persona-description')).toContainText('Updated description');
  });

  test('should delete a persona', async () => {
    // Create a persona to delete
    await page.click('[data-testid="create-persona-btn"]');
    await page.fill('[data-testid="persona-name-input"]', 'Deletable Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'Will be deleted');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Wait for persona to appear
    await page.waitForSelector('[data-testid="persona-card"][data-persona-name="Deletable Assistant"]');
    
    // Click delete button
    await page.click('[data-testid="persona-card"][data-persona-name="Deletable Assistant"] [data-testid="delete-persona-btn"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');
    
    // Verify persona is gone
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Deletable Assistant"]')).not.toBeVisible();
  });

  test('should activate and deactivate personas', async () => {
    // Create an inactive persona
    await page.click('[data-testid="create-persona-btn"]');
    await page.fill('[data-testid="persona-name-input"]', 'Toggle Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'For testing activation');
    await page.uncheck('[data-testid="persona-active-checkbox"]');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Wait for persona to appear
    await page.waitForSelector('[data-testid="persona-card"][data-persona-name="Toggle Assistant"]');
    
    // Verify it's inactive
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Toggle Assistant"] .status-chip')).toContainText('Inactive');
    
    // Activate the persona
    await page.click('[data-testid="persona-card"][data-persona-name="Toggle Assistant"] [data-testid="activate-persona-btn"]');
    
    // Verify it's active
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Toggle Assistant"] .status-chip')).toContainText('Active');
    
    // Deactivate the persona
    await page.click('[data-testid="persona-card"][data-persona-name="Toggle Assistant"] [data-testid="deactivate-persona-btn"]');
    
    // Verify it's inactive again
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Toggle Assistant"] .status-chip')).toContainText('Inactive');
  });

  test('should search personas', async () => {
    // Create multiple personas
    const personas = [
      { name: 'Search Test 1', description: 'JavaScript expert' },
      { name: 'Search Test 2', description: 'Python developer' },
      { name: 'Search Test 3', description: 'JavaScript teacher' }
    ];
    
    for (const persona of personas) {
      await page.click('[data-testid="create-persona-btn"]');
      await page.fill('[data-testid="persona-name-input"]', persona.name);
      await page.fill('[data-testid="persona-description-input"]', persona.description);
      await page.click('[data-testid="create-persona-submit"]');
      await page.waitForSelector(`[data-testid="persona-card"][data-persona-name="${persona.name}"]`);
    }
    
    // Search for JavaScript personas
    await page.fill('[data-testid="persona-search-input"]', 'JavaScript');
    await page.keyboard.press('Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 1"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 3"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 2"]')).not.toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="persona-search-input"]', '');
    await page.keyboard.press('Enter');
    
    // Verify all personas are visible again
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 1"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 2"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-card"][data-persona-name="Search Test 3"]')).toBeVisible();
  });

  test('should display persona stats and analytics', async () => {
    // Create a persona
    await page.click('[data-testid="create-persona-btn"]');
    await page.fill('[data-testid="persona-name-input"]', 'Stats Test Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'For testing analytics');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Wait for persona to appear
    await page.waitForSelector('[data-testid="persona-card"][data-persona-name="Stats Test Assistant"]');
    
    // Click on persona to view details
    await page.click('[data-testid="persona-card"][data-persona-name="Stats Test Assistant"]');
    
    // Verify stats panel is visible
    await expect(page.locator('[data-testid="persona-stats-panel"]')).toBeVisible();
    
    // Check for expected stat elements
    await expect(page.locator('[data-testid="memory-count-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-interaction-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="emotional-stability-stat"]')).toBeVisible();
  });

  test('should handle persona validation errors', async () => {
    // Try to create persona with invalid data
    await page.click('[data-testid="create-persona-btn"]');
    
    // Leave name empty and submit
    await page.fill('[data-testid="persona-name-input"]', '');
    await page.fill('[data-testid="persona-description-input"]', 'Valid description');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="name-error-message"]')).toContainText('Name is required');
    
    // Try with name too short
    await page.fill('[data-testid="persona-name-input"]', 'A');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="name-error-message"]')).toContainText('Name must be at least 2 characters');
  });

  test('should sort personas by different criteria', async () => {
    // Create personas with different properties
    const personas = [
      { name: 'Alpha Assistant', description: 'First alphabetically' },
      { name: 'Beta Assistant', description: 'Second alphabetically' },
      { name: 'Gamma Assistant', description: 'Third alphabetically' }
    ];
    
    for (const persona of personas) {
      await page.click('[data-testid="create-persona-btn"]');
      await page.fill('[data-testid="persona-name-input"]', persona.name);
      await page.fill('[data-testid="persona-description-input"]', persona.description);
      await page.click('[data-testid="create-persona-submit"]');
      await page.waitForSelector(`[data-testid="persona-card"][data-persona-name="${persona.name}"]`);
    }
    
    // Sort by name ascending (default)
    await page.selectOption('[data-testid="sort-select"]', 'name');
    await page.selectOption('[data-testid="sort-order-select"]', 'asc');
    
    // Verify order
    const personaCards = await page.locator('[data-testid="persona-card"]').all();
    expect(personaCards.length).toBeGreaterThanOrEqual(3);
    
    // Sort by name descending
    await page.selectOption('[data-testid="sort-order-select"]', 'desc');
    
    // Verify order changed
    const reversedPersonaCards = await page.locator('[data-testid="persona-card"]').all();
    expect(reversedPersonaCards.length).toBeGreaterThanOrEqual(3);
  });

  test('should handle persona export and import', async () => {
    // Create a persona to export
    await page.click('[data-testid="create-persona-btn"]');
    await page.fill('[data-testid="persona-name-input"]', 'Export Test Assistant');
    await page.fill('[data-testid="persona-description-input"]', 'For testing export/import');
    await page.click('[data-testid="trait-helpful"]');
    await page.click('[data-testid="create-persona-submit"]');
    
    // Wait for persona to appear
    await page.waitForSelector('[data-testid="persona-card"][data-persona-name="Export Test Assistant"]');
    
    // Export the persona
    await page.click('[data-testid="persona-card"][data-persona-name="Export Test Assistant"] [data-testid="export-persona-btn"]');
    
    // Verify export dialog
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    
    // Confirm export
    await page.click('[data-testid="confirm-export-btn"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible();
  });
});