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
    
    // Generate unique tracking token
    const trackingToken = crypto.randomBytes(32).toString('hex');
    
    // Extract delivery postcode from shipping address
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

    // Save to Firebase
    await writeToFirebase(orderData);
    
    // Send confirmation email
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
    
    const emailData = JSON.stringify({
      from: 'Lumbr <lumbr@lumbr.uk>',
      to: [orderData.email],
      subject: `Order Confirmation - Lumbr Order #${orderData.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #3498db; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You For Your Order!</h1>
            </div>
            <div class="content">
              <h2>Hi ${orderData.customerName},</h2>
              <p>We've received your order and are excited to start crafting your bespoke furniture.</p>
              
              <p><strong>Order Number:</strong> #${orderData.orderNumber}</p>
              <p><strong>Order Date:</strong> ${orderData.orderDate}</p>
              <p><strong>Status:</strong> Order Confirmed</p>
              
              <p>Track your order progress anytime using your personal tracking link:</p>
              
              <a href="${trackingUrl}" class="button">Track Your Order</a>
              
              <p><small>Or visit: ${trackingUrl}</small></p>
              <p><small>You'll need your order number and delivery postcode to access tracking.</small></p>
              
              <p>We'll keep you updated via email as your order progresses through each stage of production.</p>
              
              <p>If you have any questions, feel free to reply to this email.</p>
              
              <p>Best regards,<br>The Lumbr Team</p>
            </div>
            <div class="footer">
              <p>Lumbr - Bespoke Handmade Furniture</p>
            </div>
          </div>
        </body>
        </html>
      `
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
