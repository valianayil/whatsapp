const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Core configuration
const config = {
  whatsappApiKey: process.env.WHATSAPP_API_KEY,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  apiVersion: process.env.API_VERSION || 'v18.0',
  verifyToken: process.env.VERIFY_TOKEN || 'electronic_city_municipal_services'
};

// Middleware
app.use(express.json());

// Simple welcome route
app.get('/', (req, res) => {
  res.send('Municipal Services WhatsApp Bot is running!');
});

// Webhook verification endpoint - required by WhatsApp
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token === config.verifyToken) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// Send a text message
async function sendTextMessage(to, text) {
  console.log(`Sending text message to ${to}`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${config.whatsappApiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text }
      }
    });
    
    console.log(`Message sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending text message:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Send an interactive list message
async function sendServiceMenu(to, userName) {
  console.log(`Sending service menu to ${to}`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      headers: {
        'Authorization': `Bearer ${config.whatsappApiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: 'Municipal Services'
          },
          body: {
            text: `Hello ${userName}, welcome to Municipal Services.\nWhat service do you need today?`
          },
          footer: {
            text: 'Municipal Services'
          },
          action: {
            button: 'Select a Service',
            sections: [
              {
                title: 'Available Services',
                rows: [
                  {
                    id: 'property_tax',
                    title: 'Property Tax',
                    description: 'Pay your property tax'
                  },
                  {
                    id: 'water_bill',
                    title: 'Water Bill',
                    description: 'Pay your water bill'
                  }
                ]
              }
            ]
          }
        }
      }
    });
    
    console.log(`Service menu sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending service menu:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
    
    // Try to send a fallback text message
    console.log('Attempting to send fallback text message');
    return await sendTextMessage(
      to, 
      `Hello ${userName}, welcome to Municipal Services.\n\nOur services:\n• Property Tax Payment\n• Water Bill Payment\n\nPlease reply with "property" or "water".`
    );
  }
}

// The main webhook handler for incoming messages
app.post('/webhook', async (req, res) => {
  // Always respond to the webhook immediately to prevent timeouts
  res.status(200).send('EVENT_RECEIVED');
  
  try {
    // Verify this is a WhatsApp message webhook
    if (req.body.object !== 'whatsapp_business_account') {
      console.log('Not a WhatsApp Business webhook');
      return;
    }
    
    // Process each message
    const entries = req.body.entry || [];
    
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        // Skip status updates
        if (change.value.statuses) {
          console.log('Skipping status update');
          continue;
        }
        
        // Process new messages
        const messages = change.value.messages || [];
        if (messages.length === 0) continue;
        
        const message = messages[0];
        const userPhone = message.from;
        const userName = change.value.contacts?.[0]?.profile?.name || 'there';
        
        console.log(`Received message from ${userName} (${userPhone}), type: ${message.type}`);
        
        // Handle text messages
        if (message.type === 'text') {
          const text = message.text.body.toLowerCase().trim();
          console.log(`Message content: "${text}"`);
          
          // Check for greeting
          if (text === 'hi' || text === 'hello' || text === 'hey') {
            await sendServiceMenu(userPhone, userName);
          }
          // Handle property tax request
          else if (text.includes('property') || text === '1') {
            await sendTextMessage(userPhone, 'Please enter your Property ID number:');
          }
          // Handle water bill request
          else if (text.includes('water') || text === '2') {
            await sendTextMessage(userPhone, 'Please enter your Water Consumer Number:');
          }
          // Handle property ID input (assuming 6-10 digits)
          else if (/^\d{6,10}$/.test(text)) {
            await sendTextMessage(
              userPhone,
              `Thank you! Your Property Tax details:\nProperty ID: ${text}\nAmount Due: ₹5,250\n\nTo pay, visit: https://municipal.gov/pay-property/${text}`
            );
          }
          // Handle water consumer number (assuming alphanumeric, 6-12 chars)
          else if (/^[A-Za-z0-9]{6,12}$/.test(text)) {
            await sendTextMessage(
              userPhone,
              `Thank you! Your Water Bill details:\nConsumer No: ${text}\nAmount Due: ₹750\n\nTo pay, visit: https://municipal.gov/pay-water/${text}`
            );
          }
          // Default response
          else {
            await sendTextMessage(
              userPhone,
              'I didn\'t understand. Please say "hi" to see the service menu, or directly type "property" or "water" for specific services.'
            );
          }
        }
        // Handle interactive responses
        else if (message.type === 'interactive' && message.interactive.type === 'list_reply') {
          const selectedOption = message.interactive.list_reply.id;
          
          if (selectedOption === 'property_tax') {
            await sendTextMessage(userPhone, 'Please enter your Property ID number:');
          }
          else if (selectedOption === 'water_bill') {
            await sendTextMessage(userPhone, 'Please enter your Water Consumer Number:');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`WhatsApp bot listening on port ${port}`);
  
  // Verify configuration
  console.log('\n=== CONFIGURATION CHECK ===');
  console.log(`API Key configured: ${Boolean(config.whatsappApiKey)}`);
  console.log(`Phone Number ID: ${config.phoneNumberId}`);
  console.log(`API Version: ${config.apiVersion}`);
  console.log(`Verify Token: ${config.verifyToken}`);
  console.log('============================\n');
});