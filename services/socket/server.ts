// Win Room v2.0 - Socket.IO Server
import 'dotenv/config';

// For development with DigitalOcean managed databases (self-signed certs)
if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL?.includes('digitalocean.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { createServer } from 'http';
import { Server } from 'socket.io';
import { getPool, query } from '../../lib/db/connection';
import { verifyToken } from '../../lib/auth/jwt';

const PORT = parseInt(process.env.SOCKET_PORT || '3001');
const CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000';

// Parse CORS origin (supports multiple origins separated by comma)
const allowedOrigins = CORS_ORIGIN.split(',').map(origin => origin.trim());

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
});

// Event polling interval (every 500ms)
let lastEventId = 0;
let eventPollingInterval: NodeJS.Timeout;

/**
 * Authenticate socket connection
 */
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  const user = verifyToken(token);

  if (!user) {
    return next(new Error('Invalid token'));
  }

  // Attach user to socket
  (socket as any).user = user;
  next();
});

/**
 * Poll for new events and broadcast to clients
 */
async function pollEvents() {
  try {
    // Fetch new events
    const events = await query<any>(
      `SELECT id, type, subscription_id, actor, payload, created_at
       FROM wr.events
       WHERE id > $1
       ORDER BY id ASC
       LIMIT 100`,
      [lastEventId]
    );

    if (events.length === 0) return;

    // Broadcast each event
    for (const event of events) {
      const eventData = {
        id: event.id,
        type: event.type,
        subscription_id: event.subscription_id,
        actor: event.actor,
        payload: event.payload,
        created_at: event.created_at,
      };

      // Broadcast to all connected clients
      io.emit(event.type, eventData);

      // Log event
      console.log(`[Socket] Broadcasting event: ${event.type} (${event.id})`);

      // Update last event ID
      lastEventId = event.id;
    }
  } catch (error) {
    console.error('[Socket] Error polling events:', error);
  }
}

/**
 * Initialize event polling
 */
async function initializeEventPolling() {
  try {
    // Get the latest event ID
    const latestEvent = await query<{ id: number }>(
      'SELECT MAX(id) as id FROM wr.events'
    );

    if (latestEvent.length > 0 && latestEvent[0].id) {
      lastEventId = latestEvent[0].id;
    }

    console.log(`[Socket] Starting event polling from ID: ${lastEventId}`);

    // Start polling every 500ms
    eventPollingInterval = setInterval(pollEvents, 500);
  } catch (error) {
    console.error('[Socket] Error initializing event polling:', error);
  }
}

/**
 * Handle socket connections
 */
io.on('connection', (socket) => {
  const user = (socket as any).user;
  console.log(`[Socket] User connected: ${user.seller_id} (${socket.id})`);

  // Join user to their own room (for targeted messages)
  socket.join(`seller:${user.seller_id}`);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${user.seller_id} (${socket.id})`);
  });

  // Handle ping for connection testing
  socket.on('ping', (callback) => {
    if (callback) callback({ pong: true, timestamp: Date.now() });
  });
});

/**
 * Start the server
 */
async function start() {
  console.log('[Socket] Win Room v2.0 Socket.IO Server starting...');

  // Initialize DB connection
  getPool();

  // Initialize event polling
  await initializeEventPolling();

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`[Socket] Server listening on port ${PORT}`);
    console.log(`[Socket] CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`[Socket] Ready to accept connections`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Socket] Shutting down gracefully...');

  // Stop event polling
  if (eventPollingInterval) {
    clearInterval(eventPollingInterval);
  }

  // Close socket connections
  io.close();

  // Close DB pool
  const { closePool } = await import('../../lib/db/connection');
  await closePool();

  // Close HTTP server
  httpServer.close(() => {
    console.log('[Socket] Server closed');
    process.exit(0);
  });
});

// Start the server
start().catch((error) => {
  console.error('[Socket] Fatal error:', error);
  process.exit(1);
});
