const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { serializePosts } = require('./serialize');
const { createGitSync } = require('./git');
const { createImagesApi } = require('./images-api');

const ROOT = path.join(__dirname, '..');
const BLOG_DATA = path.join(ROOT, 'blog-data.js');
const BLOG_JSON = path.join(ROOT, 'blog-data.json');
const POSTS_VERSION = path.join(ROOT, 'posts-version.txt');
const EDITOR_DIR = __dirname;
const PORT = Number(process.env.BLOG_EDITOR_PORT) || 3847;
const GIT_PUSH_ENABLED = process.env.BLOG_EDITOR_GIT_PUSH !== '0';
const gitSync = createGitSync(ROOT);
const imagesApi = createImagesApi(ROOT);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function loadPosts() {
  if (fs.existsSync(BLOG_JSON)) {
    const posts = JSON.parse(fs.readFileSync(BLOG_JSON, 'utf8'));
    if (Array.isArray(posts)) {
      return posts.map(p => ({
        id: p.id,
        date: p.date,
        title: p.title,
        content: p.content ?? '',
      }));
    }
  }

  const code = fs.readFileSync(BLOG_DATA, 'utf8');
  const posts = new Function(`${code}\nreturn POSTS;`)();
  if (!Array.isArray(posts)) {
    throw new Error('blog-data.js must define a POSTS array');
  }
  return posts.map(p => ({
    id: p.id,
    date: p.date,
    title: p.title,
    content: p.content ?? '',
  }));
}

function savePosts(posts) {
  fs.writeFileSync(BLOG_DATA, serializePosts(posts), 'utf8');
  fs.writeFileSync(BLOG_JSON, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  fs.writeFileSync(POSTS_VERSION, String(Date.now()) + '\n', 'utf8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function serveRootFile(res, filePath) {
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
}

function serveStatic(res, filePath) {
  if (!filePath.startsWith(EDITOR_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
}

function validatePosts(posts) {
  if (!Array.isArray(posts)) return 'Expected an array of posts';
  const ids = new Set();
  for (const post of posts) {
    if (!post.id || typeof post.id !== 'string') return 'Each post needs a string id';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.id)) {
      return `Invalid id "${post.id}" — use lowercase letters, numbers, and hyphens`;
    }
    if (ids.has(post.id)) return `Duplicate id "${post.id}"`;
    ids.add(post.id);
    if (!post.date || !/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
      return `Post "${post.id}" needs date in YYYY-MM-DD format`;
    }
    if (!post.title || typeof post.title !== 'string') {
      return `Post "${post.id}" needs a title`;
    }
    if (typeof post.content !== 'string') {
      return `Post "${post.id}" needs string content`;
    }
  }
  return null;
}

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/api/posts' && req.method === 'GET') {
    try {
      sendJson(res, 200, { posts: loadPosts() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === '/api/images' && req.method === 'GET') {
    try {
      sendJson(res, 200, { images: imagesApi.listImages() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === '/api/images' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { filename, dataBase64 } = JSON.parse(body);
      if (!filename || !dataBase64) {
        sendJson(res, 400, { error: 'filename and dataBase64 are required' });
        return;
      }
      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length === 0) {
        sendJson(res, 400, { error: 'Empty image data' });
        return;
      }
      const saved = imagesApi.saveImage(filename, buffer);
      sendJson(res, 200, saved);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === '/api/posts' && req.method === 'PUT') {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      const { posts, commitMessage } = parsed;
      const error = validatePosts(posts);
      if (error) {
        sendJson(res, 400, { error });
        return;
      }
      savePosts(posts);

      let git = null;
      if (GIT_PUSH_ENABLED) {
        try {
          git = await gitSync.pushBlogData({ message: commitMessage });
        } catch (err) {
          git = { ok: false, error: err.message };
        }
      }

      sendJson(res, 200, { ok: true, posts, git });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === '/assets/style.css') {
    serveRootFile(res, path.join(ROOT, 'assets', 'style.css'));
    return;
  }

  if (pathname.startsWith('/assets/images/')) {
    const filePath = imagesApi.resolveImagePath(pathname);
    if (filePath) {
      serveRootFile(res, filePath);
      return;
    }
  }

  if (pathname === '/' || pathname === '/index.html') {
    serveStatic(res, path.join(EDITOR_DIR, 'index.html'));
    return;
  }

  const staticPath = path.join(EDITOR_DIR, pathname);
  if (pathname.endsWith('.css') || pathname.endsWith('.js')) {
    serveStatic(res, staticPath);
    return;
  }

  res.writeHead(404).end('Not found');
}

function start({ open = true } = {}) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      sendJson(res, 500, { error: err.message });
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`Blog editor running at ${url}`);
    if (GIT_PUSH_ENABLED) {
      console.log('Save will commit blog-data.js and push to origin.');
    } else {
      console.log('Git push disabled (BLOG_EDITOR_GIT_PUSH=0).');
    }
    console.log('Press Ctrl+C to stop.');
    if (open) openBrowser(url);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start, loadPosts, savePosts, PORT };
