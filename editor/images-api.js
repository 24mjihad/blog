const fs = require('fs');
const path = require('path');

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function createImagesApi(rootDir) {
  const imagesDir = path.join(rootDir, 'assets', 'images');

  function ensureDir() {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  function safeFilename(name) {
    const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '');
    if (!base || !IMAGE_EXT.test(base)) {
      throw new Error('Filename must end in .jpg, .jpeg, .png, .gif, or .webp');
    }
    return base;
  }

  function listImages() {
    ensureDir();
    return fs.readdirSync(imagesDir)
      .filter(f => IMAGE_EXT.test(f))
      .sort((a, b) => a.localeCompare(b));
  }

  function saveImage(filename, buffer) {
    ensureDir();
    const safe = safeFilename(filename);
    const filePath = path.join(imagesDir, safe);
    if (!filePath.startsWith(imagesDir)) {
      throw new Error('Invalid image path');
    }
    fs.writeFileSync(filePath, buffer);
    return {
      name: safe,
      path: `assets/images/${safe}`,
    };
  }

  function resolveImagePath(urlPath) {
    const relative = urlPath.replace(/^\//, '');
    const filePath = path.join(rootDir, relative);
    if (!filePath.startsWith(imagesDir) || !fs.existsSync(filePath)) {
      return null;
    }
    return filePath;
  }

  return { listImages, saveImage, resolveImagePath, imagesDir };
}

module.exports = { createImagesApi };
