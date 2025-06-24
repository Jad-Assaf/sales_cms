// app/routes/api.shopify-webhook.ts
import { json, type LoaderFunction, type ActionFunction } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  console.log('🔍 [loader] GET /api/shopify-webhook');
  return json({ message: 'POST only' });
};

export const action: ActionFunction = async ({ request }) => {
  console.log('🔔 [action] POST /api/shopify-webhook start');
  try {
    // Log entire request headers
    console.log('📋 Request headers:', JSON.stringify(Object.fromEntries(request.headers)));

    // Read and log raw body
    const raw = await request.text();
    console.log('📥 Raw body:', raw);

    // Parse JSON
    let body: any;
    try {
      body = JSON.parse(raw);
      console.log('✅ Parsed body:', body);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Log environment vars and DB config
    console.log('🔧 Environment:', {
      DATABASE_URL: process.env.DATABASE_URL?.slice(0, 50) + '…',
    });

    console.log('🔧 DB pool options:', {
      ssl: Boolean((db as any).options?.ssl),
    });

    // Destructure
    const { id, created_at, customer, email, phone, total_price, currency } = body;
    console.log('🔎 Fields to insert:', { id, created_at, email, phone, total_price, currency });

    const orderId = String(id);
    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'Unknown';

    // Build and log query
    const text = `
      INSERT INTO orders
        (id, created_at, customer_name, email, phone, total_price, currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO NOTHING
    `;
    const values = [
      orderId,
      created_at,
      customerName,
      email,
      phone,
      total_price,
      currency,
    ];
    console.log('📨 Executing query:', text.trim(), 'with', values);

    // Execute
    const result = await db.query(text, values);
    console.log('✅ Query result:', { command: result.command, rowCount: result.rowCount });

    return json({ success: true });
  } catch (err: any) {
    // Log full error
    console.error('❌ [action] Unhandled error:', err.stack || err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
