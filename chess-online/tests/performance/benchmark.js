/**
 * @fileoverview Performance benchmarks for Chess Online application
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { performance } from 'perf_hooks';
import { Suite } from 'benchmark';
import RoomManager from '../../src/core/RoomManager.js';
import { Chess } from 'chess.js';

/**
 * Performance test suite for Chess Online
 */
class ChessBenchmarks {
  constructor() {
    this.roomManager = new RoomManager();
    this.results = {};
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks() {
    console.log('🚀 Starting Chess Online Performance Benchmarks\n');
    
    await this.benchmarkRoomOperations();
    await this.benchmarkMoveGeneration();
    await this.benchmarkGameStateManagement();
    await this.benchmarkConcurrentConnections();
    await this.benchmarkMemoryUsage();
    
    this.printResults();
  }

  /**
   * Benchmark room operations
   */
  async benchmarkRoomOperations() {
    console.log('📊 Benchmarking Room Operations...');
    
    const suite = new Suite();
    
    // Room creation
    suite.add('Room Creation', () => {
      const roomId = `test-room-${Math.random()}`;
      this.roomManager.getOrCreateRoom(roomId);
    });
    
    // Player addition
    suite.add('Player Addition', () => {
      const roomId = `test-room-${Math.random()}`;
      const room = this.roomManager.getOrCreateRoom(roomId);
      this.roomManager.addPlayer(roomId, `socket-${Math.random()}`);
    });
    
    // Game state retrieval
    suite.add('Game State Retrieval', () => {
      const roomId = `test-room-${Math.random()}`;
      const room = this.roomManager.getOrCreateRoom(roomId);
      this.roomManager.getGameState(room);
    });
    
    // Move execution
    suite.add('Move Execution', () => {
      const roomId = `test-room-${Math.random()}`;
      const room = this.roomManager.getOrCreateRoom(roomId);
      this.roomManager.addPlayer(roomId, 'socket-1');
      this.roomManager.makeMove(roomId, 'socket-1', { from: 'e2', to: 'e4' });
    });
    
    return new Promise((resolve) => {
      suite.on('complete', () => {
        this.results.roomOperations = {
          'Room Creation': suite[0].hz,
          'Player Addition': suite[1].hz,
          'Game State Retrieval': suite[2].hz,
          'Move Execution': suite[3].hz,
        };
        console.log('✅ Room Operations Benchmark Complete\n');
        resolve();
      });
      
      suite.run({ async: true });
    });
  }

  /**
   * Benchmark move generation
   */
  async benchmarkMoveGeneration() {
    console.log('♟️ Benchmarking Move Generation...');
    
    const suite = new Suite();
    
    // Opening position
    suite.add('Opening Position Moves', () => {
      const chess = new Chess();
      chess.moves();
    });
    
    // Middle game position
    suite.add('Middle Game Moves', () => {
      const chess = new Chess('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4');
      chess.moves();
    });
    
    // Complex position
    suite.add('Complex Position Moves', () => {
      const chess = new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
      chess.moves();
    });
    
    // Endgame position
    suite.add('Endgame Position Moves', () => {
      const chess = new Chess('8/8/8/8/8/8/4k3/4K3 w - - 0 1');
      chess.moves();
    });
    
    return new Promise((resolve) => {
      suite.on('complete', () => {
        this.results.moveGeneration = {
          'Opening Position': suite[0].hz,
          'Middle Game': suite[1].hz,
          'Complex Position': suite[2].hz,
          'Endgame Position': suite[3].hz,
        };
        console.log('✅ Move Generation Benchmark Complete\n');
        resolve();
      });
      
      suite.run({ async: true });
    });
  }

  /**
   * Benchmark game state management
   */
  async benchmarkGameStateManagement() {
    console.log('🎮 Benchmarking Game State Management...');
    
    const suite = new Suite();
    
    // FEN parsing
    suite.add('FEN Parsing', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
    
    // Game over detection
    suite.add('Game Over Detection', () => {
      const chess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      chess.is_game_over();
    });
    
    // Check detection
    suite.add('Check Detection', () => {
      const chess = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
      chess.in_check();
    });
    
    // Move validation
    suite.add('Move Validation', () => {
      const chess = new Chess();
      chess.move({ from: 'e2', to: 'e4' });
    });
    
    // Undo operation
    suite.add('Undo Operation', () => {
      const chess = new Chess();
      chess.move('e4');
      chess.move('e5');
      chess.undo();
    });
    
    return new Promise((resolve) => {
      suite.on('complete', () => {
        this.results.gameStateManagement = {
          'FEN Parsing': suite[0].hz,
          'Game Over Detection': suite[1].hz,
          'Check Detection': suite[2].hz,
          'Move Validation': suite[3].hz,
          'Undo Operation': suite[4].hz,
        };
        console.log('✅ Game State Management Benchmark Complete\n');
        resolve();
      });
      
      suite.run({ async: true });
    });
  }

  /**
   * Benchmark concurrent connections simulation
   */
  async benchmarkConcurrentConnections() {
    console.log('🔗 Benchmarking Concurrent Connections...');
    
    const suite = new Suite();
    
    // Simulate 10 concurrent rooms
    suite.add('10 Concurrent Rooms', () => {
      for (let i = 0; i < 10; i++) {
        const roomId = `room-${i}`;
        const room = this.roomManager.getOrCreateRoom(roomId);
        this.roomManager.addPlayer(roomId, `socket-${i}-1`);
        this.roomManager.addPlayer(roomId, `socket-${i}-2`);
      }
    });
    
    // Simulate 100 concurrent rooms
    suite.add('100 Concurrent Rooms', () => {
      for (let i = 0; i < 100; i++) {
        const roomId = `room-${i}`;
        const room = this.roomManager.getOrCreateRoom(roomId);
        this.roomManager.addPlayer(roomId, `socket-${i}-1`);
        this.roomManager.addPlayer(roomId, `socket-${i}-2`);
      }
    });
    
    // Simulate moves in multiple rooms
    suite.add('Moves in 50 Rooms', () => {
      for (let i = 0; i < 50; i++) {
        const roomId = `move-room-${i}`;
        const room = this.roomManager.getOrCreateRoom(roomId);
        this.roomManager.addPlayer(roomId, `socket-${i}-1`);
        this.roomManager.makeMove(roomId, `socket-${i}-1`, { from: 'e2', to: 'e4' });
      }
    });
    
    return new Promise((resolve) => {
      suite.on('complete', () => {
        this.results.concurrentConnections = {
          '10 Concurrent Rooms': suite[0].hz,
          '100 Concurrent Rooms': suite[1].hz,
          'Moves in 50 Rooms': suite[2].hz,
        };
        console.log('✅ Concurrent Connections Benchmark Complete\n');
        resolve();
      });
      
      suite.run({ async: true });
    });
  }

  /**
   * Benchmark memory usage
   */
  async benchmarkMemoryUsage() {
    console.log('💾 Benchmarking Memory Usage...');
    
    const initialMemory = process.memoryUsage();
    
    // Create many rooms and measure memory
    const roomCount = 1000;
    for (let i = 0; i < roomCount; i++) {
      const roomId = `memory-test-${i}`;
      const room = this.roomManager.getOrCreateRoom(roomId);
      this.roomManager.addPlayer(roomId, `socket-${i}-1`);
      this.roomManager.addPlayer(roomId, `socket-${i}-2`);
      
      // Make some moves
      this.roomManager.makeMove(roomId, `socket-${i}-1`, { from: 'e2', to: 'e4' });
      this.roomManager.makeMove(roomId, `socket-${i}-2`, { from: 'e7', to: 'e5' });
    }
    
    const afterCreationMemory = process.memoryUsage();
    
    // Clean up
    this.roomManager.clearAllRooms();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const afterCleanupMemory = process.memoryUsage();
    
    this.results.memoryUsage = {
      'Initial Memory (MB)': Math.round(initialMemory.heapUsed / 1024 / 1024),
      'After Room Creation (MB)': Math.round(afterCreationMemory.heapUsed / 1024 / 1024),
      'After Cleanup (MB)': Math.round(afterCleanupMemory.heapUsed / 1024 / 1024),
      'Memory per Room (KB)': Math.round((afterCreationMemory.heapUsed - initialMemory.heapUsed) / roomCount / 1024),
      'Rooms Created': roomCount,
    };
    
    console.log('✅ Memory Usage Benchmark Complete\n');
  }

  /**
   * Print benchmark results
   */
  printResults() {
    console.log('📈 Performance Benchmark Results');
    console.log('=====================================\n');
    
    Object.entries(this.results).forEach(([category, results]) => {
      console.log(`🏷️ ${category.toUpperCase()}:`);
      console.log('─'.repeat(40));
      
      Object.entries(results).forEach(([test, value]) => {
        if (typeof value === 'number') {
          if (test.includes('Memory')) {
            console.log(`  ${test}: ${value}`);
          } else {
            console.log(`  ${test}: ${value.toFixed(2)} ops/sec`);
          }
        } else {
          console.log(`  ${test}: ${value}`);
        }
      });
      
      console.log('');
    });
    
    // Performance recommendations
    console.log('🎯 Performance Recommendations:');
    console.log('─'.repeat(40));
    
    if (this.results.roomOperations) {
      const moveOps = this.results.roomOperations['Move Execution'];
      if (moveOps < 10000) {
        console.log('⚠️  Move execution could be optimized (target: >10,000 ops/sec)');
      } else {
        console.log('✅ Move execution is well optimized');
      }
    }
    
    if (this.results.memoryUsage) {
      const memoryPerRoom = this.results.memoryUsage['Memory per Room (KB)'];
      if (memoryPerRoom > 100) {
        console.log('⚠️  Memory usage per room is high (target: <100KB)');
      } else {
        console.log('✅ Memory usage per room is efficient');
      }
    }
    
    if (this.results.moveGeneration) {
      const complexMoves = this.results.moveGeneration['Complex Position'];
      if (complexMoves < 5000) {
        console.log('⚠️  Complex position move generation could be improved');
      } else {
        console.log('✅ Move generation is efficient');
      }
    }
    
    console.log('\n🏁 Benchmark Complete!');
  }
}

/**
 * Run benchmarks if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmarks = new ChessBenchmarks();
  benchmarks.runAllBenchmarks().catch(console.error);
}

export default ChessBenchmarks;
