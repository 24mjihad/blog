const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { serializePosts } = require('./serialize');
const { createGitSync } = require('./git');

const ROOT = path.join(__dirname, '..');
const BLOG_DATA = path.join(ROOT, 'blog-data.js');
const EDITOR_DIR = __dirname;
const PORT = Number(process.env.BLOG_EDITOR_PORT) || 3847;
const GIT_PUSH_ENABLED = process.env.BLOG_EDITOR_GIT_PUSH !== '0';
const gitSync = createGitSync(ROOT);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function loadPosts() {
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
    serveStatic(res, path.join(ROOT, 'assets', 'style.css'));
    return;
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
