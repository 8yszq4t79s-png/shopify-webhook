const https = require('https');
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;
    
    const trackingToken = crypto.randomBytes(32).toString('hex');
    
    const deliveryPostcode = order.shipping_address ? order.shipping_address.zip : '';
    
    const orderData = {
      orderNumber: order.order_number.toString(),
      trackingToken: trackingToken,
      customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
      email: order.customer ? order.customer.email : order.email,
      deliveryPostcode: deliveryPostcode,
      orderDate: order.created_at.split('T')[0],
      stage: 'confirmed',
      deliveryDate: '',
      eta: '',
      messages: []
    };

    await writeToFirebase(orderData);
    await sendConfirmationEmail(orderData);

    return res.status(200).json({ success: true, message: 'Order created and email sent' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

function writeToFirebase(orderData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(orderData);
    
    const options = {
      hostname: 'lumbr-order-tracking-default-rtdb.europe-west1.firebasedatabase.app',
      path: `/orders/${orderData.orderNumber}.json`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Firebase returned status ${response.statusCode}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.write(data);
    request.end();
  });
}

function sendConfirmationEmail(orderData) {
  return new Promise((resolve, reject) => {
    const trackingUrl = `https://lumbr.uk/pages/track-order?order=${orderData.orderNumber}`;
    const currentYear = new Date().getFullYear();
    
    const htmlEmail = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Georgia,serif;background-color:#f5f5f5;"><div style="max-width:600px;margin:0 auto;background-color:#fff;"><div style="background-color:#E8E4DC;padding:48px 40px;text-align:center;"><img src="https://lumbr.uk/cdn/shop/t/44/assets/lumbrlogo-large.png?v=176395999498835774581769444970" alt="Lumbr" style="max-width:200px;height:auto;margin:0 auto;display:block;"></div><div style="padding:48px 40px;background-color:#fff;"><h2 style="font-size:28px;font-weight:400;color:#000;margin:0 0 24px 0;">Thank you for your order</h2><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 16px 0;">Track your Order, View Progress and Send Messages all on one page.</p><div style="background-color:#FAFAFA;border:1px solid #E8E4DC;padding:24px;margin:32px 0;"><div style="font-family:Arial,sans-serif;padding:8px 0;font-size:14px;margin-bottom:12px;"><span style="color:#999;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;display:block;margin-bottom:4px;">ORDER NUMBER</span><span style="color:#000;font-weight:500;">#' + orderData.orderNumber + '</span></div><div style="font-family:Arial,sans-serif;padding:8px 0;font-size:14px;margin-bottom:12px;"><span style="color:#999;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;display:block;margin-bottom:4px;">ORDER DATE</span><span style="color:#000;font-weight:500;">' + orderData.orderDate + '</span></div><div style="font-family:Arial,sans-serif;padding:8px 0;font-size:14px;"><span style="color:#999;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;display:block;margin-bottom:4px;">STATUS</span><span style="color:#000;font-weight:500;">Order Confirmed</span></div></div><center><a href="' + trackingUrl + '" style="display:inline-block;padding:16px 40px;background-color:#000;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:500;letter-spacing:0.5px;margin:32px 0;border-radius:2px;">TRACK YOUR ORDER</a></center><div style="height:1px;background-color:#E8E4DC;margin:32px 0;"></div><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 16px 0;">We will keep you updated throughout the crafting process. If you have any questions, simply reply to this email.</p><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:24px 0 0 0;">- The Lumbr Team</p></div><div style="background-color:#E8E4DC;padding:40px;text-align:center;"><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:0;line-height:1.6;">Handmade in England using kiln dried, sub 10% best grade timber</p><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:8px 0 0 0;">&copy; ' + currentYear + ' Lumbr. All rights reserved.</p></div></div></body></html>';
    
    const emailData = JSON.stringify({
      from: 'Lumbr <lumbr@lumbr.uk>',
      to: [orderData.email],
      subject: `Track Your Order (#${orderData.orderNumber})`,
      html: htmlEmail
    });

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_43sN12hD_N7wiVYfZHZ3vgPWEVi3HwGUA',
        'Content-Type': 'application/json',
        'Content-Length': emailData.length
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          console.error('Resend error:', responseData);
          reject(new Error(`Resend returned status ${response.statusCode}`));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.write(emailData);
    request.end();
  });
}
