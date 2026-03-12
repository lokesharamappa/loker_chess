/**
 * @fileoverview Integration test setup
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import RoomManager from '../../src/core/RoomManager.js';

// Integration test utilities
global.integrationTestHelpers = {
  /**
   * Create test server with Socket.IO
   */
  createTestServer: async () => {
    const server = createServer();
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    
    const roomManager = new RoomManager();
    
    return { server, io, roomManager };
  },
  
  /**
   * Create test client
   */
  createTestClient: (port) => {
    return Client(`http://localhost:${port}`, {
      reconnection: false,
      forceNew: true,
    });
  },
  
  /**
   * Create multiple test clients
   */
  createTestClients: async (port, count) => {
    const clients = [];
    for (let i = 0; i < count; i++) {
      clients.push(Client(`http://localhost:${port}`, {
        reconnection: false,
        forceNew: true,
      }));
    }
    return clients;
  },
  
  /**
   * Wait for clients to connect
   */
  waitForClients: (clients, expectedCount) => {
    return new Promise((resolve) => {
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === expectedCount) {
          resolve();
        }
      };
      
      clients.forEach(client => {
        if (client.connected) {
          onConnect();
        } else {
          client.on('connect', onConnect);
        }
      });
    });
  },
  
  /**
   * Clean up test server and clients
   */
  cleanup: async (server, clients) => {
    // Disconnect clients
    if (clients) {
      clients.forEach(client => {
        if (client && client.connected) {
          client.disconnect();
        }
      });
    }
    
    // Close server
    if (server) {
      return new Promise((resolve) => {
        server.close(resolve);
      });
    }
  },
  
  /**
   * Create a complete test game scenario
   */
  createTestGame: async (port) => {
    const { server, io, roomManager } = await this.createTestServer();
    const clients = await this.createTestClients(port, 2);
    
    // Set up Socket.IO handlers
    setupSocketHandlers(io, roomManager);
    
    return { server, io, roomManager, clients };
  },
};
