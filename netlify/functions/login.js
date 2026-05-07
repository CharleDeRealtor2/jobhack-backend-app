import { loginUser } from '../../src/backend.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const result = await loginUser(body);
  if (result.error) {
    return {
      statusCode: result.status || 400,
      body: JSON.stringify({ error: result.error }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
