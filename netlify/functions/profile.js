import { getUserFromToken } from '../../src/backend.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const result = await getUserFromToken(token);

  if (result.error) {
    return {
      statusCode: result.status || 401,
      body: JSON.stringify({ error: result.error }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.user),
  };
};
