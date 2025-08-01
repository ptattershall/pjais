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

test.describe('Dashboard Integration E2E Tests', () => {
  test.beforeEach(async () => {
    // Navigate to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard-overview"]');
  });

  test('should display system overview', async () => {
    // Verify main dashboard sections
    await expect(page.locator('[data-testid="system-health-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-stats-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-stats-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity-card"]')).toBeVisible();
    
    // Verify system health indicators
    await expect(page.locator('[data-testid="health-status-indicator"]')).toContainText(/healthy|warning|error/);
    await expect(page.locator('[data-testid="uptime-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-usage-display"]')).toBeVisible();
  });

  test('should show real-time metrics', async () => {
    // Create some data to generate metrics
    await page.click('[data-testid="nav-memories"]');
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Test memory for metrics');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '7');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Go back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForSelector('[data-testid="dashboard-overview"]');
    
    // Verify metrics updated
    await expect(page.locator('[data-testid="total-memories-metric"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="memory-activity-chart"]')).toBeVisible();
  });

  test('should navigate between dashboard sections', async () => {
    // Click on memory stats card
    await page.click('[data-testid="memory-stats-card"]');
    
    // Should navigate to memory management
    await expect(page.locator('[data-testid="memory-explorer"]')).toBeVisible();
    
    // Go back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    
    // Click on persona stats card
    await page.click('[data-testid="persona-stats-card"]');
    
    // Should navigate to persona management
    await expect(page.locator('[data-testid="persona-dashboard"]')).toBeVisible();
  });

  test('should display system alerts', async () => {
    // Check for alerts section
    await expect(page.locator('[data-testid="system-alerts-section"]')).toBeVisible();
    
    // If no alerts, should show no alerts message
    await expect(page.locator('[data-testid="no-alerts-message"], [data-testid="alert-item"]')).toBeVisible();
  });

  test('should show performance charts', async () => {
    // Verify performance charts are visible
    await expect(page.locator('[data-testid="performance-chart-container"]')).toBeVisible();
    
    // Check for different chart types
    await expect(page.locator('[data-testid="memory-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-timeline-chart"]')).toBeVisible();
    
    // Verify chart controls
    await expect(page.locator('[data-testid="chart-time-range-selector"]')).toBeVisible();
    
    // Change time range
    await page.selectOption('[data-testid="chart-time-range-selector"]', '24h');
    
    // Charts should update
    await expect(page.locator('[data-testid="memory-usage-chart"]')).toBeVisible();
  });

  test('should display quick actions', async () => {
    // Verify quick actions panel
    await expect(page.locator('[data-testid="quick-actions-panel"]')).toBeVisible();
    
    // Check for expected quick actions
    await expect(page.locator('[data-testid="quick-create-memory"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-create-persona"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-system-health"]')).toBeVisible();
    
    // Test quick create memory
    await page.click('[data-testid="quick-create-memory"]');
    
    // Should open memory creation dialog
    await expect(page.locator('[data-testid="quick-memory-dialog"]')).toBeVisible();
    
    // Close dialog
    await page.click('[data-testid="close-dialog-btn"]');
  });

  test('should refresh data automatically', async () => {
    // Get initial values
    const initialMemoryCount = await page.locator('[data-testid="total-memories-metric"]').textContent();
    
    // Create a new memory in background
    await page.click('[data-testid="nav-memories"]');
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Auto-refresh test memory');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '5');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Go back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    
    // Wait for auto-refresh (assuming 5 second refresh interval)
    await page.waitForTimeout(6000);
    
    // Verify metrics updated
    const updatedMemoryCount = await page.locator('[data-testid="total-memories-metric"]').textContent();
    expect(updatedMemoryCount).not.toBe(initialMemoryCount);
  });

  test('should handle system health status changes', async () => {
    // Check initial health status
    await expect(page.locator('[data-testid="health-status-indicator"]')).toBeVisible();
    
    // Click on health status for details
    await page.click('[data-testid="health-status-indicator"]');
    
    // Should show health details modal
    await expect(page.locator('[data-testid="health-details-modal"]')).toBeVisible();
    
    // Verify health details
    await expect(page.locator('[data-testid="service-health-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-manager-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-manager-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="database-health"]')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-health-modal"]');
  });

  test('should export dashboard data', async () => {
    // Click export button
    await page.click('[data-testid="export-dashboard-btn"]');
    
    // Select export options
    await page.check('[data-testid="export-metrics-checkbox"]');
    await page.check('[data-testid="export-health-checkbox"]');
    await page.selectOption('[data-testid="export-format-select"]', 'json');
    
    // Confirm export
    await page.click('[data-testid="confirm-dashboard-export"]');
    
    // Verify export success
    await expect(page.locator('[data-testid="export-success-notification"]')).toBeVisible();
  });

  test('should customize dashboard layout', async () => {
    // Click customize button
    await page.click('[data-testid="customize-dashboard-btn"]');
    
    // Should show customization panel
    await expect(page.locator('[data-testid="dashboard-customization-panel"]')).toBeVisible();
    
    // Try to reorder widgets
    await page.dragAndDrop(
      '[data-testid="memory-stats-card"]',
      '[data-testid="persona-stats-card"]'
    );
    
    // Apply changes
    await page.click('[data-testid="apply-customization"]');
    
    // Verify layout changed
    await expect(page.locator('[data-testid="dashboard-overview"]')).toBeVisible();
  });

  test('should display recent activity feed', async () => {
    // Create some activity
    await page.click('[data-testid="nav-memories"]');
    await page.click('[data-testid="create-memory-btn"]');
    await page.fill('[data-testid="memory-content-input"]', 'Activity feed test memory');
    await page.selectOption('[data-testid="memory-type-select"]', 'text');
    await page.fill('[data-testid="memory-importance-input"]', '6');
    await page.click('[data-testid="create-memory-submit"]');
    
    // Go back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    
    // Verify activity feed
    await expect(page.locator('[data-testid="recent-activity-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-feed-list"]')).toBeVisible();
    
    // Should show recent memory creation
    await expect(page.locator('[data-testid="activity-item"]').first()).toContainText('memory created');
  });

  test('should show system notifications', async () => {
    // Check for notifications panel
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Click notifications button
    await page.click('[data-testid="notifications-btn"]');
    
    // Should show notifications dropdown
    await expect(page.locator('[data-testid="notifications-dropdown"]')).toBeVisible();
    
    // Mark notification as read
    if (await page.locator('[data-testid="notification-item"]').count() > 0) {
      await page.click('[data-testid="notification-item"]');
      await page.click('[data-testid="mark-as-read-btn"]');
    }
    
    // Close notifications
    await page.click('body');
  });

  test('should search across all data from dashboard', async () => {
    // Use global search
    await page.fill('[data-testid="global-search-input"]', 'test');
    await page.keyboard.press('Enter');
    
    // Should show search results overlay
    await expect(page.locator('[data-testid="global-search-results"]')).toBeVisible();
    
    // Should categorize results
    await expect(page.locator('[data-testid="memory-search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="persona-search-results"]')).toBeVisible();
    
    // Close search
    await page.keyboard.press('Escape');
  });
});