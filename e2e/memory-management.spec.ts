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

test.describe('Memory Management E2E Tests', () => {
  test.beforeEach(async () => {
    // Navigate to memories page
    await page.click('[data-testid="nav-memories"]');
    await page.waitForSelector('[data-testid="memory-explorer"]');
  });

  test('should create a new memory', async () => {
    // Click create memory button
    await page.click('[data-testid="create-memory-btn"]');
    
    // Fill memory creation form
    await page.fill('[data-testid="memory-content-input"]', 'Remember to follow up on the project proposal');
    await page.selectOption('[data-testid="memory-type-select"]', 'task');
    await page.fill('[data-testid="memory-importance-input"]', '8');
    await page.fill('[data-testid="memory-tags-input"]', 'project, proposal, follow-up');
    
    // Submit form
    await page.click('[data-testid="create-memory-submit"]');
    
    // Verify memory was created
    await expect(page.locator('[data-testid="memory-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]').first()).toContainText('Remember to follow up on the project proposal');
  });

  test('should search memories', async () => {
    // Create test memories
    const memories = [
      { content: 'JavaScript best practices for performance', type: 'knowledge', importance: 7 },
      { content: 'Python data analysis techniques', type: 'knowledge', importance: 6 },
      { content: 'Meeting with client about JavaScript project', type: 'conversation', importance: 8 }
    ];
    
    for (const memory of memories) {
      await page.click('[data-testid="create-memory-btn"]');
      await page.fill('[data-testid="memory-content-input"]', memory.content);
      await page.selectOption('[data-testid="memory-type-select"]', memory.type);
      await page.fill('[data-testid="memory-importance-input"]', memory.importance.toString());
      await page.click('[data-testid="create-memory-submit"]');
      await page.waitForSelector(`[data-testid="memory-card"]:has-text("${memory.content.substring(0, 20)}")`);
    }
    
    // Search for JavaScript memories
    await page.fill('[data-testid="memory-search-input"]', 'JavaScript');
    await page.keyboard.press('Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="memory-card"]:has-text("JavaScript best practices")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("JavaScript project")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Python data analysis")')).not.toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="memory-search-input"]', '');
    await page.keyboard.press('Enter');
    
    // Verify all memories are visible again
    await expect(page.locator('[data-testid="memory-card"]:has-text("JavaScript best practices")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Python data analysis")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("JavaScript project")')).toBeVisible();
  });

  test('should use advanced search filters', async () => {
    // Create memories with different properties
    const memories = [
      { content: 'High importance memory', type: 'task', importance: 9, tags: 'urgent, priority' },
      { content: 'Medium importance memory', type: 'note', importance: 5, tags: 'general' },
      { content: 'Low importance memory', type: 'idea', importance: 2, tags: 'future' }
    ];
    
    for (const memory of memories) {
      await page.click('[data-testid="create-memory-btn"]');
      await page.fill('[data-testid="memory-content-input"]', memory.content);
      await page.selectOption('[data-testid="memory-type-select"]', memory.type);
      await page.fill('[data-testid="memory-importance-input"]', memory.importance.toString());
      await page.fill('[data-testid="memory-tags-input"]', memory.tags);
      await page.click('[data-testid="create-memory-submit"]');
      await page.waitForSelector(`[data-testid="memory-card"]:has-text("${memory.content.substring(0, 20)}")`);
    }
    
    // Open advanced search
    await page.click('[data-testid="advanced-search-btn"]');
    
    // Filter by importance range
    await page.fill('[data-testid="importance-min-input"]', '7');
    await page.fill('[data-testid="importance-max-input"]', '10');
    await page.click('[data-testid="apply-filters-btn"]');
    
    // Verify only high importance memory is visible
    await expect(page.locator('[data-testid="memory-card"]:has-text("High importance memory")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Medium importance memory")')).not.toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Low importance memory")')).not.toBeVisible();
    
    // Clear filters
    await page.click('[data-testid="clear-filters-btn"]');
    
    // Verify all memories are visible
    await expect(page.locator('[data-testid="memory-card"]:has-text("High importance memory")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Medium importance memory")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Low importance memory")')).toBeVisible();
  });

  test('should manage memory tiers', async () => {
    // Create a memory
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Memory for tier testing');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '6');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Wait for memory to appear
    await page.waitForSelector('[data-testid="memory-card"]:has-text("Memory for tier testing")');
    
    // Click on memory to view details
    await page.click('[data-testid="memory-card"]:has-text("Memory for tier testing")');
    
    // Verify memory details panel
    await expect(page.locator('[data-testid="memory-details-panel"]')).toBeVisible();
    
    // Check current tier
    await expect(page.locator('[data-testid="memory-tier-badge"]')).toContainText('cold');
    
    // Promote to active tier
    await page.click('[data-testid="promote-to-active-btn"]');
    
    // Verify tier changed
    await expect(page.locator('[data-testid="memory-tier-badge"]')).toContainText('active');
    
    // Demote to archived tier
    await page.click('[data-testid="demote-to-archived-btn"]');
    
    // Verify tier changed
    await expect(page.locator('[data-testid="memory-tier-badge"]')).toContainText('archived');
  });

  test('should edit memory content', async () => {
    // Create a memory
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Original memory content');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '5');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Wait for memory to appear
    await page.waitForSelector('[data-testid="memory-card"]:has-text("Original memory content")');
    
    // Click edit button
    await page.click('[data-testid="memory-card"]:has-text("Original memory content") [data-testid="edit-memory-btn"]');
    
    // Update content
    await page.fill('[data-testid="memory-content-input"]', 'Updated memory content');
    await page.fill('[data-testid="memory-importance-input"]', '7');
    
    // Submit changes
    await page.click('[data-testid="update-memory-submit"]');
    
    // Verify changes
    await expect(page.locator('[data-testid="memory-card"]:has-text("Updated memory content")')).toBeVisible();
    await expect(page.locator('[data-testid="memory-card"]:has-text("Original memory content")')).not.toBeVisible();
  });

  test('should delete memory', async () => {
    // Create a memory to delete
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Memory to be deleted');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '3');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Wait for memory to appear
    await page.waitForSelector('[data-testid="memory-card"]:has-text("Memory to be deleted")');
    
    // Click delete button
    await page.click('[data-testid="memory-card"]:has-text("Memory to be deleted") [data-testid="delete-memory-btn"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');
    
    // Verify memory is gone
    await expect(page.locator('[data-testid="memory-card"]:has-text("Memory to be deleted")')).not.toBeVisible();
  });

  test('should create memory relationships', async () => {
    // Create two memories
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'First related memory');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '6');
    await page.click('[data-testid="create-memory-submit"]');
    
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Second related memory');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '6');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Wait for memories to appear
    await page.waitForSelector('[data-testid="memory-card"]:has-text("First related memory")');
    await page.waitForSelector('[data-testid="memory-card"]:has-text("Second related memory")');
    
    // Select first memory
    await page.click('[data-testid="memory-card"]:has-text("First related memory")');
    
    // Click create relationship button
    await page.click('[data-testid="create-relationship-btn"]');
    
    // Select second memory
    await page.click('[data-testid="memory-card"]:has-text("Second related memory")');
    
    // Set relationship type
    await page.selectOption('[data-testid="relationship-type-select"]', 'related');
    
    // Submit relationship
    await page.click('[data-testid="create-relationship-submit"]');
    
    // Verify relationship was created
    await expect(page.locator('[data-testid="relationship-indicator"]')).toBeVisible();
  });

  test('should view memory timeline', async () => {
    // Create memories over time
    const memories = [
      { content: 'Timeline memory 1', importance: 5 },
      { content: 'Timeline memory 2', importance: 6 },
      { content: 'Timeline memory 3', importance: 7 }
    ];
    
    for (const memory of memories) {
      await page.click('[data-testid="create-memory-btn"]');
      await page.fill('[data-testid="memory-content-input"]', memory.content);
      await page.selectOption('[data-testid="memory-type-select"]', 'text');
      await page.fill('[data-testid="memory-importance-input"]', memory.importance.toString());
      await page.click('[data-testid="create-memory-submit"]');
      await page.waitForSelector(`[data-testid="memory-card"]:has-text("${memory.content}")`);
    }
    
    // Switch to timeline view
    await page.click('[data-testid="timeline-view-btn"]');
    
    // Verify timeline is visible
    await expect(page.locator('[data-testid="memory-timeline"]')).toBeVisible();
    
    // Verify timeline entries
    await expect(page.locator('[data-testid="timeline-entry"]:has-text("Timeline memory 1")')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-entry"]:has-text("Timeline memory 2")')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-entry"]:has-text("Timeline memory 3")')).toBeVisible();
  });

  test('should export memory data', async () => {
    // Create some memories
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Memory for export testing');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '6');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Wait for memory to appear
    await page.waitForSelector('[data-testid="memory-card"]:has-text("Memory for export testing")');
    
    // Click export button
    await page.click('[data-testid="export-memories-btn"]');
    
    // Select export format
    await page.selectOption('[data-testid="export-format-select"]', 'json');
    
    // Confirm export
    await page.click('[data-testid="confirm-export-btn"]');
    
    // Verify export success
    await expect(page.locator('[data-testid="export-success-message"]')).toBeVisible();
  });

  test('should show memory statistics', async () => {
    // Create memories with different properties
    const memories = [
      { content: 'Stat memory 1', type: 'task', importance: 8 },
      { content: 'Stat memory 2', type: 'note', importance: 5 },
      { content: 'Stat memory 3', type: 'idea', importance: 3 }
    ];
    
    for (const memory of memories) {
      await page.click('[data-testid="create-memory-btn"]');
      await page.fill('[data-testid="memory-content-input"]', memory.content);
      await page.selectOption('[data-testid="memory-type-select"]', memory.type);
      await page.fill('[data-testid="memory-importance-input"]', memory.importance.toString());
      await page.click('[data-testid="create-memory-submit"]');
      await page.waitForSelector(`[data-testid="memory-card"]:has-text("${memory.content}")`);
    }
    
    // Click statistics button
    await page.click('[data-testid="memory-stats-btn"]');
    
    // Verify statistics panel
    await expect(page.locator('[data-testid="memory-stats-panel"]')).toBeVisible();
    
    // Check for expected statistics
    await expect(page.locator('[data-testid="total-memories-stat"]')).toContainText('3');
    await expect(page.locator('[data-testid="average-importance-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-distribution-chart"]')).toBeVisible();
  });
});