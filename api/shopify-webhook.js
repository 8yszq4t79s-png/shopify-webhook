const https = require('https');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;
    
    // Prepare order data for Firebase
    const orderData = {
      orderNumber: order.order_number.toString(),
      customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
      email: order.customer ? order.customer.email : order.email,
      orderDate: order.created_at.split('T')[0],
      stage: 'confirmed',
      deliveryDate: '',
      eta: ''
    };

    // Write to Firebase Realtime Database
    await writeToFirebase(orderData);

    res.status(200).json({ success: true, message: 'Order created' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}

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
