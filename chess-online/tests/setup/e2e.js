/**
 * @fileoverview End-to-end test setup
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { chromium } from 'playwright';

// E2E test utilities
global.e2eTestHelpers = {
  /**
   * Create test browser context
   */
  createTestContext: async () => {
    const browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.E2E_SLOWMO ? parseInt(process.env.E2E_SLOWMO) : 0,
    });
    
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      ignoreHTTPSErrors: true,
    });
    
    return { browser, context };
  },
  
  /**
   * Create mobile browser context
   */
  createMobileContext: async () => {
    const browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.E2E_SLOWMO ? parseInt(process.env.E2E_SLOWMO) : 0,
    });
    
    const context = await browser.newContext({
      ...chromium.devices['iPhone 12'],
      ignoreHTTPSErrors: true,
    });
    
    return { browser, context };
  },
  
  /**
   * Setup test server for E2E tests
   */
  setupTestServer: async () => {
    // This would start your actual server
    // For now, we assume the server is already running
    const serverUrl = process.env.E2E_SERVER_URL || 'http://localhost:3000';
    return serverUrl;
  },
  
  /**
   * Wait for element to be visible
   */
  waitForElement: async (page, selector, timeout = 5000) => {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  },
  
  /**
   * Wait for game to load
   */
  waitForGameLoad: async (page) => {
    await this.waitForElement(page, '.chess-board, #board');
    await this.waitForElement(page, '.game-controls, .controls');
  },
  
  /**
   * Make a chess move
   */
  makeMove: async (page, from, to) => {
    await page.locator(`.square[data-square="${from}"]`).click();
    await page.locator(`.square[data-square="${to}"]`).click();
  },
  
  /**
   * Send chat message
   */
  sendChatMessage: async (page, message) => {
    await page.locator('.chat-input').fill(message);
    await page.locator('.chat-send').click();
  },
  
  /**
   * Get current game state
   */
  getGameState: async (page) => {
    return await page.evaluate(() => {
      // This would depend on your actual game state implementation
      return {
        fen: window.game?.fen(),
        turn: window.game?.turn(),
        gameOver: window.game?.game_over(),
      };
    });
  },
  
  /**
   * Take screenshot on failure
   */
  takeScreenshot: async (page, testName) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-failure-${testName}-${timestamp}.png`;
    await page.screenshot({ path: `test-results/screenshots/${filename}` });
  },
  
  /**
   * Clean up browser context
   */
  cleanupContext: async (browser, context) => {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  },
};

// Global hooks for E2E tests
beforeAll(async () => {
  // Ensure test-results directory exists
  const fs = await import('fs/promises');
  try {
    await fs.mkdir('test-results/screenshots', { recursive: true });
  } catch (error) {
    // Directory already exists
  }
});

// Take screenshot on test failure
afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    await global.e2eTestHelpers.takeScreenshot(page, testInfo.title);
  }
});
