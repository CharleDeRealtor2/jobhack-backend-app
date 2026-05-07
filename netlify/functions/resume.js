import { getResumesForUser, saveResumeForUser } from '../../src/backend.js';

export const handler = async (event) => {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (event.httpMethod === 'GET') {
    const result = await getResumesForUser(token);
    if (result.error) {
      return {
        statusCode: result.status || 401,
        body: JSON.stringify({ error: result.error }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.resumes),
    };
  }

  if (event.httpMethod === 'POST') {
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await saveResumeForUser(token, body);
    if (result.error) {
      return {
        statusCode: result.status || 401,
        body: JSON.stringify({ error: result.error }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
