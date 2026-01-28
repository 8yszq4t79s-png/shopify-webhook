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
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

function sendUpdateEmail(orderNumber, customerName, email, updateType, message) {
  return new Promise((resolve, reject) => {
    const trackingUrl = `https://lumbr.uk/pages/track-order?order=${orderNumber}`;
    
    let subject = '';
    let content = '';
    
    if (updateType === 'message') {
      subject = `New Message - Order #${orderNumber}`;
      content = `
        <p>You have a new message regarding your order:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">${message}</p>
        </div>
      `;
    } else if (updateType === 'status') {
      subject = `Order Update - Order #${orderNumber}`;
      content = `<p>Your order status has been updated. Check your tracking page for the latest information.</p>`;
    } else {
      subject = `Order Update - Order #${orderNumber}`;
      content = `<p>There's been an update to your order. Check your tracking page for details.</p>`;
    }
    
    const emailData = JSON.stringify({
      from: 'Lumbr <lumbr@lumbr.uk>',
      to: [email],
      subject: subject,
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
              <h1>Order Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${customerName},</h2>
              ${content}
              
              <p><strong>Order Number:</strong> #${orderNumber}</p>
              
              <a href="${trackingUrl}" class="button">View Order Status</a>
              
              <p>If you have any questions, feel free to reply to this email or send a message through the tracking page.</p>
              
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
