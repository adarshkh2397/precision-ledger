import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
pg.types.setTypeParser(pg.types.builtins.DATE, (val) => val);
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

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

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
    const { name, phone, gst_number, invoice_format } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO suppliers (name, phone, gst_number, invoice_format) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, phone, gst_number, invoice_format]
      );
      res.json({ id: result.rows[0].id });
    } catch (error) {
      console.error('Supplier creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/suppliers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contact, phone, gst_number, invoice_format } = req.body;
    try {
      await pool.query(
        'UPDATE suppliers SET name = $1, phone = $2, gst_number = $3, invoice_format = $4 WHERE id = $5',
        [name, phone, gst_number, invoice_format, id]
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
        SELECT p.*, s.name as supplier_name,
               (p.cgst_amount + p.sgst_amount) AS tax_amount
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
    const { supplier_id, invoice_number, date, taxable_amount, gst_percent, cgst_amount, sgst_amount, gross_total, transport_charge, grand_total } = req.body;
    const rate = Number(gst_percent ?? 2.5) || 2.5;
    const taxable = Number(taxable_amount) || 0;
    const cgst = Number(cgst_amount ?? (taxable * rate / 100)) || 0;
    const sgst = Number(sgst_amount ?? (taxable * rate / 100)) || 0;
    const grossTotal = Number(gross_total ?? taxable + cgst + sgst) || taxable + cgst + sgst;
    const grandTotal = Number(grand_total ?? grossTotal + Number(transport_charge || 0)) || grossTotal + Number(transport_charge || 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(`
        INSERT INTO purchase_invoices (supplier_id, invoice_number, date, taxable_amount, gst_percent, cgst_amount, sgst_amount, gross_total, transport_charge, grand_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [supplier_id, invoice_number, date, taxable, rate, cgst, sgst, grossTotal, transport_charge, grandTotal]);

      await client.query('UPDATE suppliers SET current_balance = current_balance + $1 WHERE id = $2', [grandTotal, supplier_id]);

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
    const { supplier_id, invoice_number, date, taxable_amount, gst_percent, cgst_amount, sgst_amount, gross_total, transport_charge, grand_total } = req.body;
    const rate = Number(gst_percent ?? 2.5) || 2.5;
    const taxable = Number(taxable_amount) || 0;
    const cgst = Number(cgst_amount ?? (taxable * rate / 100)) || 0;
    const sgst = Number(sgst_amount ?? (taxable * rate / 100)) || 0;
    const grossTotal = Number(gross_total ?? taxable + cgst + sgst) || taxable + cgst + sgst;
    const grandTotal = Number(grand_total ?? grossTotal + Number(transport_charge || 0)) || grossTotal + Number(transport_charge || 0);
    
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
          SET supplier_id = $1, invoice_number = $2, date = $3, taxable_amount = $4, gst_percent = $5, cgst_amount = $6, sgst_amount = $7, gross_total = $8, transport_charge = $9, grand_total = $10
          WHERE id = $11
        `, [supplier_id, invoice_number, date, taxable, rate, cgst, sgst, grossTotal, transport_charge, grandTotal, id]);

        // Add new balance
        await client.query('UPDATE suppliers SET current_balance = current_balance + $1 WHERE id = $2', [grandTotal, supplier_id]);
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

  const HMR_PORT = parseInt(process.env.HMR_PORT || '24679', 10);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Starting Vite middleware with HMR port ${HMR_PORT}`);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: HMR_PORT,
          host: 'localhost',
        },
      },
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
