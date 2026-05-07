import { loginUser } from '../src/backend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await loginUser(req.body || {});
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  return res.status(200).json(result);
}
