const EXPIRATION_NO_CONNECTIONS = 10 * 1000;
const EXPIRATION_ONE_CONNECTION = 60 * 1000;
const EXPIRATION_TWO_CONNECTIONS = 10 * 60 * 1000;

const normalizeConnectionIds = (idA, idB) => {
  return idA < idB ? [idA, idB] : [idB, idA];
};

const handleCORS = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleCORS(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/thoughts' && request.method === 'POST') {
        const body = await request.json();
        const { text, latitude, longitude } = body ?? {};
        const trimmed = (text ?? '').trim();

        if (!trimmed || trimmed.length > 255) {
          return handleCORS(Response.json(
            { error: !trimmed ? 'Thought text is required' : 'Thought text exceeds 255 characters' },
            { status: 400 }
          ));
        }

        const createdAt = new Date().toISOString();
        const result = await env.DB.prepare(
          'INSERT INTO thoughts (text, latitude, longitude, created_at) VALUES (?, ?, ?, ?)'
        )
          .bind(trimmed, latitude ?? null, longitude ?? null, createdAt)
          .run();

        return handleCORS(Response.json({
          id: result.meta.last_row_id,
          createdAt
        }, { status: 201 }));
      }

      if (path === '/api/thoughts/recent' && request.method === 'GET') {
        const connectionCountsResult = await env.DB.prepare(`
          SELECT t.id, COUNT(DISTINCT c.id) as connection_count
          FROM thoughts t
          LEFT JOIN connections c ON (c.thought_id_a = t.id OR c.thought_id_b = t.id)
          WHERE t.lost = 0
          GROUP BY t.id
        `).all();

        const allThoughts = await env.DB.prepare(`
          SELECT id, text, created_at, latitude, longitude
          FROM thoughts
          WHERE lost = 0
          ORDER BY created_at DESC
        `).all();

        const connectionCounts = new Map();
        connectionCountsResult.results.forEach(row => {
          connectionCounts.set(row.id, row.connection_count || 0);
        });

        const now = Date.now();
        const cutoffNoConnections = now - EXPIRATION_NO_CONNECTIONS;
        const cutoffOneConnection = now - EXPIRATION_ONE_CONNECTION;
        const cutoffTwoConnections = now - EXPIRATION_TWO_CONNECTIONS;

        const validThoughts = allThoughts.results.filter(thought => {
          const createdAt = new Date(thought.created_at).getTime();
          const connectionCount = connectionCounts.get(thought.id) || 0;

          if (connectionCount >= 3) return true;
          if (connectionCount === 2) return createdAt >= cutoffTwoConnections;
          if (connectionCount === 1) return createdAt >= cutoffOneConnection;
          return createdAt >= cutoffNoConnections;
        });

        if (validThoughts.length === 0) {
          return handleCORS(Response.json({ thoughts: [], connections: [] }));
        }

        validThoughts.forEach(thought => {
          thought.createdAt = new Date(thought.created_at).toISOString();
          thought.connectionCount = connectionCounts.get(thought.id) || 0;
        });

        const thoughtIds = validThoughts.map(t => t.id);
        const placeholders = thoughtIds.map(() => '?').join(',');

        const connectionsResult = await env.DB.prepare(`
          SELECT thought_id_a, thought_id_b, created_at
          FROM connections
          WHERE thought_id_a IN (${placeholders}) OR thought_id_b IN (${placeholders})
        `).bind(...thoughtIds, ...thoughtIds).all();

        const connections = connectionsResult.results.map(conn => ({
          thought_a: conn.thought_id_a,
          thought_b: conn.thought_id_b,
          createdAt: new Date(conn.created_at).toISOString()
        }));

        return handleCORS(Response.json({
          thoughts: validThoughts.map(t => ({
            id: t.id,
            text: t.text,
            createdAt: t.createdAt,
            latitude: t.latitude,
            longitude: t.longitude,
            connectionCount: t.connectionCount
          })),
          connections
        }));
      }

      if (path === '/api/connections' && request.method === 'POST') {
        const body = await request.json();
        const { thoughtA, thoughtB } = body ?? {};

        if (!thoughtA || !thoughtB || thoughtA === thoughtB) {
          return handleCORS(Response.json(
            { error: 'Invalid connection' },
            { status: 400 }
          ));
        }

        const [a, b] = normalizeConnectionIds(thoughtA, thoughtB);
        const createdAt = new Date().toISOString();

        const result = await env.DB.prepare(
          'INSERT OR IGNORE INTO connections (thought_id_a, thought_id_b, created_at) VALUES (?, ?, ?)'
        )
          .bind(a, b, createdAt)
          .run();

        if (result.meta.changes === 0) {
          return handleCORS(Response.json({ message: 'Connection already exists' }, { status: 200 }));
        }

        return handleCORS(Response.json({
          id: result.meta.last_row_id,
          createdAt
        }, { status: 201 }));
      }

      if (path.startsWith('/api/connections/') && request.method === 'DELETE') {
        const parts = path.split('/');
        const idA = parseInt(parts[3]);
        const idB = parseInt(parts[4]);

        if (isNaN(idA) || isNaN(idB)) {
          return handleCORS(Response.json(
            { error: 'Invalid connection IDs' },
            { status: 400 }
          ));
        }

        const [a, b] = normalizeConnectionIds(idA, idB);
        const result = await env.DB.prepare(
          'DELETE FROM connections WHERE thought_id_a = ? AND thought_id_b = ?'
        )
          .bind(a, b)
          .run();

        return handleCORS(Response.json({ deleted: result.meta.changes }));
      }

      return handleCORS(Response.json({ error: 'Not found' }, { status: 404 }));
    } catch (error) {
      console.error('Error:', error);
      return handleCORS(Response.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      ));
    }
  }
};
