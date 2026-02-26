import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("jian_v2.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL DEFAULT 0,
    purchase_date TEXT,
    fuzzy_date TEXT, -- '今年', '去年', '几年前', '不久前'
    location TEXT,
    notes TEXT,
    is_hesitation INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'discarded', 'gifted', 'sold'
    removed_date TEXT,
    selling_price REAL,
    recipient TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    action TEXT NOT NULL, -- 'add', 'discard', 'keep', 'gift', 'sell'
    item_name TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/items", (req, res) => {
    const items = db.prepare("SELECT * FROM items WHERE status = 'active' ORDER BY category ASC, created_at DESC").all();
    res.json(items);
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.delete("/api/categories/:id", (req, res) => {
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/export", (req, res) => {
    const items = db.prepare("SELECT * FROM items").all();
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { name, category, price, purchase_date, fuzzy_date, location, is_hesitation, notes } = req.body;
    const info = db.prepare(`
      INSERT INTO items (name, category, price, purchase_date, fuzzy_date, location, is_hesitation, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(name, category, price, purchase_date, fuzzy_date, location, is_hesitation ? 1 : 0, notes);
    
    // Log the addition
    db.prepare(`
      INSERT INTO logs (item_id, action, item_name, date)
      VALUES (?, 'add', ?, ?)
    `).run(info.lastInsertRowid, name, new Date().toISOString().split('T')[0]);

    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/items/:id", (req, res) => {
    const { name, category, price, purchase_date, fuzzy_date, location, is_hesitation, notes } = req.body;
    db.prepare(`
      UPDATE items 
      SET name = ?, category = ?, price = ?, purchase_date = ?, fuzzy_date = ?, location = ?, is_hesitation = ?, notes = ?
      WHERE id = ?
    `).run(name, category, price, purchase_date, fuzzy_date, location, is_hesitation ? 1 : 0, notes, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/items/:id", (req, res) => {
    db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM logs WHERE item_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/items/:id/discard", (req, res) => {
    const now = new Date().toISOString().split('T')[0];
    const item = db.prepare("SELECT name FROM items WHERE id = ?").get(req.params.id) as { name: string } | undefined;
    
    if (item) {
      db.prepare("UPDATE items SET status = 'discarded', removed_date = ? WHERE id = ?").run(now, req.params.id);
      
      // Log the discard
      db.prepare(`
        INSERT INTO logs (item_id, action, item_name, date)
        VALUES (?, 'discard', ?, ?)
      `).run(req.params.id, item.name, now);
    }
    res.json({ success: true });
  });

  app.post("/api/items/:id/hesitation-action", (req, res) => {
    const { action, recipient, selling_price } = req.body; // 'keep', 'discard', 'gift', 'sell'
    const now = new Date().toISOString().split('T')[0];
    const item = db.prepare("SELECT name FROM items WHERE id = ?").get(req.params.id) as { name: string } | undefined;
    
    if (item) {
      if (action === 'keep') {
        db.prepare("UPDATE items SET is_hesitation = 0 WHERE id = ?").run(req.params.id);
      } else {
        const statusMap: Record<string, string> = {
          discard: 'discarded',
          gift: 'gifted',
          sell: 'sold'
        };
        db.prepare(`
          UPDATE items 
          SET status = ?, removed_date = ?, recipient = ?, selling_price = ? 
          WHERE id = ?
        `).run(statusMap[action], now, recipient || null, selling_price || null, req.params.id);
      }
      
      // Log the action
      db.prepare(`
        INSERT INTO logs (item_id, action, item_name, date, note)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.params.id, action, item.name, now, recipient ? `赠予: ${recipient}` : (selling_price ? `售价: ¥${selling_price}` : null));
    }
    res.json({ success: true });
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM logs ORDER BY date DESC, id DESC").all();
    res.json(logs);
  });

  app.get("/api/stats", (req, res) => {
    const categoryStats = db.prepare("SELECT category, COUNT(*) as count, SUM(price) as total_value FROM items WHERE status = 'active' GROUP BY category").all();
    
    const discardedCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'discarded'").get() as any;
    const giftedCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'gifted'").get() as any;
    const soldCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'sold'").get() as any;
    const totalSoldValue = db.prepare("SELECT SUM(selling_price) as total FROM items WHERE status = 'sold'").get() as any;

    const history = db.prepare(`
      SELECT date, 
             SUM(CASE 
               WHEN action = 'add' THEN 1 
               WHEN action IN ('discard', 'gift', 'sell') THEN -1 
               ELSE 0 
             END) as change
      FROM logs 
      GROUP BY date 
      ORDER BY date ASC
    `).all();
    res.json({ 
      categoryStats, 
      history,
      summary: {
        discarded: discardedCount.count,
        gifted: giftedCount.count,
        sold: soldCount.count,
        soldValue: totalSoldValue.total || 0
      }
    });
  });

  app.get("/api/items/archived/:status", (req, res) => {
    const items = db.prepare("SELECT * FROM items WHERE status = ? ORDER BY removed_date DESC").all(req.params.status);
    res.json(items);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
