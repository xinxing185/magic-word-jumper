const http = require('http');
const { main } = require('./index');

const PORT = Number(process.env.PORT || process.env.SCF_RUNTIME_PORT || 9000);

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];

  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

const sendResponse = (res, result) => {
  const statusCode = result?.statusCode || 200;
  const headers = result?.headers || {};
  const body = typeof result?.body === 'string' ? result.body : JSON.stringify(result?.body ?? {});

  Object.entries(headers).forEach(([name, value]) => {
    if (typeof value !== 'undefined') {
      res.setHeader(name, value);
    }
  });

  res.statusCode = statusCode;
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  try {
    const body = await readBody(req);
    const event = {
      httpMethod: req.method,
      method: req.method,
      path: req.url?.split('?')[0] || '/',
      rawPath: req.url?.split('?')[0] || '/',
      headers: req.headers,
      queryStringParameters: Object.fromEntries(new URL(req.url || '/', 'https://cloudbase.local').searchParams),
      body,
      isBase64Encoded: false,
    };
    const context = {
      httpContext: {
        httpMethod: req.method,
        url: req.url || '/',
      },
    };

    const result = await main(event, context);
    sendResponse(res, result);
  } catch (error) {
    console.error('CloudBase HTTP server error:', error);
    sendResponse(res, {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Internal server error' }),
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Magic Word Jumper API listening on ${PORT}`);
});
