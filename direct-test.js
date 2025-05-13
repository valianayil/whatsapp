require('dotenv').config();
const axios = require('axios');

// Get your phone number (change this to your number)
const YOUR_PHONE_NUMBER = '919741301245'; // Update this

// Get configuration from environment variables
const API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v18.0';

console.log('=== DIRECT WHATSAPP MESSAGE TEST ===');
console.log('Phone Number ID:', PHONE_NUMBER_ID);
console.log('API Version:', API_VERSION);
console.log('API Key length:', API_KEY ? API_KEY.length : 'Not set');
console.log('Target phone:', YOUR_PHONE_NUMBER);

async function sendDirectMessage() {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  
  console.log(`\nSending direct API call to: ${url}`);
  
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: YOUR_PHONE_NUMBER,
    type: 'text',
    text: { 
      body: 'This is a direct test message from the WhatsApp API test script.' 
    }
  };
  
  console.log('Request data:', JSON.stringify(data, null, 2));
  
  try {
    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: data
    });
    
    console.log('\n✅ SUCCESS! Message sent.');
    console.log('Status code:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('\n❌ ERROR sending message:');
    
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      
      // Specific error handling
      const errorCode = error.response.data.error?.code;
      const errorMessage = error.response.data.error?.message;
      
      if (errorCode === 190) {
        console.log('\n🔑 AUTHENTICATION ERROR: Your token is invalid or expired.');
        console.log('- Generate a new permanent access token from Meta Business Suite');
        console.log('- Make sure it has the whatsapp_business_messaging permission');
      } 
      else if (errorCode === 100) {
        console.log('\n📱 PHONE NUMBER ERROR: The phone number ID may be incorrect or unauthorized.');
        console.log('- Check your PHONE_NUMBER_ID in the .env file');
        console.log('- Verify this number is registered in your WhatsApp Business account');
      }
      else if (errorMessage?.includes('rate limit')) {
        console.log('\n⏱️ RATE LIMIT: You\'ve hit the API rate limit.');
        console.log('- Wait a few minutes before trying again');
      }
    } else if (error.request) {
      console.log('No response received from server');
    } else {
      console.log('Error setting up request:', error.message);
    }
  }
}

// Run the test
sendDirectMessage().catch(err => {
  console.error('Unexpected error:', err);
}); 