// This script will verify the button works when loaded in the chess app
console.log('🧪 Starting button verification...');

// Wait for page to load
setTimeout(() => {
  console.log('📋 Checking page elements...');
  
  // Check if button exists
  const cpuWhiteBtn = document.getElementById('cpuWhiteBtn');
  const cpuBlackBtn = document.getElementById('cpuBlackBtn');
  const boardEl = document.getElementById('board');
  
  console.log('CPU White Button:', cpuWhiteBtn ? '✅ Found' : '❌ Missing');
  console.log('CPU Black Button:', cpuBlackBtn ? '✅ Found' : '❌ Missing');
  console.log('Board Element:', boardEl ? '✅ Found' : '❌ Missing');
  
  // Check if dependencies are loaded
  console.log('Chess.js:', typeof window.Chess !== 'undefined' ? '✅ Loaded' : '❌ Missing');
  console.log('ChessBoard.js:', typeof window.ChessBoard !== 'undefined' ? '✅ Loaded' : '❌ Missing');
  
  if (cpuWhiteBtn && cpuBlackBtn && boardEl && window.Chess && window.ChessBoard) {
    console.log('✅ All components ready for testing');
    
    // Simulate button click
    console.log('🎮 Simulating "Play vs Computer (White)" button click...');
    
    // Click the button
    cpuWhiteBtn.click();
    
    // Check results after a delay
    setTimeout(() => {
      const board = window.ChessBoard.getBoardInstance?.();
      const chess = window.chess;
      
      console.log('After button click results:');
      console.log('- Chess object:', chess ? '✅ Created' : '❌ Not created');
      console.log('- Board object:', board ? '✅ Created' : '❌ Not created');
      console.log('- Lobby hidden:', document.getElementById('lobbyContainer').style.display === 'none' ? '✅ Yes' : '❌ No');
      console.log('- Main container visible:', document.getElementById('mainContainer').style.display === 'grid' ? '✅ Yes' : '❌ No');
      
      if (chess) {
        console.log('- Chess FEN:', chess.fen());
        console.log('- Game mode:', window.gameMode);
        console.log('- Human color:', window.humanColor);
        console.log('- CPU color:', window.cpuColor);
      }
      
      console.log('🎯 Button click verification complete!');
    }, 1000);
    
  } else {
    console.log('❌ Missing components - button may not work');
  }
}, 1000);
