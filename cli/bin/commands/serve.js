import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const STORE_FILE = process.env.AODW_ID_STORE_PATH || path.join(process.cwd(), 'aodw-id-store.json');
const PORT = process.env.PORT || 2005;

function loadStore() {
    if (fs.existsSync(STORE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading store file:', e);
            return {};
        }
    }
    return {};
}

function saveStore(data) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

export async function serve(options) {
    const port = options.port || PORT;

    const server = http.createServer((req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);

        if (req.method === 'GET' && url.pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/next-id') {
            const project = url.searchParams.get('project') || 'default';

            // Atomic-like operation (Node.js is single threaded for this)
            const store = loadStore();

            if (!store[project]) {
                store[project] = 0;
            }

            store[project]++;
            saveStore(store);

            const seq = String(store[project]).padStart(3, '0');
            const id = `RT-${seq}`;

            console.log(`[${new Date().toISOString()}] Issued ${id} for project '${project}'`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, project }));
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    });

    server.listen(port, () => {
        console.log(`AODW ID Server running on port ${port}`);
        console.log(`Store file: ${STORE_FILE}`);
    });
}
