/**
 * @fileoverview Integration tests for Socket.IO handlers
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import RoomManager from '../src/core/RoomManager.js';

describe('Socket.IO Integration Tests', () => {
  let server;
  let io;
  let roomManager;
  let clientSocket;
  let clientSocket2;
  let serverSocket;
  let serverSocket2;

  beforeAll((done) => {
    roomManager = new RoomManager();
    server = createServer();
    io = new Server(server);
    
    // Set up Socket.IO handlers
    setupSocketHandlers(io, roomManager);
    
    server.listen(() => {
      const port = server.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    clientSocket2.close();
    server.close();
  });

  beforeEach((done) => {
    // Wait for both clients to connect
    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };
    
    clientSocket2.on('connect', onConnect);
    if (clientSocket.connected) {
      onConnect();
    }
  });

  afterEach(() => {
    // Clean up rooms
    roomManager.clearAllRooms();
    
    // Disconnect and reconnect for next test
    clientSocket.disconnect();
    clientSocket2.disconnect();
    
    // Reconnect for next test
    return new Promise((resolve) => {
      let reconnectedCount = 0;
      const onReconnect = () => {
        reconnectedCount++;
        if (reconnectedCount === 2) {
          resolve();
        }
      };
      
      clientSocket.on('connect', onReconnect);
      clientSocket2.on('connect', onReconnect);
      clientSocket.connect();
      clientSocket2.connect();
    });
  });

  describe('Room Joining', () => {
    test('should allow player to join room as white', (done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', (data) => {
        expect(data.color).toBe('w');
        expect(data.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(data.gameOver).toBe(false);
        done();
      });
    });

    test('should allow second player to join as black', (done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', (data) => {
          expect(data.color).toBe('b');
          done();
        });
      });
    });

    test('should assign spectator to third player', (done) => {
      const roomId = 'test-room-1';
      const clientSocket3 = Client(`http://localhost:${server.address().port}`);
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          clientSocket3.emit('join', roomId);
          
          clientSocket3.on('init', (data) => {
            expect(data.color).toBe('spectator');
            clientSocket3.close();
            done();
          });
        });
      });
    });

    test('should reject invalid room ID', (done) => {
      clientSocket.emit('join', '');
      
      clientSocket.on('error_message', (message) => {
        expect(message).toBe('Invalid room id');
        done();
      });
    });

    test('should broadcast player updates when someone joins', (done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket.on('players', (data) => {
          expect(data.w).toBe(true);
          expect(data.b).toBe(true);
          done();
        });
      });
    });
  });

  describe('Move Handling', () => {
    beforeEach((done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          done();
        });
      });
    });

    test('should allow valid move from correct player', (done) => {
      const move = { from: 'e2', to: 'e4' };
      
      clientSocket.emit('move', move);
      
      clientSocket.on('move', (data) => {
        expect(data.fen).toContain('4P3');
        expect(data.turn).toBe('b');
        expect(data.gameOver).toBe(false);
        done();
      });
    });

    test('should reject illegal move', (done) => {
      const move = { from: 'e2', to: 'e5' }; // Illegal for white
      
      clientSocket.emit('move', move);
      
      clientSocket.on('illegal_move', (data) => {
        expect(data.from).toBe('e2');
        expect(data.to).toBe('e5');
        done();
      });
    });

    test('should reject move from wrong color', (done) => {
      const move = { from: 'e7', to: 'e5' }; // Black trying to move first
      
      clientSocket2.emit('move', move);
      
      // Should not receive move event, and turn should still be white
      setTimeout(() => {
        // Verify no move was made by checking turn is still white
        const room = roomManager.getRoom('test-room-1');
        expect(room.chess.turn()).toBe('w');
        done();
      }, 100);
    });

    test('should reject move from spectator', (done) => {
      const clientSocket3 = Client(`http://localhost:${server.address().port}`);
      const move = { from: 'e2', to: 'e4' };
      
      clientSocket3.emit('join', 'test-room-1');
      
      clientSocket3.on('init', (data) => {
        if (data.color === 'spectator') {
          clientSocket3.emit('move', move);
          
          // Should not receive move event
          setTimeout(() => {
            const room = roomManager.getRoom('test-room-1');
            expect(room.chess.turn()).toBe('w');
            clientSocket3.close();
            done();
          }, 100);
        }
      });
    });

    test('should broadcast move to all players', (done) => {
      const move = { from: 'e2', to: 'e4' };
      let moveCount = 0;
      
      const onMove = (data) => {
        expect(data.fen).toContain('4P3');
        moveCount++;
        if (moveCount === 2) {
          done();
        }
      };
      
      clientSocket.on('move', onMove);
      clientSocket2.on('move', onMove);
      
      clientSocket.emit('move', move);
    });
  });

  describe('Game Control', () => {
    beforeEach((done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          done();
        });
      });
    });

    test('should handle resignation correctly', (done) => {
      clientSocket.emit('resign');
      
      clientSocket.on('game_over', (data) => {
        expect(data.reason).toBe('resign');
        expect(data.winner).toBe('b');
        done();
      });
    });

    test('should reject resignation from spectator', (done) => {
      const clientSocket3 = Client(`http://localhost:${server.address().port}`);
      
      clientSocket3.emit('join', 'test-room-1');
      
      clientSocket3.on('init', (data) => {
        if (data.color === 'spectator') {
          clientSocket3.emit('resign');
          
          // Should not receive game_over event
          setTimeout(() => {
            const room = roomManager.getRoom('test-room-1');
            expect(room.ended).toBe(false);
            clientSocket3.close();
            done();
          }, 100);
        }
      });
    });

    test('should restart game correctly', (done) => {
      // Make a move first
      clientSocket.emit('move', { from: 'e2', to: 'e4' });
      
      clientSocket.on('move', () => {
        // Now restart
        clientSocket.emit('restart');
        
        clientSocket.on('restart', (data) => {
          expect(data.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
          expect(data.gameOver).toBe(false);
          done();
        });
      });
    });

    test('should broadcast restart to all players', (done) => {
      let restartCount = 0;
      
      const onRestart = (data) => {
        expect(data.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        restartCount++;
        if (restartCount === 2) {
          done();
        }
      };
      
      clientSocket.on('restart', onRestart);
      clientSocket2.on('restart', onRestart);
      
      clientSocket.emit('restart');
    });
  });

  describe('Chat Functionality', () => {
    beforeEach((done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          done();
        });
      });
    });

    test('should broadcast chat messages', (done) => {
      const message = 'Hello, opponent!';
      
      const onChat = (data) => {
        expect(data.from).toBe('w');
        expect(data.text).toBe(message);
        expect(data.ts).toBeDefined();
        done();
      };
      
      clientSocket.on('chat', onChat);
      clientSocket2.on('chat', onChat);
      
      clientSocket.emit('chat', message);
    });

    test('should limit chat message length', (done) => {
      const longMessage = 'a'.repeat(400); // Over 300 character limit
      
      clientSocket.on('chat', (data) => {
        expect(data.text.length).toBeLessThanOrEqual(300);
        done();
      });
      
      clientSocket.emit('chat', longMessage);
    });

    test('should handle spectator chat messages', (done) => {
      const clientSocket3 = Client(`http://localhost:${server.address().port}`);
      const message = 'Spectator here!';
      
      clientSocket3.emit('join', 'test-room-1');
      
      clientSocket3.on('init', (data) => {
        if (data.color === 'spectator') {
          clientSocket3.on('chat', (chatData) => {
            expect(chatData.from).toBe('spectator');
            expect(chatData.text).toBe(message);
            clientSocket3.close();
            done();
          });
          
          clientSocket3.emit('chat', message);
        }
      });
    });
  });

  describe('Draw Offers', () => {
    beforeEach((done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          done();
        });
      });
    });

    test('should handle draw offer and acceptance', (done) => {
      clientSocket.emit('offer_draw');
      
      clientSocket2.on('draw_offered', () => {
        clientSocket2.emit('respond_draw', true);
      });
      
      clientSocket.on('game_over', (data) => {
        expect(data.reason).toBe('draw_agreed');
        done();
      });
    });

    test('should handle draw offer rejection', (done) => {
      clientSocket.emit('offer_draw');
      
      clientSocket2.on('draw_offered', () => {
        clientSocket2.emit('respond_draw', false);
      });
      
      clientSocket.on('draw_rejected', () => {
        done();
      });
    });
  });

  describe('Takeback Offers', () => {
    beforeEach((done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          // Make a move first
          clientSocket.emit('move', { from: 'e2', to: 'e4' });
        });
      });
      
      clientSocket.on('move', () => {
        done();
      });
    });

    test('should handle takeback offer and acceptance', (done) => {
      clientSocket.emit('offer_takeback');
      
      clientSocket2.on('takeback_offered', () => {
        clientSocket2.emit('respond_takeback', true);
      });
      
      clientSocket.on('takeback', (data) => {
        expect(data.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        done();
      });
    });

    test('should handle takeback offer rejection', (done) => {
      clientSocket.emit('offer_takeback');
      
      clientSocket2.on('takeback_offered', () => {
        clientSocket2.emit('respond_takeback', false);
      });
      
      clientSocket.on('takeback_rejected', () => {
        done();
      });
    });
  });

  describe('Disconnection Handling', () => {
    test('should remove player from room on disconnect', (done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        clientSocket2.emit('join', roomId);
        
        clientSocket2.on('init', () => {
          clientSocket2.disconnect();
          
          setTimeout(() => {
            clientSocket.on('players', (data) => {
              expect(data.w).toBe(true);
              expect(data.b).toBe(false);
              done();
            });
          }, 100);
        });
      });
    });

    test('should clean up empty rooms', (done) => {
      const roomId = 'test-room-1';
      
      clientSocket.emit('join', roomId);
      
      clientSocket.on('init', () => {
        expect(roomManager.hasRoom(roomId)).toBe(true);
        
        clientSocket.disconnect();
        
        setTimeout(() => {
          expect(roomManager.hasRoom(roomId)).toBe(false);
          done();
        }, 100);
      });
    });
  });
});

/**
 * Sets up Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 * @param {RoomManager} roomManager - Room manager instance
 */
function setupSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    let boundRoomId = null;

    socket.on('join', (roomId) => {
      if (typeof roomId !== 'string' || roomId.trim() === '') {
        socket.emit('error_message', 'Invalid room id');
        return;
      }
      
      boundRoomId = roomId.trim();
      const room = roomManager.getOrCreateRoom(boundRoomId);
      
      socket.join(boundRoomId);
      
      const result = roomManager.addPlayer(boundRoomId, socket.id);
      
      socket.emit('init', {
        color: result.color,
        fen: room.chess.fen(),
        turn: room.chess.turn(),
        gameOver: roomManager.getGameState(room).gameOver,
        history: room.history,
      });
      
      io.to(boundRoomId).emit('players', {
        w: roomManager.getPlayerColor(boundRoomId, socket.id) === 'w' || 
           Array.from(room.players.values()).includes('w'),
        b: roomManager.getPlayerColor(boundRoomId, socket.id) === 'b' || 
           Array.from(room.players.values()).includes('b'),
      });
    });

    socket.on('move', (payload) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      const result = roomManager.makeMove(roomId, socket.id, payload);
      
      if (result.success) {
        io.to(roomId).emit('move', result.state);
      } else {
        socket.emit('illegal_move', payload);
      }
    });

    socket.on('resign', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      const result = roomManager.resign(roomId, socket.id);
      
      if (result.success) {
        io.to(roomId).emit('game_over', result);
      }
    });

    socket.on('restart', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      const result = roomManager.restart(roomId);
      
      if (result.success) {
        io.to(roomId).emit('restart', result.state);
      }
    });

    socket.on('chat', (text) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      const room = roomManager.getRoom(roomId);
      const color = roomManager.getPlayerColor(roomId, socket.id) || 'spectator';
      const msg = {
        from: color,
        text: String(text || '').slice(0, 300),
        ts: Date.now(),
      };
      
      io.to(roomId).emit('chat', msg);
    });

    socket.on('offer_draw', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      io.to(roomId).emit('draw_offered');
    });

    socket.on('respond_draw', (accepted) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      if (accepted) {
        const room = roomManager.getRoom(roomId);
        room.ended = true;
        io.to(roomId).emit('game_over', { reason: 'draw_agreed' });
      } else {
        io.to(roomId).emit('draw_rejected');
      }
    });

    socket.on('offer_takeback', () => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      io.to(roomId).emit('takeback_offered');
    });

    socket.on('respond_takeback', (accepted) => {
      const roomId = boundRoomId;
      if (!roomId || !roomManager.hasRoom(roomId)) return;
      
      if (!accepted) {
        io.to(roomId).emit('takeback_rejected');
        return;
      }
      
      const room = roomManager.getRoom(roomId);
      const undone = room.chess.undo();
      
      if (!undone) {
        io.to(roomId).emit('takeback_failed');
        return;
      }
      
      room.history.pop();
      const state = roomManager.getGameState(room);
      room.ended = false;
      
      io.to(roomId).emit('takeback', state);
    });

    socket.on('disconnect', () => {
      if (!boundRoomId) return;
      
      const room = roomManager.getRoom(boundRoomId);
      if (!room) return;
      
      roomManager.removePlayer(boundRoomId, socket.id);
      
      io.to(boundRoomId).emit('players', {
        w: Array.from(room.players.values()).includes('w'),
        b: Array.from(room.players.values()).includes('b'),
      });
      
      // Clean up empty rooms
      if (room.players.size === 0) {
        roomManager.deleteRoom(boundRoomId);
      }
    });
  });
}
