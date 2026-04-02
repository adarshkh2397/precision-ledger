import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Dashboard Summary
  app.get('/api/dashboard/summary', async (req, res) => {
    try {
      const totalSalesResult = await pool.query(`
        SELECT SUM(cash_sales + online_sales) as total 
        FROM daily_ledger 
        WHERE EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
      `);

      const totalPayablesResult = await pool.query(`
        SELECT SUM(current_balance) as total FROM suppliers
      `);

      const recentPurchasesResult = await pool.query(`
        SELECT p.*, s.name as supplier_name 
        FROM purchase_invoices p
        JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.date DESC LIMIT 5
      `);

      res.json({
        totalSales: parseFloat(totalSalesResult.rows[0]?.total || '0'),
        totalPayables: parseFloat(totalPayablesResult.rows[0]?.total || '0'),
        recentPurchases: recentPurchasesResult.rows
      });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Suppliers
  app.get('/api/suppliers', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/suppliers', async (req, res) => {
    const { name, contact, phone, gst_number, invoice_format } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO suppliers (name, contact, phone, gst_number, invoice_format) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, contact, phone, gst_number, invoice_format]
      );
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contact, phone, gst_number, invoice_format } = req.body;
    try {
      await pool.query(
        'UPDATE suppliers SET name = $1, contact = $2, phone = $3, gst_number = $4, invoice_format = $5 WHERE id = $6',
        [name, contact, phone, gst_number, invoice_format, id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Cannot delete supplier with existing invoices' });
    }
  });

  // Purchases
  app.get('/api/purchases', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT p.*, s.name as supplier_name 
        FROM purchase_invoices p
        JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.date DESC
      `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/purchases', async (req, res) => {
    const { supplier_id, invoice_number, date, taxable_amount, tax_amount, gross_total, transport_charge, grand_total } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(`
        INSERT INTO purchase_invoices (supplier_id, invoice_number, date, taxable_amount, tax_amount, gross_total, transport_charge, grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [supplier_id, invoice_number, date, taxable_amount, tax_amount, gross_total, transport_charge, grand_total]);

      await client.query('UPDATE suppliers SET current_balance = current_balance + $1 WHERE id = $2', [grand_total, supplier_id]);

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Purchase creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  app.put('/api/purchases/:id', async (req, res) => {
    const { id } = req.params;
    const { supplier_id, invoice_number, date, taxable_amount, tax_amount, gross_total, transport_charge, grand_total } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const oldPurchaseResult = await client.query('SELECT supplier_id, grand_total FROM purchase_invoices WHERE id = $1', [id]);
      const oldPurchase = oldPurchaseResult.rows[0];
      
      if (oldPurchase) {
        // Revert old balance
        await client.query('UPDATE suppliers SET current_balance = current_balance - $1 WHERE id = $2', [oldPurchase.grand_total, oldPurchase.supplier_id]);
        
        // Update invoice
        await client.query(`
          UPDATE purchase_invoices 
          SET supplier_id = $1, invoice_number = $2, date = $3, taxable_amount = $4, tax_amount = $5, gross_total = $6, transport_charge = $7, grand_total = $8
          WHERE id = $9
        `, [supplier_id, invoice_number, date, taxable_amount, tax_amount, gross_total, transport_charge, grand_total, id]);

        // Add new balance
        await client.query('UPDATE suppliers SET current_balance = current_balance + $1 WHERE id = $2', [grand_total, supplier_id]);
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Purchase update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  app.delete('/api/purchases/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const purchaseResult = await client.query('SELECT supplier_id, grand_total FROM purchase_invoices WHERE id = $1', [id]);
      const purchase = purchaseResult.rows[0];
      
      if (purchase) {
        await client.query('UPDATE suppliers SET current_balance = current_balance - $1 WHERE id = $2', [purchase.grand_total, purchase.supplier_id]);
        await client.query('DELETE FROM purchase_invoices WHERE id = $1', [id]);
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // Daily Ledger
  app.get('/api/ledger', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM daily_ledger ORDER BY date DESC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/ledger/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM daily_expenses WHERE ledger_id = $1', [id]);
      await client.query('DELETE FROM daily_ledger WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  app.post('/api/ledger', async (req, res) => {
    const { date, cash_sales, online_sales, expenses } = req.body;
    
    const totalExpenses = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const netBalance = (cash_sales + online_sales) - totalExpenses;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ledgerResult = await client.query(`
        INSERT INTO daily_ledger (date, cash_sales, online_sales, total_expenses, net_balance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (date) DO UPDATE SET
          cash_sales = EXCLUDED.cash_sales,
          online_sales = EXCLUDED.online_sales,
          total_expenses = EXCLUDED.total_expenses,
          net_balance = EXCLUDED.net_balance
        RETURNING id
      `, [date, cash_sales, online_sales, totalExpenses, netBalance]);

      const ledgerId = ledgerResult.rows[0].id;
      
      // Clear existing expenses if replacing
      await client.query('DELETE FROM daily_expenses WHERE ledger_id = $1', [ledgerId]);

      for (const exp of expenses) {
        await client.query('INSERT INTO daily_expenses (ledger_id, description, amount) VALUES ($1, $2, $3)', [ledgerId, exp.description, exp.amount]);
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Ledger entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // Payments
  app.post('/api/payments', async (req, res) => {
    const { supplier_id, date, amount, method } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO supplier_payments (supplier_id, date, amount, method) VALUES ($1, $2, $3, $4)', [supplier_id, date, amount, method]);
      await client.query('UPDATE suppliers SET current_balance = current_balance - $1 WHERE id = $2', [amount, supplier_id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
