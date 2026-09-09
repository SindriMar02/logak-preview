/* Minimal static server for the Lögák client build. */
const http = require('http')
const fs = require('fs')
const path = require('path')
const ROOT = require('path').join(__dirname)
const PORT = Number(process.env.PORT || 8791)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain'
}
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  // directory index: this build has real subdirectories (/uppsetningar/, the practice
  // area pages), and without this every one of them 404s while the file sits right there
  if (p.endsWith('/')) p += 'index.html'
  const file = path.join(ROOT, p)
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return }
    // no-store: without it Chrome heuristically caches app.js/styles.css and you
    // end up reviewing a build from several edits ago
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    })
    res.end(data)
  })
}).listen(PORT, () => console.log('logak on :' + PORT))
