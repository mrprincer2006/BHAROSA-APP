import nodemailer from 'nodemailer';

export async function sendOrderEmail({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('[Email] Sending to:', to);
  console.log('[Email] SMTP config:', { host, port, user, hasPass: !!pass });

  if (!host || !port || !user || !pass || !to) return { sent: false };

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    html
  });

  console.log('[Email] Sent successfully to:', to);
  return { sent: true };
}

export async function sendAdminOrderEmail(order) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { sent: false };

  const itemsHtml = order.totals.items.map(it => `
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px; font-weight:950;">${escapeHtml(it.name)}</td>
      <td style="padding:8px; text-align:center;">${it.qty}</td>
      <td style="padding:8px; text-align:right;">₹${it.price}</td>
      <td style="padding:8px; text-align:right;">₹${it.linePrice}</td>
    </tr>
  `).join('');

  await sendOrderEmail({
    to: adminEmail,
    subject: `New Order: ${order.id}`,
    html: `
      <h2 style="font-family:Inter,sans-serif; font-size:20px; font-weight:950; margin-bottom:16px;">New Order Received</h2>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Order ID: <b>${order.id}</b></p>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Customer: ${escapeHtml(order.customer?.name || '')}</p>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Email: ${escapeHtml(order.customer?.email || '')}</p>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:8px;">Payment: ${order.paymentMethod}</p>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#64748b; margin-bottom:16px;">Delivery Address:</p>
      <p style="font-family:Inter,sans-serif; font-size:14px; font-weight:800; color:#0f172a;">${escapeHtml([order.address?.addressLine, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(', '))}</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px; text-align:left; font-weight:700;">Product</th>
            <th style="padding:8px; text-align:center; font-weight:700;">Qty</th>
            <th style="padding:8px; text-align:right; font-weight:700;">Price</th>
            <th style="padding:8px; text-align:right; font-weight:700;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #e5e7eb">
            <td colspan="3" style="padding:8px; text-align:right; font-weight:950;">Total Amount</td>
            <td style="padding:8px; text-align:right; font-weight:950;">₹${order.totals.payable}</td>
          </tr>
        </tfoot>
      </table>
    `
  });
  return { sent: true };
}

function escapeHtml(str){
  return String(str || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
