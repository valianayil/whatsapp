require('dotenv').config();
const axios = require('axios');

// Get configuration from environment variables
const API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v18.0';

// Function to test token validity
async function testToken() {
  console.log('\n=== WHATSAPP API TOKEN TEST ===');
  console.log('Testing token validity and API access...');
  
  try {
    // First, try to get basic app info to verify token
    const response = await axios({
      method: 'GET',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    console.log('\n✅ SUCCESS: API token is valid!');
    console.log('Response status:', response.status);
    
    // Show phone number details
    console.log('\nPhone number details:');
    console.log(`ID: ${response.data.id || 'N/A'}`);
    console.log(`Name: ${response.data.display_phone_number || 'N/A'}`);
    console.log(`Status: ${response.data.status || 'N/A'}`);
    console.log(`Quality rating: ${response.data.quality_rating || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.log('\n❌ ERROR: Token validation failed');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error message:', error.response.data.error?.message || 'Unknown error');
      
      if (error.response.status === 401) {
        console.log('\n👉 Your token has expired or is invalid. Please generate a new token in the Meta Developer Portal.');
      }
    } else {
      console.log('Error:', error.message);
    }
    
    return false;
  }
}

// Function to send a test message
async function sendTestMessage(phoneNumber) {
  if (!phoneNumber) {
    console.log('No phone number provided for test message');
    return;
  }
  
  console.log(`\nAttempting to send test message to ${phoneNumber}...`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { 
          body: 'This is a test message from the Municipal Services WhatsApp bot.' 
        }
      }
    });
    
    console.log('✅ Test message sent successfully!');
    console.log('Message ID:', response.data.messages?.[0]?.id || 'N/A');
    
    return true;
  } catch (error) {
    console.log('❌ Failed to send test message');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error message:', error.response.data.error?.message || 'Unknown error');
    } else {
      console.log('Error:', error.message);
    }
    
    return false;
  }
}

// Main function
async function main() {
  console.log('=== WHATSAPP API CONFIGURATION TEST ===');
  console.log('API Version:', API_VERSION);
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'Not set');
  
  const tokenValid = await testToken();
  
  if (tokenValid) {
    // If you want to send a test message, uncomment and add your number:
    // await sendTestMessage('919XXXXXXXXX');
    console.log('\n✅ Your WhatsApp API configuration looks good!');
    console.log('You can now run your bot and it should work correctly.');
  } else {
    console.log('\n❌ Please fix your API token before continuing.');
    console.log('Follow these steps:');
    console.log('1. Go to developers.facebook.com');
    console.log('2. Navigate to your WhatsApp Business App');
    console.log('3. Generate a new permanent access token');
    console.log('4. Update your .env file with the new token');
    console.log('5. Run this test again to verify');
  }
}

// Run the test
main().catch(error => {
  console.error('Error running tests:', error);
}); 