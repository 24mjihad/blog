const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execFileAsync = promisify(execFile);

function createGitSync(rootDir) {
  async function runGit(args) {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: rootDir,
        windowsHide: true,
      });
      return (stdout || stderr || '').trim();
    } catch (err) {
      const detail = (err.stderr || err.stdout || err.message || '').trim();
      throw new Error(detail || `git ${args[0]} failed`);
    }
  }

  async function isRepo() {
    try {
      await runGit(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async function hasStagedChanges() {
    try {
      await runGit(['diff', '--cached', '--quiet']);
      return false;
    } catch {
      return true;
    }
  }

  async function pushBlogData({ message } = {}) {
    if (!(await isRepo())) {
      return { ok: false, skipped: true, reason: 'Not a git repository' };
    }

    let branch;
    try {
      branch = await runGit(['branch', '--show-current']);
    } catch (err) {
      return { ok: false, error: err.message };
    }

    if (!branch) {
      return { ok: false, error: 'Could not detect current git branch' };
    }

    await runGit(['add', 'blog-data.js']);

    if (!(await hasStagedChanges())) {
      return { ok: true, skipped: true, reason: 'No changes to commit' };
    }

    const commitMsg = message || 'Update blog posts';
    await runGit(['commit', '-m', commitMsg]);
    await runGit(['push', 'origin', branch]);

    return { ok: true, pushed: true, branch, message: commitMsg };
  }

  return { pushBlogData };
}

module.exports = { createGitSync };
