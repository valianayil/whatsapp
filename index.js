const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Use environment variables directly
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v16.0'; // Try v16.0 as it's more stable
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'electronic_city_municipal_services';

// Middleware
app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  if (req.path === '/webhook') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Welcome route
app.get('/', (req, res) => {
  res.send('Municipal Services WhatsApp Bot is running!');
});

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`Webhook verification: mode=${mode}, token=${token}, challenge=${challenge}`);
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  
  console.log('Webhook verification failed');
  return res.sendStatus(403);
});

// Function to send text messages
async function sendTextMessage(to, message) {
  console.log(`Sending text to ${to}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  
  try {
    // Print full configuration for debugging
    console.log(`Configuration: API v${API_VERSION}, Phone ID: ${PHONE_NUMBER_ID}`);
    console.log(`Token length: ${WHATSAPP_API_KEY?.length || 0}`);
    
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: message }
      },
      timeout: 5000
    });
    
    console.log(`✅ Message sent successfully! Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error('❌ ERROR sending message:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data)}`);
      
      // Provide specific guidance for common errors
      if (error.response.status === 401) {
        console.error('AUTH ERROR: Your token is invalid or expired. Generate a new token.');
      } else if (error.response.status === 400) {
        console.error('BAD REQUEST: Check your phone number format and Phone Number ID.');
      }
    } else if (error.request) {
      console.error('No response received from server. Check your internet connection.');
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Main webhook handler
app.post('/webhook', async (req, res) => {
  // Acknowledge receipt immediately
  res.status(200).send('EVENT_RECEIVED');
  
  try {
    if (req.body.object !== 'whatsapp_business_account') {
      console.log(`Invalid webhook object: ${req.body.object}`);
      return;
    }
    
    console.log(`Processing webhook: ${JSON.stringify(req.body)}`);
    
    const entries = req.body.entry || [];
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        // Skip status updates
        if (change.value.statuses) {
          console.log('Skipping status update');
          continue;
        }
        
        // Process messages
        const messages = change.value.messages || [];
        
        if (messages.length === 0) continue;
        
        const message = messages[0];
        const userPhone = message.from;
        const userName = change.value.contacts?.[0]?.profile?.name || 'there';
        
        console.log(`Message from ${userName} (${userPhone}): type=${message.type}`);
        
        // Process text messages
        if (message.type === 'text') {
          const text = message.text.body.toLowerCase().trim();
          console.log(`Text content: "${text}"`);
          
          // Handle greeting
          if (text === 'hi' || text === 'hello' || text === 'hey') {
            await sendTextMessage(
              userPhone, 
              `Hi ${userName}, welcome to Municipal Services! I can help you with Property Tax or Water Bill payments. Which service do you need today? Reply with "property" or "water".`
            );
          }
          // Handle property tax
          else if (text.includes('property') || text === '1') {
            await sendTextMessage(userPhone, 'Please enter your Property ID number:');
          }
          // Handle water bill
          else if (text.includes('water') || text === '2') {
            await sendTextMessage(userPhone, 'Please enter your Water Consumer Number:');
          }
          // Handle property ID input
          else if (/^\d{6,10}$/.test(text)) {
            await sendTextMessage(
              userPhone,
              `Thank you! Your Property Tax details:\nProperty ID: ${text}\nAmount Due: ₹5,250\n\nTo pay, visit: https://municipality.gov/pay-property/${text}`
            );
          }
          // Handle water consumer number
          else if (/^[A-Za-z0-9]{6,12}$/.test(text)) {
            await sendTextMessage(
              userPhone,
              `Thank you! Your Water Bill details:\nConsumer No: ${text}\nAmount Due: ₹750\n\nTo pay, visit: https://municipality.gov/pay-water/${text}`
            );
          }
          // Default response
          else {
            await sendTextMessage(
              userPhone,
              'I didn\'t understand. Please say "hi" to start over, or type "property" or "water" for specific services.'
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    console.error(error);
  }
});

// Generate a test access token route (for emergencies)
app.get('/generate-test-token', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp API Token Guide</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2 { color: #075e54; }
          pre { background: #f0f0f0; padding: 10px; border-radius: 5px; }
          .step { margin-bottom: 20px; }
          .important { background: #ffe0e0; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>WhatsApp Business API Token Guide</h1>
        
        <div class="important">
          <h2>Important</h2>
          <p>Your current token appears to be invalid or expired. Follow these steps to generate a new permanent token.</p>
        </div>
        
        <div class="step">
          <h2>Step 1: Go to Meta Business Settings</h2>
          <p>Log in to <a href="https://business.facebook.com/settings/" target="_blank">Meta Business Settings</a></p>
        </div>
        
        <div class="step">
          <h2>Step 2: Create a System User</h2>
          <p>Go to Users > System Users > Add</p>
          <p>Create a new System User (if you don't already have one)</p>
        </div>
        
        <div class="step">
          <h2>Step 3: Generate a Token</h2>
          <p>Click on the System User > Generate New Token</p>
          <p>Select the WhatsApp Business Account in the list</p>
          <p>Select "Manage phone" and "Manage messages" permissions</p>
          <p>Set token expiration to "Never" or a far future date</p>
        </div>
        
        <div class="step">
          <h2>Step 4: Update your .env file</h2>
          <pre>
WHATSAPP_API_KEY=your_new_token_here
PHONE_NUMBER_ID=${PHONE_NUMBER_ID}
API_VERSION=v16.0
VERIFY_TOKEN=${VERIFY_TOKEN}
          </pre>
        </div>
        
        <div class="step">
          <h2>Testing</h2>
          <p>After updating your token, run these commands:</p>
          <pre>
node direct-test.js
node webhook-test.js
          </pre>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`WhatsApp bot server started on port ${port}`);
  
  // Check configuration
  console.log('\n=== CONFIGURATION ===');
  console.log(`API Key: ${WHATSAPP_API_KEY ? `${WHATSAPP_API_KEY.slice(0,10)}... (${WHATSAPP_API_KEY.length} chars)` : '❌ MISSING'}`);
  console.log(`Phone Number ID: ${PHONE_NUMBER_ID || '❌ MISSING'}`);
  console.log(`API Version: ${API_VERSION}`);
  console.log(`Verify Token: ${VERIFY_TOKEN}`);
  console.log('====================\n');
});