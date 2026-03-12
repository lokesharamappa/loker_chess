/**
 * @fileoverview End-to-end tests for Chess Online application
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { test, expect } from '@playwright/test';

test.describe('Chess Online E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chess application
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForSelector('.chess-board, #board');
  });

  test('should load the chess application', async ({ page }) => {
    // Check that the chess board is visible
    await expect(page.locator('.chess-board, #board')).toBeVisible();
    
    // Check that the game controls are present
    await expect(page.locator('.game-controls, .controls')).toBeVisible();
    
    // Check that the chat interface is present
    await expect(page.locator('.chat, #chat')).toBeVisible();
  });

  test('should allow two players to join and play', async ({ context }) => {
    // Create two browser contexts for two players
    const player1Context = await context.newContext();
    const player2Context = await context.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    
    // Both players navigate to the same room
    await player1Page.goto('http://localhost:3000?room=test-room');
    await player2Page.goto('http://localhost:3000?room=test-room');
    
    // Wait for both players to connect
    await player1Page.waitForSelector('.player-indicator.white');
    await player2Page.waitForSelector('.player-indicator.black');
    
    // Player 1 makes a move
    await player1Page.locator('.square[e2]').click();
    await player1Page.locator('.square[e4]').click();
    
    // Wait for the move to be reflected on both boards
    await expect(player1Page.locator('.square[e4].white-piece')).toBeVisible();
    await expect(player2Page.locator('.square[e4].white-piece')).toBeVisible();
    
    // Player 2 responds
    await player2Page.locator('.square[e7]').click();
    await player2Page.locator('.square[e5]').click();
    
    // Verify the move on both boards
    await expect(player1Page.locator('.square[e5].black-piece')).toBeVisible();
    await expect(player2Page.locator('.square[e5].black-piece')).toBeVisible();
    
    // Clean up
    await player1Context.close();
    await player2Context.close();
  });

  test('should handle chat functionality', async ({ context }) => {
    // Create two players
    const player1Context = await context.newContext();
    const player2Context = await context.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    
    // Join the same room
    await player1Page.goto('http://localhost:3000?room=chat-test');
    await player2Page.goto('http://localhost:3000?room=chat-test');
    
    // Wait for connection
    await player1Page.waitForSelector('.player-indicator');
    await player2Page.waitForSelector('.player-indicator');
    
    // Player 1 sends a chat message
    const message = 'Hello from player 1!';
    await player1Page.locator('.chat-input').fill(message);
    await player1Page.locator('.chat-send').click();
    
    // Verify message appears on both players' chat
    await expect(player1Page.locator('.chat-messages')).toContainText(message);
    await expect(player2Page.locator('.chat-messages')).toContainText(message);
    
    // Clean up
    await player1Context.close();
    await player2Context.close();
  });

  test('should handle game ending scenarios', async ({ context }) => {
    const player1Context = await context.newContext();
    const player2Context = await context.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    
    // Join a room
    await player1Page.goto('http://localhost:3000?room=endgame-test');
    await player2Page.goto('http://localhost:3000?room=endgame-test');
    
    // Wait for connection
    await player1Page.waitForSelector('.player-indicator');
    await player2Page.waitForSelector('.player-indicator');
    
    // Player 1 resigns
    await player1Page.locator('.resign-button').click();
    
    // Verify game over message appears
    await expect(player1Page.locator('.game-over')).toBeVisible();
    await expect(player2Page.locator('.game-over')).toBeVisible();
    
    // Verify winner announcement
    await expect(player2Page.locator('.winner-message')).toContainText('Black wins');
    
    // Test restart functionality
    await player1Page.locator('.restart-button').click();
    await player2Page.locator('.restart-button').click();
    
    // Verify game is reset
    await expect(player1Page.locator('.game-over')).not.toBeVisible();
    await expect(player2Page.locator('.game-over')).not.toBeVisible();
    
    // Clean up
    await player1Context.close();
    await player2Context.close();
  });

  test('should handle spectator mode', async ({ context }) => {
    // Create three players (two players + one spectator)
    const contexts = await Promise.all([
      context.newContext(),
      context.newContext(),
      context.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // All join the same room
    await Promise.all(pages.map(page => 
      page.goto('http://localhost:3000?room=spectator-test')
    ));
    
    // Wait for all to connect
    await Promise.all(pages.map(page => 
      page.waitForSelector('.player-indicator')
    ));
    
    // Check that two are players and one is spectator
    const playerIndicators = await Promise.all(pages.map(page =>
      page.locator('.player-indicator').textContent()
    ));
    
    const whiteCount = playerIndicators.filter(text => text?.includes('White')).length;
    const blackCount = playerIndicators.filter(text => text?.includes('Black')).length;
    const spectatorCount = playerIndicators.filter(text => text?.includes('Spectator')).length;
    
    expect(whiteCount).toBe(1);
    expect(blackCount).toBe(1);
    expect(spectatorCount).toBe(1);
    
    // Spectator should not be able to move pieces
    const spectatorPage = pages.find(async (page, index) => {
      const text = await page.locator('.player-indicator').textContent();
      return text?.includes('Spectator');
    });
    
    if (spectatorPage) {
      // Try to make a move as spectator
      await spectatorPage.locator('.square[e2]').click();
      await spectatorPage.locator('.square[e4]').click();
      
      // Move should not be allowed
      await expect(spectatorPage.locator('.move-error')).toBeVisible();
    }
    
    // Clean up
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should handle draw offers', async ({ context }) => {
    const player1Context = await context.newContext();
    const player2Context = await context.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    
    // Join a room
    await player1Page.goto('http://localhost:3000?room=draw-test');
    await player2Page.goto('http://localhost:3000?room=draw-test');
    
    // Wait for connection
    await player1Page.waitForSelector('.player-indicator');
    await player2Page.waitForSelector('.player-indicator');
    
    // Player 1 offers draw
    await player1Page.locator('.draw-button').click();
    
    // Player 2 should see draw offer
    await expect(player2Page.locator('.draw-offer')).toBeVisible();
    
    // Player 2 accepts draw
    await player2Page.locator('.accept-draw').click();
    
    // Game should end in draw
    await expect(player1Page.locator('.game-over')).toBeVisible();
    await expect(player2Page.locator('.game-over')).toBeVisible();
    
    await expect(player1Page.locator('.draw-message')).toBeVisible();
    await expect(player2Page.locator('.draw-message')).toBeVisible();
    
    // Clean up
    await player1Context.close();
    await player2Context.close();
  });

  test('should handle takeback offers', async ({ context }) => {
    const player1Context = await context.newContext();
    const player2Context = await context.newContext();
    
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();
    
    // Join a room
    await player1Page.goto('http://localhost:3000?room=takeback-test');
    await player2Page.goto('http://localhost:3000?room=takeback-test');
    
    // Wait for connection
    await player1Page.waitForSelector('.player-indicator');
    await player2Page.waitForSelector('.player-indicator');
    
    // Make some moves
    await player1Page.locator('.square[e2]').click();
    await player1Page.locator('.square[e4]').click();
    
    await player2Page.locator('.square[e7]').click();
    await player2Page.locator('.square[e5]').click();
    
    // Player 2 offers takeback
    await player2Page.locator('.takeback-button').click();
    
    // Player 1 should see takeback offer
    await expect(player1Page.locator('.takeback-offer')).toBeVisible();
    
    // Player 1 accepts takeback
    await player1Page.locator('.accept-takeback').click();
    
    // Verify the last move was undone
    await expect(player1Page.locator('.square[e5].black-piece')).not.toBeVisible();
    await expect(player2Page.locator('.square[e5].black-piece')).not.toBeVisible();
    
    // But the first move should still be there
    await expect(player1Page.locator('.square[e4].white-piece')).toBeVisible();
    await expect(player2Page.locator('.square[e4].white-piece')).toBeVisible();
    
    // Clean up
    await player1Context.close();
    await player2Context.close();
  });

  test('should handle connection issues gracefully', async ({ page }) => {
    // Simulate connection loss
    await page.goto('http://localhost:3000');
    
    // Wait for initial load
    await page.waitForSelector('.chess-board, #board');
    
    // Simulate network offline
    await page.context().setOffline(true);
    
    // Should show connection status indicator
    await expect(page.locator('.connection-status.offline')).toBeVisible();
    
    // Simulate network recovery
    await page.context().setOffline(false);
    
    // Should reconnect and show online status
    await expect(page.locator('.connection-status.online')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:3000');
    
    // Check that mobile layout is applied
    await expect(page.locator('.mobile-layout, .chess-board')).toBeVisible();
    
    // Check that touch controls work
    await page.locator('.square[e2]').tap();
    await page.locator('.square[e4]').tap();
    
    // Move should be made
    await expect(page.locator('.square[e4].white-piece')).toBeVisible();
  });

  test('should handle invalid moves gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Try to make an invalid move
    await page.locator('.square[e2]').click();
    await page.locator('.square[e5]').click(); // Invalid move
    
    // Should show error message
    await expect(page.locator('.move-error, .illegal-move')).toBeVisible();
    
    // Board should be in original state
    await expect(page.locator('.square[e2].white-piece')).toBeVisible();
    await expect(page.locator('.square[e5].white-piece')).not.toBeVisible();
  });

  test('should maintain game state across page refreshes', async ({ page }) => {
    // Start a game with some moves
    await page.goto('http://localhost:3000?room=persistence-test');
    
    // Make some moves
    await page.locator('.square[e2]').click();
    await page.locator('.square[e4]').click();
    
    // Refresh the page
    await page.reload();
    
    // Wait for reconnection
    await page.waitForSelector('.chess-board, #board');
    
    // Game state should be preserved
    await expect(page.locator('.square[e4].white-piece')).toBeVisible();
  });
});
