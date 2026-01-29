const https = require('https');

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
    const { orderNumber, customerName, email, updateType, message } = req.body;
    
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sendUpdateEmail(orderNumber, customerName, email, updateType, message);
    return res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: error.message });
  }
};

function sendUpdateEmail(orderNumber, customerName, email, updateType, message) {
  return new Promise((resolve, reject) => {
    const trackingUrl = `https://lumbr.uk/pages/track-order?order=${orderNumber}`;
    
    // Determine subject and heading based on update type
    let subject = 'Order Update';
    let heading = 'Your order has been updated';
    
    if (updateType === 'message') {
      subject = `New Message - Order #${orderNumber}`;
      heading = 'You have a new message';
    } else if (updateType === 'status') {
      subject = `Status Update - Order #${orderNumber}`;
      heading = 'Your order status has changed';
    } else {
      subject = `Order Update - Order #${orderNumber}`;
    }
    
    const emailData = JSON.stringify({
      from: 'Lumbr <lumbr@lumbr.uk>',
      to: [email],
      subject: subject,
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
            .message-box {
              background-color: #FAFAFA;
              border-left: 3px solid #BAA684;
              padding: 20px 24px;
              margin: 24px 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              font-size: 15px;
              line-height: 1.6;
              color: #333333;
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
              <h2 class="heading">${heading}</h2>
              
              <p class="text">Hi ${customerName || 'there'},</p>
              
              ${message ? `<div class="message-box">${message}</div>` : '<p class="text">Your order has been updated. View the tracking page for the latest status and details.</p>'}
              
              <div class="order-details">
                <div class="detail-row">
                  <span class="detail-label">Order Number</span>
                  <span class="detail-value">#${orderNumber}</span>
                </div>
              </div>
              
              <center>
                <a href="${trackingUrl}" class="button">VIEW ORDER STATUS</a>
              </center>
              
              <div class="divider"></div>
              
              <p class="text">If you have any questions, simply reply to this email or send a message through your order tracking page.</p>
              
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
          console.error('Resend API error:', responseData);
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
