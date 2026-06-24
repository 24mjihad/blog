# Personal Blog

A minimal personal site + blog, designed to be hosted on GitHub Pages.

## Setup (one-time, ~5 minutes)

### 1. Create a GitHub repo

Create a new repo named **`yourusername.github.io`** (replace with your actual GitHub username).
This special name makes GitHub Pages serve it at `https://yourusername.github.io`.

### 2. Push these files

```bash
cd blog/
git init
git add .
git commit -m "Initial blog"
git remote add origin https://github.com/yourusername/yourusername.github.io.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo on GitHub
2. Settings → Pages
3. Under **Source**, select `Deploy from a branch`
4. Branch: `main`, folder: `/ (root)`
5. Click Save

Your site will be live at `https://yourusername.github.io` within ~60 seconds.

---

## Customizing your bio

Edit **`index.html`** and update:
- Your name in `<h1 class="name">`
- The `<p class="bio-text">` paragraph
- Your links (email, GitHub, Twitter, CV)

---

## Adding a new blog post

**This is the only file you need to edit:** `blog-data.js`

Copy this template and add it to the `POSTS` array:

```js
{
  id: "my-post-slug",          // unique id, used in the URL (?id=my-post-slug)
  date: "2026-07-01",          // YYYY-MM-DD format
  title: "My Post Title",
  content: `
## First Section

Your markdown content here. You can use **bold**, *italics*, \`code\`, links, lists, etc.

## Second Section

Another section. Any h2 and h3 headings automatically appear in the table of contents sidebar.
  `
},
```

Then commit and push:

```bash
git add blog-data.js
git commit -m "Add post: My Post Title"
git push
```

Your site updates automatically in ~30 seconds.

---

## File structure

```
/
├── index.html        ← Home page (bio + blog list)
├── post.html         ← Individual post page (shared template)
├── blog-data.js      ← ✏️  THE ONLY FILE YOU EDIT TO ADD POSTS
├── assets/
│   ├── style.css     ← Styles (edit to change fonts/colors)
│   ├── blog.js       ← Shared helpers (no need to edit)
│   └── cv.pdf        ← Add your CV here (optional)
├── .nojekyll         ← Tells GitHub Pages not to use Jekyll
├── edit-blog.js      ← Run the local post editor (see below)
├── editor/           ← Editor app (used by edit-blog.js)
└── README.md         ← This file
```

## Visual post editor

Instead of hand-editing `blog-data.js`, run the local editor:

```bash
node edit-blog.js
```

This opens a browser UI where you can:

- Create and edit posts with a markdown editor (line numbers, toolbar)
- See a **live preview** styled like your published blog
- Save changes directly back to `blog-data.js` (Ctrl+S)
- **Auto-commit and push** `blog-data.js` to GitHub on save

Requires [Node.js](https://nodejs.org/) — no npm install needed. Git must be installed with a configured `origin` remote. If push fails, the file is still saved locally and the error shows in the status bar.

To disable auto-push: `set BLOG_EDITOR_GIT_PUSH=0` (Windows) or `BLOG_EDITOR_GIT_PUSH=0 node edit-blog.js` (Mac/Linux).

## Writing tips

- Write posts in **Markdown** inside the `content` field of `blog-data.js`
- Use `##` and `###` headings — they auto-populate the table of contents
- The posts are sorted newest-first automatically

## Custom domain (optional)

If you want `yourdomain.com` to point to your blog:

1. Buy a domain (Namecheap, Cloudflare, etc.)
2. In your repo, create a file called `CNAME` containing just your domain: `yourdomain.com`
3. In your DNS settings, add a CNAME record pointing to `yourusername.github.io`
4. In GitHub Pages settings, add your custom domain

GitHub handles HTTPS automatically.
