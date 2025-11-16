/**
 * @fileoverview WebSocket server for real-time scraping progress updates
 * @module server/ResultsServer
 */
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';

/**
 * Results WebSocket server for real-time progress streaming
 */
export class ResultsServer {
    /**
     * @param {number} port - Port to listen on
     */
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.clients = new Set();
    }

    /**
     * Start the WebSocket server and HTTP file server
     * @returns {Promise<void>}
     */
    async start() {
        const server = http.createServer(async (req, res) => {
            if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                const html = await this.getIndexHtml();
                res.end(html);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        this.wss = new WebSocket.Server({ server });

        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.on('close', () => this.clients.delete(ws));
        });

        server.listen(this.port, () => {
            console.log(`📊 Results viewer running on ws://localhost:${this.port}`);
        });
    }

    /**
     * Broadcast a progress update to all connected clients
     * @param {object} update - Progress update object
     */
    broadcast(update) {
        const message = JSON.stringify(update);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * Get the HTML for the results viewer
     * @returns {Promise<string>}
     */
    async getIndexHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Obsidian MCP Actor - Results Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 10px; }
        .stat { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; text-align: center; }
        .stat .value { font-size: 24px; font-weight: bold; }
        .stat .label { font-size: 12px; opacity: 0.8; }
        .results { display: grid; gap: 10px; }
        .result { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
        .result.success { border-left-color: #27ae60; }
        .result.error { border-left-color: #e74c3c; }
        .result-title { font-weight: bold; margin-bottom: 5px; }
        .result-url { font-size: 12px; color: #7f8c8d; margin-bottom: 5px; }
        .result-tags { font-size: 12px; margin-top: 5px; }
        .tag { display: inline-block; background: #ecf0f1; color: #2c3e50; padding: 2px 8px; border-radius: 3px; margin-right: 5px; }
        .error-text { color: #e74c3c; font-size: 12px; margin-top: 5px; }
        .loading { text-align: center; padding: 20px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Obsidian MCP Actor Results</h1>
            <div class="stats">
                <div class="stat">
                    <div class="value" id="total">0</div>
                    <div class="label">Total</div>
                </div>
                <div class="stat">
                    <div class="value" id="successful" style="color: #27ae60;">0</div>
                    <div class="label">Successful</div>
                </div>
                <div class="stat">
                    <div class="value" id="failed" style="color: #e74c3c;">0</div>
                    <div class="label">Failed</div>
                </div>
            </div>
        </div>
        <div id="results" class="results">
            <div class="loading">Waiting for updates...</div>
        </div>
    </div>
    <script>
        const ws = new WebSocket(\`ws://\${window.location.hostname}:${this.port}\`);
        let updates = [];
        let stats = { total: 0, successful: 0, failed: 0 };

        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            updates.push(update);
            
            stats.total++;
            if (update.success) stats.successful++;
            else stats.failed++;
            
            render();
        };

        function render() {
            document.getElementById('total').textContent = stats.total;
            document.getElementById('successful').textContent = stats.successful;
            document.getElementById('failed').textContent = stats.failed;
            
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = updates.map(u => \`
                <div class="result \${u.success ? 'success' : 'error'}">
                    <div class="result-title">\${u.success ? '✓' : '✗'} \${u.title || u.url}</div>
                    <div class="result-url">\${u.url}</div>
                    \${u.success ? \`<div class="result-tags">\${u.tags.map(t => \`<span class="tag">\${t}</span>\`).join('')}</div>\` : ''}
                    \${u.error ? \`<div class="error-text">\${u.error}</div>\` : ''}
                </div>
            \`).join('');
        }

        ws.onerror = () => {
            document.getElementById('results').innerHTML = '<div class="loading" style="color: #e74c3c;">Connection error</div>';
        };
    </script>
</body>
</html>`;
    }
}
