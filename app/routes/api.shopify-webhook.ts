// app/routes/api/shopify-webhook.ts
import { json, type LoaderFunction, type ActionFunction } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  console.log('🔍 GET /api/shopify-webhook hit (loader)');
  return json({ message: 'This route is for Shopify webhooks (POST only)' });
};

export const action: ActionFunction = async ({ request }) => {
  console.log('🔔 POST /api/shopify-webhook hit');

  // 1. Confirm method
  if (request.method !== 'POST') {
    console.warn('⚠️ Wrong method:', request.method);
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // 2. Read and log raw body
    const raw = await request.text();
    console.log('📥 Raw request body:', raw);

    // 3. Parse JSON
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      console.error('❌ JSON.parse failed:', err);
      return json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.log('✅ Parsed JSON body:', body);

    // 4. Destructure and log fields
    const { id, created_at, customer, email, phone, total_price, currency } = body;
    console.log('🔎 Extracted fields:', { id, created_at, email, phone, total_price, currency });

    // 5. Prepare values
    const orderId = String(id);
    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'Unknown';
    console.log('📝 Preparing to insert:', { orderId, customerName });

    // 6. Perform DB insert and log success/failure
    const queryText = `
      INSERT INTO orders (
        id, created_at, customer_name, email, phone, total_price, currency
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO NOTHING
    `;
    const values = [orderId, created_at, customerName, email, phone, total_price, currency];

    console.log('🔧 Running query:', queryText.trim(), 'with values', values);
    const result = await db.query(queryText, values);
    console.log('✅ DB insert result:', result.command, 'rows:', result.rowCount);

    return json({ success: true });
  } catch (err: any) {
    console.error('❌ Shopify webhook handler error:', err.stack || err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
