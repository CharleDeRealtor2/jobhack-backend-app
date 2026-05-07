import { getResumesForUser, saveResumeForUser } from '../src/backend.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (req.method === 'GET') {
    const result = await getResumesForUser(token);
    if (result.error) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.status(200).json(result.resumes);
  }

  if (req.method === 'POST') {
    const result = await saveResumeForUser(token, req.body || {});
    if (result.error) {
      return res.status(result.status || 401).json({ error: result.error });
    }
    return res.status(200).json(result);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
