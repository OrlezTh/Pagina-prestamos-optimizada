/**
 * servidor.js — Servidor local para Gestión de Préstamos
 * ─────────────────────────────────────────────────────────
 * Guarda y lee los datos en datos.json (misma carpeta).
 * 
 * CÓMO USARLO:
 *   1. Tener Node.js instalado (node -v para verificar)
 *   2. Abrir terminal en esta carpeta
 *   3. Ejecutar:  node servidor.js
 *   4. Abrir en el navegador:  http://localhost:3000
 * ─────────────────────────────────────────────────────────
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = 3000;
const DATA_FILE  = path.join(__dirname, 'datos.json');
const PUBLIC_DIR = __dirname;

// ── Tipos MIME para servir archivos estáticos ────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// ── Inicializar datos.json si no existe ──────────────────────
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✓ datos.json creado');
}

// ── Servidor HTTP ────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url    = req.url;
  const method = req.method;

  // CORS headers (por si acaso)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API: GET /api/prestamos → devuelve datos.json ──────────
  if (url === '/api/prestamos' && method === 'GET') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: 'No se pudo leer datos.json' }));
    }
    return;
  }

  // ── API: POST /api/prestamos → guarda datos.json ───────────
  if (url === '/api/prestamos' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const bonito = JSON.stringify(parsed, null, 2);
        fs.writeFileSync(DATA_FILE, bonito, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, guardados: parsed.length }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'JSON inválido' }));
      }
    });
    return;
  }

  // ── Archivos estáticos ─────────────────────────────────────
  let filePath = url === '/' ? '/index.html' : url;
  // Quitar query strings si los hay
  filePath = filePath.split('?')[0];
  const fullPath = path.join(PUBLIC_DIR, filePath);
  const ext      = path.extname(fullPath).toLowerCase();

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - Archivo no encontrado: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   Gestión de Préstamos — Servidor    ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Abrí:  http://localhost:${PORT}         ║`);
  console.log(`  ║  Datos: datos.json (esta carpeta)    ║`);
  console.log('  ║  Ctrl+C para detener                 ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
