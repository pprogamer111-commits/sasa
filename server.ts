import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Securely obtain __filename and __dirname in both ESM (tsx) and CJS (compiled bundle)
const getPaths = () => {
  try {
    if (typeof __filename !== 'undefined' && typeof __dirname !== 'undefined') {
      return { filename: __filename, dirname: __dirname };
    }
  } catch (e) {}
  
  try {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    return { filename, dirname };
  } catch (e) {
    return { filename: '', dirname: '' };
  }
};

const { filename: currentFilename, dirname: currentDirname } = getPaths();

const app = express();
// Hosting services such as Render provide the listening port via PORT.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_PATH = path.join(process.cwd(), 'db.json');

// Helper to hash password
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// In-memory data store with futuristic seeded contacts
interface User {
  id: string;
  username: string;
  name: string;
  avatarSeed: string;
  status: 'online' | 'offline';
  bio?: string;
  isAI?: boolean;
  passwordHash?: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
}

let users: Map<string, User> = new Map();
let messages: Message[] = [];
const clients: Map<string, express.Response> = new Map();

// Seed initial futuristic AI/system contacts
const AI_CONTACTS: User[] = [
  {
    id: 'ai-zara',
    username: 'zara',
    name: 'Zara (Quantum AI)',
    avatarSeed: 'zara-neon',
    status: 'online',
    bio: 'Neural network hologram specializing in deep space frequency synthesis.',
    isAI: true
  },
  {
    id: 'ai-kael',
    username: 'kaelen',
    name: 'Kaelen (Core Architect)',
    avatarSeed: 'kael-glow',
    status: 'online',
    bio: 'Lead system designer of Luminal Space. Ping me for latency checks.',
    isAI: true
  },
  {
    id: 'ai-neo',
    username: 'neo',
    name: 'Neo (Cyber Security)',
    avatarSeed: 'neo-cyber',
    status: 'online',
    bio: 'Encrypted communication advisor. Keeping the mesh net secure.',
    isAI: true
  }
];

// Load database
const loadDatabase = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const data = JSON.parse(raw);
      users = new Map(Object.entries(data.users || {}));
      messages = data.messages || [];
      console.log(`[Database] Loaded successfully: ${users.size} nodes, ${messages.length} messages.`);
      
      // Ensure AI contacts always exist and are online
      AI_CONTACTS.forEach(ai => {
        users.set(ai.id, { ...ai, status: 'online' });
      });
    } else {
      console.log('[Database] File not found. Creating and seeding initial AI contacts...');
      AI_CONTACTS.forEach(u => users.set(u.id, u));
      messages.push(
        {
          id: 'm-init-1',
          senderId: 'ai-zara',
          recipientId: 'all',
          text: 'Welcome to the Luminal Network. Open another tab to test true low-latency peer-to-peer video calling or start chat sessions with any of us!',
          timestamp: Date.now() - 60000
        },
        {
          id: 'm-init-2',
          senderId: 'ai-kael',
          recipientId: 'all',
          text: 'System status is optimal. Visual shaders and 3D glow matrices are running at full performance.',
          timestamp: Date.now() - 30000
        }
      );
      saveDatabase();
    }
  } catch (err) {
    console.error('[Database] Load failure, using in-memory fallback:', err);
    AI_CONTACTS.forEach(u => users.set(u.id, u));
  }
};

const saveDatabase = () => {
  try {
    const data = {
      users: Object.fromEntries(users),
      messages
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Database] Save failure:', err);
  }
};

// Helper to push real-time events to connected clients
const sendSSE = (userId: string, eventType: string, data: any) => {
  const res = clients.get(userId);
  if (res) {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

const broadcastSSE = (eventType: string, data: any, excludeId?: string) => {
  for (const [userId, res] of clients.entries()) {
    if (userId !== excludeId) {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }
};

// --- API ENDPOINTS ---

// Authenticate / Register User
app.post('/api/auth/login', (req, res) => {
  const { username, password, action, name, bio, avatarSeed } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Access password is required' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const passwordHash = hashPassword(password);
  
  // Find if user already exists
  let existingUser = Array.from(users.values()).find(
    u => u.username === cleanUsername && !u.isAI
  );

  if (action === 'login') {
    if (!existingUser) {
      return res.status(401).json({ error: 'Terminal Node username not found' });
    }
    if (existingUser.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Incorrect terminal password' });
    }
    
    // Clean user response
    const { passwordHash: _, ...cleanUser } = existingUser;
    return res.json({ user: cleanUser, message: 'Welcome back' });
  } else {
    // Register
    if (existingUser) {
      return res.status(400).json({ error: 'Username already registered on this mesh net' });
    }

    // Create new user
    const newUser: User = {
      id: `u-${Math.random().toString(36).substring(2, 11)}`,
      username: cleanUsername,
      name: name || username,
      avatarSeed: avatarSeed || `avatar-${Math.floor(Math.random() * 1000)}`,
      status: 'offline',
      bio: bio || 'Explorer of the glowing grid.',
      passwordHash
    };

    users.set(newUser.id, newUser);
    saveDatabase();
    
    // Broadcast new user joined to other users
    const { passwordHash: _, ...cleanUser } = newUser;
    broadcastSSE('user_joined', cleanUser);

    return res.json({ user: cleanUser, message: 'Account established' });
  }
});

// Update Profile
app.post('/api/users/profile', (req, res) => {
  const { userId, name, bio, avatarSeed } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.name = name || user.name;
  user.bio = bio !== undefined ? bio : user.bio;
  user.avatarSeed = avatarSeed || user.avatarSeed;

  users.set(userId, user);
  saveDatabase();

  const { passwordHash: _, ...cleanUser } = user;
  broadcastSSE('user_updated', cleanUser);

  res.json({ success: true, user: cleanUser });
});

// Get User Directory
app.get('/api/users', (req, res) => {
  const cleanUsers = Array.from(users.values()).map(({ passwordHash, ...u }) => u);
  res.json({ users: cleanUsers });
});

// Get Messages
app.get('/api/messages', (req, res) => {
  const { userId, contactId } = req.query as { userId: string; contactId: string };
  if (!userId || !contactId) {
    return res.status(400).json({ error: 'userId and contactId are required' });
  }

  // Retrieve messages specific to this pair, or initial global messages
  const chatHistory = messages.filter(
    m =>
      (m.senderId === userId && m.recipientId === contactId) ||
      (m.senderId === contactId && m.recipientId === userId) ||
      (contactId === 'all' && m.recipientId === 'all')
  );

  res.json({ messages: chatHistory });
});

// Send Message
app.post('/api/messages', (req, res) => {
  const { senderId, recipientId, text } = req.body;
  if (!senderId || !recipientId || !text) {
    return res.status(400).json({ error: 'Missing message parameters' });
  }

  const newMessage: Message = {
    id: `msg-${Math.random().toString(36).substring(2, 11)}`,
    senderId,
    recipientId,
    text,
    timestamp: Date.now()
  };

  messages.push(newMessage);
  saveDatabase();

  // Send message to the recipient if online via SSE
  sendSSE(recipientId, 'message', newMessage);
  // Send message confirmation to sender
  sendSSE(senderId, 'message', newMessage);

  // Trigger AI responses if target is AI contact
  const targetUser = users.get(recipientId);
  if (targetUser?.isAI) {
    // Send typing indicator event
    setTimeout(() => {
      sendSSE(senderId, 'typing', { contactId: recipientId, typing: true });
    }, 400);

    // Dynamic responses depending on AI contact character
    setTimeout(() => {
      sendSSE(senderId, 'typing', { contactId: recipientId, typing: false });

      let replyText = "Fascinating query on the Luminal channel. I am processing the neural frequency.";
      if (recipientId === 'ai-zara') {
        const replies = [
          "My quantum frequencies are aligning. I see your signal clear and glowing.",
          "Our node telemetry reports a 0.2ms phase alignment. Beautiful message telemetry.",
          "The interactive 3D particle state is fluctuating in harmony with your inputs.",
          "Zara here. Ready for a real-time voice or video hologram call? Just press the Call icon!"
        ];
        replyText = replies[Math.floor(Math.random() * replies.length)];
      } else if (recipientId === 'ai-kael') {
        const replies = [
          "Core system running flawlessly. No UI glitches detected in this Sector.",
          "WebRTC signals are structured. Launching a video call with me will trigger the 3D Audio Visualizer simulation.",
          "Glow levels optimized to 88% intensity. Eye-strain levels minimized.",
          "Codebase validated. Low-latency is achieved via in-memory event dispatch."
        ];
        replyText = replies[Math.floor(Math.random() * replies.length)];
      } else if (recipientId === 'ai-neo') {
        const replies = [
          "Connection fully sandboxed. Keys are stored client-side.",
          "End-to-peer data packets are streaming smoothly. No security leakages detected.",
          "Cybersecurity protocol active. Ready to initiate encrypted neural interface.",
          "Always remember to test multi-client mesh call by logging in on another private window!"
        ];
        replyText = replies[Math.floor(Math.random() * replies.length)];
      }

      const aiMessage: Message = {
        id: `msg-${Math.random().toString(36).substring(2, 11)}`,
        senderId: recipientId,
        recipientId: senderId,
        text: replyText,
        timestamp: Date.now()
      };

      messages.push(aiMessage);
      saveDatabase();
      sendSSE(senderId, 'message', aiMessage);
    }, 1800);
  }

  res.json({ success: true, message: newMessage });
});

// Signal exchange endpoint for WebRTC
app.post('/api/signal', (req, res) => {
  const { from, to, signal } = req.body;
  if (!from || !to || !signal) {
    return res.status(400).json({ error: 'Invalid signal payload' });
  }

  // Forward signal packet directly to recipient
  sendSSE(to, 'call_signal', { from, to, signal });
  res.json({ success: true });
});

// SSE Real-time Presence and Event Connection
app.get('/api/events', (req, res) => {
  const { userId } = req.query as { userId: string };
  if (!userId) {
    return res.status(400).json({ error: 'userId is required for SSE connection' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register client
  clients.set(userId, res);

  // Mark user as online
  const user = users.get(userId);
  if (user) {
    user.status = 'online';
    users.set(userId, user);
    broadcastSSE('user_status', { userId, status: 'online' }, userId);
  }

  // Keep-alive heartbeat every 15 seconds to prevent timeout
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(userId);

    // Mark user offline
    const currentUser = users.get(userId);
    if (currentUser) {
      currentUser.status = 'offline';
      users.set(userId, currentUser);
      broadcastSSE('user_status', { userId, status: 'offline' });
    }
  });
});

// --- VITE & PRODUCTION SETUP ---
async function startServer() {
  loadDatabase();

  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in Development Mode with Vite Middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in Production Mode serving static files');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luminal Server boot complete on port ${PORT}`);
  });
}

startServer();
