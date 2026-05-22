import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Setup multer
  const upload = multer({ dest: 'uploads/' });

  // API router / endpoints
  app.post('/api/import-export/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    res.json({ fileId: req.file.filename, originalName: req.file.originalname });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const distPath = path.join(process.cwd(), 'build');
  const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(distPath);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get('*all', async (req, res, next) => {
      const url = req.originalUrl;

      // Skip API requests so they don't get routed to HTML templates
      if (url.startsWith('/api/')) {
        return next();
      }

      // Determine which HTML file to serve
      let filename = 'index.html';
      if (url.includes('.html')) {
        const basename = path.basename(url.split('?')[0]);
        if (basename) {
          filename = basename;
        }
      } else {
        // Handle routes that point to specific multi-app entries if requested,
        // otherwise default to index.html (SPA)
        const parts = url.split('/');
        const firstSegment = parts[1]?.split('?')[0];
        if (firstSegment && ['project-wizards', 'marketing', 'insights', 'inventory', 'it'].includes(firstSegment)) {
          filename = `${firstSegment}.html`;
        }
      }

      const filePath = path.resolve(process.cwd(), filename);
      if (fs.existsSync(filePath)) {
        try {
          let template = fs.readFileSync(filePath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
          return;
        }
      }

      // Fallback to main index.html
      try {
        const fallbackPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(fallbackPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
