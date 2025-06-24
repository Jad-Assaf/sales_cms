// app/routes/dashboard.orders.tsx

import {
  json,
  redirect,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from '@remix-run/node';
import { useLoaderData, Form, useSearchParams } from '@remix-run/react';
import { db } from '~/utils/db.server';
import '../styles/orders.css';

// Loader: fetch orders from the last 30 days
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';

  const searchFilter = q
    ? `
      AND (
        LOWER(id) LIKE LOWER('%${q}%') OR
        LOWER(email) LIKE LOWER('%${q}%') OR
        LOWER(phone) LIKE LOWER('%${q}%') OR
        LOWER(customer_name) LIKE LOWER('%${q}%')
      )
    `
    : '';

  const result = await db.query(`
    SELECT * FROM orders
    WHERE created_at >= NOW() - INTERVAL '30 days'
    ${searchFilter}
    ORDER BY created_at DESC
  `);

  return json({ orders: result.rows, q });
};

// Action: update order status
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const orderId = formData.get('orderId');

  if (!orderId || typeof orderId !== 'string') {
    return json({ error: 'Invalid order ID' }, { status: 400 });
  }

  if (formData.has('delete')) {
    // Delete order
    await db.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
    return redirect(request.url);
  }

  const newStatus = formData.get('orderStatus');
  if (typeof newStatus !== 'string') {
    return json({ error: 'Invalid order status' }, { status: 400 });
  }

  // Update order status
  await db.query(
    `UPDATE orders SET order_status = $1 WHERE id = $2`,
    [newStatus, orderId]
  );

  return redirect(request.url);
};

function statusClass(status: string | null) {
  switch ((status || 'Pending').toLowerCase()) {
    case 'pending':
      return 'status-pending';
    case 'processing':
      return 'status-processing';
    case 'shipped':
      return 'status-shipped';
    case 'delivered':
      return 'status-delivered';
    case 'cancelled':
      return 'status-cancelled';
    default:
      return 'status-default';
  }
}

export default function OrdersDashboard() {
  const { orders, q } = useLoaderData<typeof loader>();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🛒 Orders (Last 30 Days)</h1>

      <Form method="get" className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by email, phone, name or ID..."
          className="w-full max-w-md px-4 py-2 border rounded-lg shadow-sm"
        />
      </Form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left bg-gray-900">
            <th className="p-3 border-b">Order ID</th>
            <th className="p-3 border-b">Customer</th>
            <th className="p-3 border-b">Email</th>
            <th className="p-3 border-b">Phone</th>
            <th className="p-3 border-b">Total</th>
            <th className="p-3 border-b">Date</th>
            <th className="p-3 border-b">Status</th>
            <th className="p-3 border-b">Update</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-4 text-center text-gray-500">
                No orders found.
              </td>
            </tr>
          ) : (
            orders.map((order: any) => (
              <tr key={order.id} className="order-row">
                <td className="p-3 border-b font-mono text-sm">{order.id}</td>
                <td className="p-3 border-b">{order.customer_name}</td>
                <td className="p-3 border-b">{order.email}</td>
                <td className="p-3 border-b">{order.phone}</td>
                <td className="p-3 border-b">
                  {order.total_price} {order.currency}
                </td>
                <td className="p-3 border-b">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className={`p-3 border-b ${statusClass(order.order_status)}`}>
                  {order.order_status || 'Pending'}
                </td>
                <td className="p-3 border-b">
                  <Form method="post" reloadDocument>
                    <input type="hidden" name="orderId" value={order.id} />
                    <select
                      name="orderStatus"
                      defaultValue={order.order_status || 'Pending'}
                      onChange={e => e.currentTarget.form?.requestSubmit()}
                      className="status-select"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    {/* Delete button */}
                    <button
                      type="submit"
                      name="delete"
                      value="true"
                      className="delete-button"
                      onClick={(e) => {
                        if (!confirm('Are you sure you want to delete this order?')) {
                          e.preventDefault();
                        }
                      }}
                      style={{ marginLeft: '10px' }}
                    >
                      Delete
                    </button>
                  </Form>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
