// Shared helpers for index.html and post.html

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

function uniqueSlug(text, used) {
  let slug = slugify(text);
  let candidate = slug;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${n++}`;
  }
  used.add(candidate);
  return candidate;
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function findPost(id) {
  return POSTS.find(p => p.id === id);
}

function buildTableOfContents(contentEl, tocEl) {
  const used = new Set();
  const headings = contentEl.querySelectorAll('h2, h3');

  headings.forEach(h => {
    h.id = uniqueSlug(h.textContent, used);

    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.className = h.tagName === 'H3' ? 'toc-link toc-sub' : 'toc-link';

    const item = document.createElement('div');
    item.appendChild(a);
    tocEl.appendChild(item);
  });

  return headings;
}

function highlightTocOnScroll(tocEl, headings) {
  const tocLinks = tocEl.querySelectorAll('a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const active = tocEl.querySelector(`a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '0px 0px -70% 0px' });

  headings.forEach(h => observer.observe(h));
}
