import express from 'express';
import path from 'path';
import { pathToFileURL } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/api';

export { apiRouter };

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Serve static public assets if needed
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Ecommerce Server running on http://0.0.0.0:${PORT}`);
  });
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
