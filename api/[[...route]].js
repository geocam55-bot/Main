const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // Don't handle API routes here
  if (req.url && req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // Serve SPA fallback for all other routes
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).send(html);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
};
