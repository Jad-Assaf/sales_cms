import { json, type LoaderFunction, type ActionFunction } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  return json({ message: 'This route is for Shopify webhooks (POST only)' });
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();

    const {
      id,
      created_at,
      customer,
      email,
      phone,
      total_price,
      currency,
    } = body;

    const orderId = String(id);
    const customerName = customer
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : 'Unknown';

    await db.query(
      `INSERT INTO orders (
        id, created_at, customer_name, email, phone, total_price, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING`,
      [
        orderId,
        created_at,
        customerName,
        email,
        phone,
        total_price,
        currency,
      ]
    );

    return json({ success: true });
  } catch (err) {
    console.error('Shopify webhook error:', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};
