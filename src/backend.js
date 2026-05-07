import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const TMP_DIR = process.env.TMPDIR || process.env.TEMP || '/tmp';
const JWT_SECRET = process.env.JWT_SECRET || 'jobhack-secret-key';

const getTempPath = (fileName) => path.join(TMP_DIR, fileName);
const getSourcePath = (fileName) => path.join(DATA_DIR, fileName);

const resolveDataFile = async (fileName) => {
  const tempPath = getTempPath(fileName);

  try {
    await fs.promises.access(tempPath);
    return tempPath;
  } catch {
    // copy initial data from repo to tmp folder so writes are possible in serverless environments
    let content = '';
    try {
      content = await fs.promises.readFile(getSourcePath(fileName), 'utf8');
    } catch {
      content = fileName === 'users.json' ? '[]' : '{}';
    }
    await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.promises.writeFile(tempPath, content || (fileName === 'users.json' ? '[]' : '{}'), 'utf8');
    return tempPath;
  }
};

const readJsonFile = async (fileName) => {
  const filePath = await resolveDataFile(fileName);
  const raw = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(raw || (fileName === 'users.json' ? '[]' : '{}'));
};

const writeJsonFile = async (fileName, data) => {
  const filePath = await resolveDataFile(fileName);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

export const readUsers = async () => readJsonFile('users.json');
export const writeUsers = async (users) => writeJsonFile('users.json', users);
export const readResumes = async () => readJsonFile('resumes.json');
export const writeResumes = async (resumes) => writeJsonFile('resumes.json', resumes);

export const hashPassword = async (password) => bcrypt.hash(password, 10);
export const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);
export const signToken = (user) => jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    return { status: 400, error: 'Name, email, and password are required.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const existing = users.find((user) => user.email === normalizedEmail);

  if (existing) {
    return { status: 409, error: 'An account already exists with that email.' };
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: Date.now().toString(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  const token = signToken(newUser);
  return { token, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    return { status: 400, error: 'Email and password are required.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return { status: 401, error: 'Invalid credentials.' };
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    return { status: 401, error: 'Invalid credentials.' };
  }

  const token = signToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email } };
};

export const getUserFromToken = async (token) => {
  if (!token) {
    return { status: 401, error: 'Unauthorized' };
  }

  try {
    const payload = verifyToken(token);
    const users = await readUsers();
    const user = users.find((item) => item.id === payload.id);
    if (!user) {
      return { status: 404, error: 'User not found.' };
    }
    return { user: { id: user.id, name: user.name, email: user.email } };
  } catch (error) {
    return { status: 401, error: 'Invalid or expired token' };
  }
};

export const getResumesForUser = async (token) => {
  const auth = await getUserFromToken(token);
  if (auth.error) return auth;
  const resumes = await readResumes();
  return { resumes: resumes[auth.user.id] || [] };
};

export const saveResumeForUser = async (token, resume) => {
  const auth = await getUserFromToken(token);
  if (auth.error) return auth;
  const resumes = await readResumes();
  if (!resumes[auth.user.id]) resumes[auth.user.id] = [];
  resumes[auth.user.id].push(resume || {});
  if (resumes[auth.user.id].length > 5) {
    resumes[auth.user.id] = resumes[auth.user.id].slice(-5);
  }
  await writeResumes(resumes);
  return { resume, status: 'saved' };
};
