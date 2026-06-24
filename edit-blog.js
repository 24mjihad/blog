#!/usr/bin/env node
/**
 * Local blog editor — run from the project root:
 *
 *   node edit-blog.js
 *
 * Opens a browser UI to create and edit posts with live markdown preview,
 * then saves changes back to blog-data.js.
 */
require('./editor/server').start();
