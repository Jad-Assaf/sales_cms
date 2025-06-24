// app/routes/dashboard.orders.tsx

import {
  json,
  redirect,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from '@remix-run/node';
import { useLoaderData, Form, useSearchParams } from '@remix-run/react';
import { db } from '~/utils/db.server';

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
  const newStatus = formData.get('orderStatus');

  if (!orderId || typeof orderId !== 'string' || typeof newStatus !== 'string') {
    return json({ error: 'Invalid form data' }, { status: 400 });
  }

  await db.query(
    `UPDATE orders SET order_status = $1 WHERE id = $2`,
    [newStatus, orderId]
  );

  return redirect(request.url);
};

export default function OrdersDashboard() {
  const { orders, q } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

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
          <tr className="text-left bg-gray-100">
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
              <tr key={order.id} className="hover:bg-gray-50 text-black-900">
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
                <td className="p-3 border-b">{order.order_status || 'Pending'}</td>
                <td className="p-3 border-b">
                  <Form method="post" className="flex gap-2 items-center">
                    <input type="hidden" name="orderId" value={order.id} />
                    <select
                      name="orderStatus"
                      defaultValue={order.order_status || 'Pending'}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white text-sm px-2 py-1 rounded"
                    >
                      Save
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
