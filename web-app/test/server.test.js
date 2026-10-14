const assert = require('node:assert/strict');
const test = require('node:test');
const { once } = require('node:events');

const { app, MAX_FILE_SIZE } = require('../server');

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
    server.close();
    await once(server, 'close');
});

test('GET /health returns a healthy status', async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
});

test('POST /api/convert rejects unsupported file extensions', async () => {
    const form = new FormData();
    form.append('file', new Blob(['example'], { type: 'text/plain' }), 'example.exe');

    const response = await fetch(`${baseUrl}/api/convert`, {
        method: 'POST',
        body: form,
    });

    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: 'Unsupported file type.' });
});

test('POST /api/convert rejects files larger than 15MB', async () => {
    const form = new FormData();
    form.append(
        'file',
        new Blob([Buffer.alloc(MAX_FILE_SIZE + 1)], { type: 'text/plain' }),
        'large.txt',
    );

    const response = await fetch(`${baseUrl}/api/convert`, {
        method: 'POST',
        body: form,
    });

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
        error: 'File exceeds maximum limit of 15MB.',
    });
});

test('POST /api/convert rejects requests without a file', async () => {
    const response = await fetch(`${baseUrl}/api/convert`, {
        method: 'POST',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'No file uploaded.' });
});
