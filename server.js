import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const RESUMES_FILE = path.join(__dirname, 'data', 'resumes.json');
const JWT_SECRET = process.env.JWT_SECRET || 'jobhack-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

const readUsers = async () => {
  try {
    const raw = await fs.promises.readFile(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return [];
  }
};

const writeUsers = async (users) => {
  await fs.promises.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
};

const readResumes = async () => {
  try {
    const raw = await fs.promises.readFile(RESUMES_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    return {};
  }
};

const writeResumes = async (resumes) => {
  await fs.promises.writeFile(RESUMES_FILE, JSON.stringify(resumes, null, 2), 'utf8');
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = await readUsers();
  const existing = users.find((user) => user.email === normalizedEmail);

  if (existing) {
    return res.status(409).json({ error: 'An account already exists with that email.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeUsers(users);

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  const users = await readUsers();
  const user = users.find((item) => item.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ id: user.id, name: user.name, email: user.email });
});

app.get('/api/resume', authMiddleware, async (req, res) => {
  const resumes = await readResumes();
  const userResumes = resumes[req.user.id] || [];
  res.json(userResumes);
});

app.post('/api/resume', authMiddleware, async (req, res) => {
  const resume = req.body || {};
  const resumes = await readResumes();
  if (!resumes[req.user.id]) resumes[req.user.id] = [];
  resumes[req.user.id].push(resume); // For now, just add, later handle update
  if (resumes[req.user.id].length > 5) resumes[req.user.id] = resumes[req.user.id].slice(-5); // Keep last 5
  await writeResumes(resumes);
  res.json({ status: 'saved', resume });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`JOBHACK server running at http://localhost:${PORT}`);
});
