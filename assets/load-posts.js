// Loads blog posts without browser cache issues on GitHub Pages.
// posts-version.txt is bumped on every editor save so ?v= always changes.

let POSTS = [];

async function fetchBlogPosts() {
  const version = await fetch('posts-version.txt', { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : ''))
    .catch(() => '');

  const cacheBust = version.trim() || String(Date.now());
  const url = `blog-data.json?v=${encodeURIComponent(cacheBust)}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load blog data (${res.status})`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('blog-data.json must be an array of posts');
  }

  POSTS = data;
  return POSTS;
}
