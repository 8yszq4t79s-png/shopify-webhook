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
      subject: `Order #${orderData.orderNumber} Confirmed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Georgia, 'Times New Roman', serif;
              background-color: #f5f5f5;
              -webkit-font-smoothing: antialiased;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background-color: #E8E4DC;
              padding: 48px 40px;
              text-align: center;
            }
            .logo {
              font-size: 42px;
              font-weight: 400;
              color: #BAA684;
              letter-spacing: 1px;
              margin: 0;
            }
            .content {
              padding: 48px 40px;
              background-color: #ffffff;
            }
            .heading {
              font-size: 28px;
              font-weight: 400;
              color: #000000;
              margin: 0 0 24px 0;
              line-height: 1.3;
            }
            .text {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 15px;
              line-height: 1.6;
              color: #666666;
              margin: 0 0 16px 0;
            }
            .order-details {
              background-color: #FAFAFA;
              border: 1px solid #E8E4DC;
              padding: 24px;
              margin: 32px 0;
            }
            .detail-row {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .detail-label {
              color: #999999;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .detail-value {
              color: #000000;
              font-weight: 500;
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              background-color: #000000;
              color: #ffffff !important;
              text-decoration: none;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 14px;
              font-weight: 500;
              letter-spacing: 0.5px;
              margin: 32px 0;
              border-radius: 2px;
            }
            .footer {
              background-color: #E8E4DC;
              padding: 40px;
              text-align: center;
            }
            .footer-text {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 12px;
              color: #999999;
              margin: 0;
              line-height: 1.6;
            }
            .divider {
              height: 1px;
              background-color: #E8E4DC;
              margin: 32px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1 class="logo">Lumbr</h1>
            </div>
            
            <div class="content">
              <h2 class="heading">Thank you for your order</h2>
              
              <p class="text">We're excited to start handcrafting your bespoke furniture in our Staffordshire workshop.</p>
              
              <div class="order-details">
                <div class="detail-row">
                  <span class="detail-label">Order Number</span>
                  <span class="detail-value">#${orderData.orderNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Order Date</span>
                  <span class="detail-value">${orderData.orderDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status</span>
                  <span class="detail-value">Order Confirmed</span>
                </div>
              </div>
              
              <p class="text">Track your order's progress from workshop to doorstep. You'll need your order number and delivery postcode to access tracking.</p>
              
              <center>
                <a href="${trackingUrl}" class="button">TRACK YOUR ORDER</a>
              </center>
              
              <div class="divider"></div>
              
              <p class="text">We'll keep you updated throughout the crafting process. If you have any questions, simply reply to this email.</p>
              
              <p class="text" style="margin-top: 24px;">— The Lumbr Team</p>
            </div>
            
            <div class="footer">
              <p class="footer-text">Handmade in England using kiln dried, sub 10% best grade timber</p>
              <p class="footer-text" style="margin-top: 8px;">© ${new Date().getFullYear()} Lumbr. All rights reserved.</p>
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
