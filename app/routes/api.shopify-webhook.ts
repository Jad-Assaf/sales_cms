import { json, type LoaderFunction, type ActionFunction } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  console.log('🔍 [loader] GET /api/shopify-webhook');
  return json({ message: 'POST only' });
};

export const action: ActionFunction = async ({ request }) => {
  console.log('🔔 [action] POST /api/shopify-webhook start');
  try {
    const headers = Object.fromEntries(request.headers);
    const topic = headers['x-shopify-topic'];
    console.log('📦 Shopify Topic:', topic);

    const raw = await request.text();
    console.log('📥 Raw body:', raw);

    let body: any;
    try {
      body = JSON.parse(raw);
      console.log('✅ Parsed body:', body);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const orderId = String(body.id);
    console.log('🆔 Order ID:', orderId);

    // 🗑️ Handle deletion-related webhooks
    if (
      topic === 'orders/delete' ||
      topic === 'orders/cancelled' ||
      topic === 'orders/fulfilled'
    ) {
      const result = await db.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
      console.log(`🗑️ Deleted order ${orderId}:`, result.rowCount);
      return json({ deleted: result.rowCount });
    }

    // 🧾 Handle order creation
    const {
      created_at,
      customer,
      email,
      phone: directPhone,
      total_price,
      currency,
      shipping_address,
      billing_address,
    } = body;

    const phone =
      directPhone ||
      shipping_address?.phone ||
      billing_address?.phone ||
      null;

    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'Unknown';

    const insertQuery = `
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

    const insertResult = await db.query(insertQuery, values);
    console.log('✅ Inserted:', insertResult.rowCount);

    return json({ inserted: insertResult.rowCount });
  } catch (err: any) {
    console.error('❌ [action] Unhandled error:', err.stack || err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
