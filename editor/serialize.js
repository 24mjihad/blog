const HEADER = `// ============================================================
//  BLOG DATA — edit this file to add or update posts
//
//  To add a new post:
//  1. Copy one of the objects below
//  2. Give it a unique \`id\` (used in the URL)
//  3. Fill in \`date\`, \`title\`, and \`content\` (markdown)
//  4. Push to GitHub — your site updates automatically
// ============================================================

const POSTS = [
`;

function escapeTemplateLiteral(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function serializePost(post) {
  const content = (post.content ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^\n/, '')
    .trimEnd();
  const escaped = escapeTemplateLiteral(content);

  return `  {
    id: ${JSON.stringify(post.id)},
    date: ${JSON.stringify(post.date)},
    title: ${JSON.stringify(post.title)},
    content: \`
${escaped}
    \`
  }`;
}

function serializePosts(posts) {
  if (posts.length === 0) {
    return HEADER + '\n];\n';
  }
  return HEADER + '\n' + posts.map(serializePost).join(',\n\n') + '\n\n];\n';
}

module.exports = { serializePosts };
