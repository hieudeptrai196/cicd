const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/index');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

test.after(() => {
  server.close();
});

test('GET /health tra ve status ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
});

test('GET /add/2/3 tra ve 5', async () => {
  const res = await fetch(`${baseUrl}/add/2/3`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.result, 5);
});

test('GET /add/a/3 voi tham so khong phai so tra ve loi 400', async () => {
  const res = await fetch(`${baseUrl}/add/a/3`);
  assert.strictEqual(res.status, 400);
});
