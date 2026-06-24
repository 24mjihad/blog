(function () {
  const $ = id => document.getElementById(id);

  const postNav = $('post-nav');
  const statusEl = $('status');
  const btnSave = $('btn-save');
  const btnNew = $('btn-new');
  const btnDelete = $('btn-delete');
  const fieldTitle = $('field-title');
  const fieldDate = $('field-date');
  const fieldId = $('field-id');
  const fieldContent = $('field-content');
  const previewDate = $('preview-date');
  const previewTitle = $('preview-title');
  const previewContent = $('preview-content');
  const toolbar = $('toolbar');
  const btnImg = $('btn-img');
  const imgModal = $('img-modal');
  const imgModalBackdrop = $('img-modal-backdrop');
  const imgAlt = $('img-alt');
  const imgUpload = $('img-upload');
  const imgGrid = $('img-grid');
  const imgInsert = $('img-insert');
  const imgCancel = $('img-cancel');

  const IMAGE_MAX_WIDTH = 680;

  let selectedImage = null;
  let selectedImageWidth = IMAGE_MAX_WIDTH;

  let posts = [];
  let activeId = null;
  let dirty = false;
  let idManuallyEdited = false;
  let previewTimer = null;

  const cm = CodeMirror.fromTextArea(fieldContent, {
    mode: 'markdown',
    theme: 'neat',
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    indentWithTabs: false,
  });

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function formatDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function todayISO() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function setStatus(text, kind = '') {
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ` ${kind}` : '');
  }

  function markDirty() {
    dirty = true;
    btnSave.disabled = false;
    setStatus('Unsaved changes', 'dirty');
  }

  function markClean() {
    dirty = false;
    setStatus('All changes saved', 'saved');
  }

  function getActivePost() {
    return posts.find(p => p.id === activeId) ?? null;
  }

  function syncFieldsToPost() {
    const post = getActivePost();
    if (!post) return;
    post.title = fieldTitle.value;
    post.date = fieldDate.value;
    post.id = fieldId.value.trim();
    post.content = cm.getValue();
  }

  function syncPostToFields(post) {
    fieldTitle.value = post.title;
    fieldDate.value = post.date;
    fieldId.value = post.id;
    cm.setValue(post.content);
    cm.refresh();
    updatePreview();
  }

  function updatePreview() {
    const title = fieldTitle.value || 'Untitled';
    const date = fieldDate.value;
    previewTitle.textContent = title;
    previewDate.textContent = date ? formatDate(date) : '';
    previewContent.innerHTML = marked.parse(cm.getValue() || '_Start writing to see a preview._');
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 120);
  }

  function renderPostNav() {
    postNav.innerHTML = '';
    const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(post => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = post.id === activeId ? 'active' : '';
      btn.innerHTML = `
        <span class="nav-title">${escapeHtml(post.title || 'Untitled')}</span>
        <span class="nav-date">${escapeHtml(formatDate(post.date))}</span>
      `;
      btn.addEventListener('click', () => selectPost(post.id));
      li.appendChild(btn);
      postNav.appendChild(li);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function confirmDiscard() {
    if (!dirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }

  function selectPost(id) {
    if (activeId === id) return;
    if (!confirmDiscard()) return;

    syncFieldsToPost();
    activeId = id;
    idManuallyEdited = true;
    const post = getActivePost();
    if (post) syncPostToFields(post);
    renderPostNav();
    btnDelete.disabled = false;
    markClean();
  }

  function createPost() {
    if (!confirmDiscard()) return;

    syncFieldsToPost();

    let baseId = 'new-post';
    let n = 1;
    while (posts.some(p => p.id === baseId)) {
      baseId = `new-post-${n++}`;
    }

    const post = {
      id: baseId,
      date: todayISO(),
      title: 'Untitled post',
      content: '## Introduction\n\nStart writing here.\n',
    };

    posts.unshift(post);
    activeId = post.id;
    idManuallyEdited = false;
    syncPostToFields(post);
    renderPostNav();
    btnDelete.disabled = false;
    markDirty();
    fieldTitle.focus();
    fieldTitle.select();
  }

  function deletePost() {
    const post = getActivePost();
    if (!post) return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone until you save.`)) return;

    posts = posts.filter(p => p.id !== activeId);
    activeId = posts.length ? posts[0].id : null;
    idManuallyEdited = true;

    if (activeId) {
      syncPostToFields(getActivePost());
      btnDelete.disabled = false;
    } else {
      fieldTitle.value = '';
      fieldDate.value = '';
      fieldId.value = '';
      cm.setValue('');
      btnDelete.disabled = true;
      updatePreview();
    }

    renderPostNav();
    markDirty();
  }

  async function savePosts() {
    syncFieldsToPost();

    const error = validateLocal();
    if (error) {
      setStatus(error, 'error');
      return;
    }

    btnSave.disabled = true;
    setStatus('Saving & pushing…');

    try {
      const title = fieldTitle.value.trim() || 'blog posts';
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts,
          commitMessage: `Update blog: ${title}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      posts = data.posts;
      activeId = posts.find(p => p.id === fieldId.value.trim())?.id ?? activeId;
      renderPostNav();
      markClean();

      const git = data.git;
      if (!git) {
        setStatus('Saved to blog-data.js', 'saved');
      } else if (git.pushed) {
        setStatus(`Saved and pushed to GitHub (${git.branch})`, 'saved');
      } else if (git.skipped) {
        setStatus(`Saved (${git.reason})`, 'saved');
      } else if (git.error) {
        setStatus(`Saved locally — push failed: ${git.error}`, 'error');
        btnSave.disabled = false;
      }
    } catch (err) {
      setStatus(err.message, 'error');
      btnSave.disabled = false;
    }
  }

  function validateLocal() {
    const ids = new Set();
    for (const post of posts) {
      if (!post.id.trim()) return 'Every post needs a URL id';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.id)) {
        return 'URL id must use lowercase letters, numbers, and hyphens only';
      }
      if (ids.has(post.id)) return `Duplicate id "${post.id}"`;
      ids.add(post.id);
      if (!post.date) return `"${post.title}" needs a date`;
      if (!post.title.trim()) return 'Every post needs a title';
    }
    return null;
  }

  function wrapSelection(prefix, suffix) {
    const doc = cm.getDoc();
    const sel = doc.getSelection();
    if (sel) {
      doc.replaceSelection(prefix + sel + suffix);
    } else {
      const cursor = doc.getCursor();
      doc.replaceRange(prefix + suffix, cursor);
      doc.setCursor({ line: cursor.line, ch: cursor.ch + prefix.length });
    }
    cm.focus();
    markDirty();
    schedulePreview();
  }

  function insertLinePrefix(prefix) {
    const doc = cm.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(prefix, { line: cursor.line, ch: 0 });
    cm.focus();
    markDirty();
    schedulePreview();
  }

  function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function buildImageMarkup(imagePath, alt, width) {
    const safeAlt = escapeAttr(alt || 'Image');
    return `\n<img src="${imagePath}" alt="${safeAlt}" width="${width}" />\n`;
  }

  function insertAtCursor(text) {
    const doc = cm.getDoc();
    doc.replaceSelection(text);
    cm.focus();
    markDirty();
    schedulePreview();
  }

  function loadImageDimensions(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = url;
    });
  }

  async function resizeImageFile(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.88));
    if (!blob) throw new Error('Could not resize image');

    const ext = mime === 'image/png' ? '.png' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase() || 'image';
    const filename = `${baseName}${ext}`;

    return { blob, filename, width, height };
  }

  async function uploadImage(blob, filename) {
    const dataBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(String(result).split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(blob);
    });

    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, dataBase64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  function setSelectedImage(imagePath, displayWidth) {
    selectedImage = imagePath;
    selectedImageWidth = Math.min(displayWidth || IMAGE_MAX_WIDTH, IMAGE_MAX_WIDTH);
    imgInsert.disabled = false;
    imgGrid.querySelectorAll('.img-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.path === imagePath);
    });
  }

  async function renderImageGrid(images) {
    imgGrid.innerHTML = '';

    if (images.length === 0) {
      imgGrid.innerHTML = '<p class="img-grid-empty">No images yet — upload one above.</p>';
      return;
    }

    for (const name of images) {
      const imagePath = `assets/images/${name}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'img-option';
      btn.dataset.path = imagePath;
      btn.innerHTML = `
        <img src="/${imagePath}?t=${Date.now()}" alt="" />
        <span>${escapeHtml(name)}</span>
      `;
      btn.addEventListener('click', async () => {
        try {
          const dims = await loadImageDimensions(`/${imagePath}?t=${Date.now()}`);
          const width = Math.min(dims.width, IMAGE_MAX_WIDTH);
          setSelectedImage(imagePath, width);
        } catch {
          setSelectedImage(imagePath, IMAGE_MAX_WIDTH);
        }
      });
      imgGrid.appendChild(btn);
    }
  }

  async function refreshImageGrid(selectPath) {
    const res = await fetch('/api/images');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not list images');
    await renderImageGrid(data.images);
    if (selectPath) {
      const match = imgGrid.querySelector(`[data-path="${selectPath}"]`);
      if (match) match.click();
    }
  }

  function openImageModal() {
    selectedImage = null;
    selectedImageWidth = IMAGE_MAX_WIDTH;
    imgAlt.value = '';
    imgUpload.value = '';
    imgInsert.disabled = true;
    imgModal.hidden = false;
    refreshImageGrid().catch(err => {
      imgGrid.innerHTML = `<p class="img-grid-empty">${escapeHtml(err.message)}</p>`;
    });
    imgAlt.focus();
  }

  function closeImageModal() {
    imgModal.hidden = true;
    selectedImage = null;
    imgInsert.disabled = true;
    cm.focus();
  }

  async function handleImageUpload(file) {
    if (!file) return;
    setStatus('Resizing and uploading image…');
    try {
      const resized = await resizeImageFile(file);
      const saved = await uploadImage(resized.blob, resized.filename);
      await refreshImageGrid(saved.path);
      setSelectedImage(saved.path, resized.width);
      if (!imgAlt.value.trim()) {
        imgAlt.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      }
      setStatus('Image uploaded — click Insert', 'saved');
      markDirty();
    } catch (err) {
      setStatus(err.message, 'error');
    }
  }

  function insertSelectedImage() {
    if (!selectedImage) return;
    const markup = buildImageMarkup(selectedImage, imgAlt.value.trim(), selectedImageWidth);
    insertAtCursor(markup);
    closeImageModal();
  }

  toolbar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || btn.id === 'btn-img') return;

    if (btn.dataset.wrap) {
      wrapSelection(btn.dataset.wrap, btn.dataset.end || '');
    } else if (btn.dataset.line) {
      insertLinePrefix(btn.dataset.line);
    }
  });

  btnImg.addEventListener('click', openImageModal);
  imgCancel.addEventListener('click', closeImageModal);
  imgModalBackdrop.addEventListener('click', closeImageModal);
  imgInsert.addEventListener('click', insertSelectedImage);
  imgUpload.addEventListener('change', e => handleImageUpload(e.target.files[0]));

  fieldTitle.addEventListener('input', () => {
    if (!idManuallyEdited && activeId) {
      const post = getActivePost();
      if (post) {
        const slug = slugify(fieldTitle.value) || post.id;
        fieldId.value = slug;
        post.id = slug;
        activeId = slug;
        renderPostNav();
      }
    }
    markDirty();
    schedulePreview();
  });

  fieldDate.addEventListener('input', () => {
    markDirty();
    schedulePreview();
  });

  fieldId.addEventListener('input', () => {
    idManuallyEdited = true;
    const post = getActivePost();
    if (post) {
      post.id = fieldId.value.trim();
      activeId = post.id;
      renderPostNav();
    }
    markDirty();
  });

  cm.on('change', () => {
    markDirty();
    schedulePreview();
  });

  btnSave.addEventListener('click', savePosts);
  btnNew.addEventListener('click', createPost);
  btnDelete.addEventListener('click', deletePost);

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      savePosts();
    }
  });

  window.addEventListener('beforeunload', e => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  window.addEventListener('resize', () => cm.refresh());

  async function init() {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load posts');

      posts = data.posts;
      if (posts.length === 0) {
        createPost();
        markDirty();
        setStatus('Created a new post — start writing');
        return;
      }

      const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
      activeId = sorted[0].id;
      idManuallyEdited = true;
      syncPostToFields(posts[0]);
      renderPostNav();
      btnDelete.disabled = false;
      markClean();
    } catch (err) {
      setStatus(err.message, 'error');
    }
  }

  init();
})();
