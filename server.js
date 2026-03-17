import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(userDataPath, port = 3000) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Use the userDataPath provided by Electron, or fallback to local directory
  const dbPath = path.join(userDataPath || __dirname, 'database.db');
  console.log(`Initializing SQLite database at: ${dbPath}`);
  
  const db = new Database(dbPath);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updatedAt INTEGER
    )
  `);

  // Simple API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbPath });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  return app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
  });
}

// If run directly (e.g., via npm run dev)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer(process.cwd(), 3000);
}
