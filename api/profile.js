import { getUserFromToken } from '../src/backend.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const result = await getUserFromToken(token);

  if (result.error) {
    return res.status(result.status || 401).json({ error: result.error });
  }

  return res.status(200).json(result.user);
}
