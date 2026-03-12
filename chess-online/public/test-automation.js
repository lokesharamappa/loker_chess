// Automated test script for chess functionality
// This script will run in the browser console to verify all features work

class ChessTester {
  constructor() {
    this.tests = [];
    this.currentTest = 0;
    this.results = [];
  }

  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runTests() {
    console.log('🧪 Starting Chess Board Tests...');
    console.log('='.repeat(50));

    for (let i = 0; i < this.tests.length; i++) {
      this.currentTest = i;
      const test = this.tests[i];
      
      console.log(`\n📋 Test ${i + 1}/${this.tests.length}: ${test.name}`);
      
      try {
        const startTime = Date.now();
        await test.testFn();
        const duration = Date.now() - startTime;
        
        this.results.push({ name: test.name, status: 'PASS', duration });
        console.log(`✅ PASS (${duration}ms)`);
        
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ FAIL: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    return failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertExists(element, name) {
    this.assert(element !== null, `${name} should exist`);
  }

  assertFunction(func, name) {
    this.assert(typeof func === 'function', `${name} should be a function`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create test instance
const tester = new ChessTester();

// Test 1: Check dependencies are loaded
tester.addTest('Dependencies Check', () => {
  tester.assert(typeof $ !== 'undefined', 'jQuery should be loaded');
  tester.assertFunction(window.Chess, 'Chess.js should be loaded');
  tester.assertFunction(window.ChessBoard, 'ChessBoard.js should be loaded');
  tester.assertExists(document.getElementById('board'), 'Board element should exist');
});

// Test 2: Create board
tester.addTest('Board Creation', () => {
  // Click create board button
  const createBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Create Board')
  );
  tester.assertExists(createBtn, 'Create Board button should exist');
  createBtn.click();
  
  return tester.sleep(1000).then(() => {
    // Check if board was created
    tester.assert(window.board !== null, 'Board object should be created');
    tester.assert(window.chess !== null, 'Chess object should be created');
    tester.assert(window.chess.fen() === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
      'Initial position should be standard chess starting position');
  });
});

// Test 3: Start CPU game as White
tester.addTest('Start CPU Game (White)', () => {
  const cpuWhiteBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Play vs CPU (White)')
  );
  tester.assertExists(cpuWhiteBtn, 'CPU White button should exist');
  cpuWhiteBtn.click();
  
  return tester.sleep(500).then(() => {
    tester.assert(window.gameMode === 'cpu', 'Game mode should be CPU');
    tester.assert(window.humanColor === 'w', 'Human should be White');
    tester.assert(window.cpuColor === 'b', 'CPU should be Black');
  });
});

// Test 4: Make a legal move
tester.addTest('Make Legal Move', () => {
  // Make move e2-e4 (pawn forward 2 squares)
  const move = window.chess.move({ from: 'e2', to: 'e4' });
  tester.assert(move !== null, 'Move e2-e4 should be legal');
  tester.assert(move.san === 'e4', 'Move notation should be e4');
  
  // Update board position
  window.board.position(window.chess.fen());
  
  return tester.sleep(500).then(() => {
    tester.assert(window.chess.turn() === 'b', 'It should be Black\'s turn');
  });
});

// Test 5: CPU should respond
tester.addTest('CPU Response', async () => {
  // Wait for CPU to move (should be automatic)
  await tester.sleep(2000);
  
  tester.assert(window.chess.turn() === 'w', 'It should be White\'s turn again');
  tester.assert(window.chess.history().length >= 2, 'There should be at least 2 moves in history');
  
  const moves = window.chess.history();
  console.log('Move history:', moves);
});

// Test 6: Check game over detection
tester.addTest('Game Over Detection', () => {
  // Test check detection
  const inCheck = window.chess.in_check();
  console.log('Current position in check:', inCheck);
  
  // Test game over functions exist
  tester.assertFunction(window.chess.in_checkmate, 'in_checkmate should be a function');
  tester.assertFunction(window.chess.in_draw, 'in_draw should be a function');
  tester.assertFunction(window.chess.in_stalemate, 'in_stalemate should be a function');
});

// Test 7: Reset and start CPU game as Black
tester.addTest('Start CPU Game (Black)', () => {
  // Reset game
  window.chess.reset();
  window.board.position(window.chess.fen());
  
  const cpuBlackBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Play vs CPU (Black)')
  );
  tester.assertExists(cpuBlackBtn, 'CPU Black button should exist');
  cpuBlackBtn.click();
  
  return tester.sleep(1500).then(() => {
    tester.assert(window.gameMode === 'cpu', 'Game mode should be CPU');
    tester.assert(window.humanColor === 'b', 'Human should be Black');
    tester.assert(window.cpuColor === 'w', 'CPU should be White');
    tester.assert(window.chess.turn() === 'b', 'It should be Black\'s turn (CPU moved first)');
    tester.assert(window.chess.history().length === 1, 'CPU should have made first move');
  });
});

// Test 8: Test drag and drop functionality
tester.addTest('Drag and Drop Setup', () => {
  // Test that drag handlers are set up
  const cfg = window.board ? window.board.cfg : null;
  tester.assert(cfg !== null, 'Board configuration should exist');
  tester.assertFunction(cfg.onDragStart, 'onDragStart should be a function');
  tester.assertFunction(cfg.onDrop, 'onDrop should be a function');
  tester.assertFunction(cfg.onSnapEnd, 'onSnapEnd should be a function');
});

// Run all tests
console.log('🚀 Chess Board Test Suite Ready!');
console.log('To run tests, open the browser console and type: tester.runTests()');
console.log('Or simply wait for automatic test execution...');

// Auto-run tests after page loads
setTimeout(() => {
  tester.runTests();
}, 2000);

// Make tester available globally
window.tester = tester;
