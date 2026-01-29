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
    let heading = '';
    let messageContent = '';
    
    if (updateType === 'message') {
      subject = `New Message - Order #${orderNumber}`;
      heading = 'You have a new message';
      messageContent = '<div style="background-color:#FAFAFA;border-left:3px solid #BAA684;padding:20px 24px;margin:24px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333333;">' + message + '</div>';
    } else if (updateType === 'status') {
      subject = `Status Update - Order #${orderNumber}`;
      heading = 'Your order status has changed';
      messageContent = '<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666666;margin:0 0 16px 0;">Your order has been updated. View the tracking page for the latest status and details.</p>';
    } else {
      subject = `Order Update - Order #${orderNumber}`;
      heading = 'Your order has been updated';
      messageContent = '<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666666;margin:0 0 16px 0;">There has been an update to your order. Check your tracking page for details.</p>';
    }
    
    const htmlEmail = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Georgia,Times New Roman,serif;background-color:#f5f5f5;"><div style="max-width:600px;margin:0 auto;background-color:#ffffff;"><div style="background-color:#E8E4DC;padding:48px 40px;text-align:center;"><h1 style="font-size:42px;font-weight:400;color:#BAA684;letter-spacing:1px;margin:0;">Lumbr</h1></div><div style="padding:48px 40px;background-color:#ffffff;"><h2 style="font-size:28px;font-weight:400;color:#000000;margin:0 0 24px 0;line-height:1.3;">' + heading + '</h2><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666666;margin:0 0 16px 0;">Hi ' + (customerName || 'there') + ',</p>' + messageContent + '<div style="background-color:#FAFAFA;border:1px solid #E8E4DC;padding:24px;margin:32px 0;"><div style="font-family:Arial,sans-serif;padding:8px 0;font-size:14px;"><span style="color:#999999;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;display:block;margin-bottom:8px;">ORDER NUMBER</span><span style="color:#000000;font-weight:500;">#' + orderNumber + '</span></div></div><center><a href="' + trackingUrl + '" style="display:inline-block;padding:16px 40px;background-color:#000000;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:500;letter-spacing:0.5px;margin:32px 0;border-radius:2px;">VIEW ORDER STATUS</a></center><div style="height:1px;background-color:#E8E4DC;margin:32px 0;"></div><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666666;margin:0 0 16px 0;">If you have any questions, simply reply to this email or send a message through your order tracking page.</p><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666666;margin:24px 0 0 0;">— The Lumbr Team</p></div><div style="background-color:#E8E4DC;padding:40px;text-align:center;"><p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;margin:0;line-height:1.6;">Handmade in England using kiln dried, sub 10% best grade timber</p><p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;margin:8px 0 0 0;">&copy; ' + new Date().getFullYear() + ' Lumbr. All rights reserved.</p></div></div></body></html>';
    
    const emailData = JSON.stringify({
      from: 'Lumbr <lumbr@lumbr.uk>',
      to: [email],
      subject: subject,
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
