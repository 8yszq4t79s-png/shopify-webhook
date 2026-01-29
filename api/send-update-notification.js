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
    const { orderNumber, customerName, email, updateType, message, messageHistory } = req.body;
    
    if (!orderNumber || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sendUpdateEmail(orderNumber, customerName, email, updateType, message, messageHistory);
    return res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error in send-update-notification:', error);
    return res.status(500).json({ error: error.message });
  }
};

function sendUpdateEmail(orderNumber, customerName, email, updateType, message, messageHistory) {
  return new Promise((resolve, reject) => {
    const trackingUrl = 'https://lumbr.uk/pages/track-order?order=' + orderNumber;
    const currentYear = new Date().getFullYear();
    
    let subject = '';
    let heading = '';
    let topMessage = '';
    
    if (updateType === 'message') {
      subject = 'New Message - Order #' + orderNumber;
      heading = 'You have a new message';
      topMessage = '';
    } else if (updateType === 'status') {
      subject = 'Status Update - Order #' + orderNumber;
      heading = 'Your order status has changed';
      topMessage = '<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 24px 0;">Your order has been updated. View the tracking page for the latest status and details.</p>';
    } else {
      subject = 'Order Update - Order #' + orderNumber;
      heading = 'Your order has been updated';
      topMessage = '<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 24px 0;">There has been an update to your order. Check your tracking page for details.</p>';
    }
    
    let chatSection = '';
    
    if (messageHistory && Array.isArray(messageHistory) && messageHistory.length > 0) {
      const recentMessages = messageHistory.slice(-3);
      let messagesHtml = '';
      
      recentMessages.forEach(function(msg) {
        const senderLabel = msg.sender === 'customer' ? 'You' : 'Lumbr Team';
        const isCustomer = msg.sender === 'customer';
        const alignment = isCustomer ? 'flex-end' : 'flex-start';
        const bgColor = isCustomer ? '#000' : '#E8E4DC';
        const textColor = isCustomer ? '#fff' : '#333';
        
        messagesHtml += '<div style="display:flex;justify-content:' + alignment + ';margin-bottom:12px;"><div style="max-width:75%;background-color:' + bgColor + ';color:' + textColor + ';padding:12px 16px;border-radius:16px;"><div style="font-family:Arial,sans-serif;font-size:10px;font-weight:600;opacity:0.7;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">' + senderLabel + '</div><div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.4;">' + msg.message + '</div></div></div>';
      });
      
      chatSection = '<a href="' + trackingUrl + '" style="text-decoration:none;color:inherit;display:block;"><div style="background-color:#FAFAFA;border:1px solid #E8E4DC;padding:24px;margin:24px 0;border-radius:8px;cursor:pointer;"><div style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#999;margin-bottom:20px;text-transform:uppercase;letter-spacing:1px;text-align:center;">💬 CONVERSATION</div>' + messagesHtml + '<div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid #E8E4DC;"><p style="font-family:Arial,sans-serif;font-size:12px;color:#BAA684;margin:0;font-weight:500;">Click to view full conversation</p></div></div></a>';
    } else {
      chatSection = '<a href="' + trackingUrl + '" style="text-decoration:none;color:inherit;display:block;"><div style="background-color:#FAFAFA;border:1px solid #E8E4DC;padding:32px 24px;margin:24px 0;border-radius:8px;cursor:pointer;text-align:center;"><div style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#999;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">💬 CONVERSATION</div><p style="font-family:Arial,sans-serif;font-size:14px;color:#666;margin:0;line-height:1.6;">No messages yet. Have a question?<br>Click to start a conversation with us.</p></div></a>';
    }
    
    const htmlEmail = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Georgia,serif;background-color:#f5f5f5;"><div style="max-width:600px;margin:0 auto;background-color:#fff;"><div style="background-color:#E8E4DC;padding:48px 40px;text-align:center;"><img src="https://lumbr.uk/cdn/shop/t/44/assets/lumbrlogo-large.png?v=176395999498835774581769444970" alt="Lumbr" style="max-width:200px;height:auto;margin:0 auto;display:block;"></div><div style="padding:48px 40px;background-color:#fff;"><h2 style="font-size:28px;font-weight:400;color:#000;margin:0 0 24px 0;">' + heading + '</h2><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 16px 0;">Hi ' + (customerName || 'there') + ',</p>' + topMessage + chatSection + '<div style="background-color:#FAFAFA;border:1px solid #E8E4DC;padding:24px;margin:32px 0;"><div style="font-family:Arial,sans-serif;padding:8px 0;font-size:14px;"><span style="color:#999;text-transform:uppercase;font-size:11px;letter-spacing:0.5px;display:block;margin-bottom:8px;">ORDER NUMBER</span><span style="color:#000;font-weight:500;">#' + orderNumber + '</span></div></div><center><a href="' + trackingUrl + '" style="display:inline-block;padding:16px 40px;background-color:#000;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:500;letter-spacing:0.5px;margin:32px 0;border-radius:2px;">VIEW ORDER</a></center><div style="height:1px;background-color:#E8E4DC;margin:32px 0;"></div><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:0 0 16px 0;">If you have any questions, simply reply to this email or send a message through your order tracking page.</p><p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#666;margin:24px 0 0 0;">- The Lumbr Team</p></div><div style="background-color:#E8E4DC;padding:40px;text-align:center;"><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:0;line-height:1.6;">Handmade in England using kiln dried, sub 10% best grade timber</p><p style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin:8px 0 0 0;">&copy; ' + currentYear + ' Lumbr. All rights reserved.</p></div></div></body></html>';
    
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
        'Content-Length': Buffer.byteLength(emailData)
      }
    };

    const request = https.request(options, function(response) {
      let responseData = '';
      
      response.on('data', function(chunk) {
        responseData += chunk;
      });
      
      response.on('end', function() {
        console.log('Resend API response:', response.statusCode, responseData);
        if (response.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error('Resend API error: ' + response.statusCode + ' - ' + responseData));
        }
      });
    });

    request.on('error', function(error) {
      console.error('HTTPS request error:', error);
      reject(error);
    });

    request.write(emailData);
    request.end();
  });
}
