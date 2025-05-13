const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Use environment variables directly to avoid any issues
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v18.0';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'electronic_city_municipal_services';

// Middleware
app.use(express.json());

// Basic request logging to debug webhook issues
app.use((req, res, next) => {
  if (req.path === '/webhook' && req.method === 'POST') {
    console.log(`Webhook request received at ${new Date().toISOString()}`);
  }
  next();
});

// Welcome route
app.get('/', (req, res) => {
  res.send('Municipal Services WhatsApp Bot is running!');
});

// Webhook verification endpoint for WhatsApp
app.get('/webhook', (req, res) => {
  console.log('Webhook verification request received');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`Verification params: mode=${mode}, token=${token}, challenge=${challenge}`);
  console.log(`Expected token: ${VERIFY_TOKEN}`);
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// Function to send text messages
async function sendTextMessage(to, message) {
  console.log(`Attempting to send text message to ${to}`);
  
  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    console.log(`API URL: ${url}`);
    console.log(`Message content: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    const response = await axios({
      method: 'POST',
      url: url,
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
      }
    });
    
    console.log(`Message sent successfully, status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Failed to send message:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Function to send interactive menu
async function sendServiceMenu(to, userName) {
  console.log(`Attempting to send service menu to ${to}`);
  
  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
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
    };
    
    console.log('Request payload:', JSON.stringify(payload));
    
    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });
    
    console.log(`Service menu sent successfully, status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Failed to send service menu:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    // Try to send a simple text message instead
    try {
      await sendTextMessage(
        to, 
        `Hello ${userName}, welcome to Municipal Services.\n\nOur services:\n• Property Tax Payment\n• Water Bill Payment\n\nPlease reply with "property" or "water".`
      );
      return true;
    } catch (fallbackError) {
      console.error('Fallback message failed too:', fallbackError);
      return false;
    }
  }
}

// Main webhook handler
app.post('/webhook', async (req, res) => {
  // Immediately acknowledge the webhook to avoid timeouts
  res.status(200).send('EVENT_RECEIVED');
  
  try {
    console.log('Processing webhook payload');
    
    // Check if this is a WhatsApp message
    if (req.body.object !== 'whatsapp_business_account') {
      console.log(`Invalid webhook object: ${req.body.object}`);
      return;
    }
    
    // Log full request body to help with debugging
    console.log('Webhook data:', JSON.stringify(req.body));
    
    // Process entries
    const entries = req.body.entry || [];
    console.log(`Number of entries: ${entries.length}`);
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      console.log(`Processing ${changes.length} changes`);
      
      for (const change of changes) {
        // Check for status updates
        if (change.value.statuses) {
          console.log('Skipping status update');
          continue;
        }
        
        // Process messages
        const messages = change.value.messages || [];
        console.log(`Found ${messages.length} messages`);
        
        if (messages.length === 0) continue;
        
        const message = messages[0];
        const userPhone = message.from;
        const userName = change.value.contacts?.[0]?.profile?.name || 'there';
        
        console.log(`Processing message from ${userName} (${userPhone})`);
        console.log(`Message type: ${message.type}`);
        
        // Handle based on message type
        if (message.type === 'text') {
          const text = message.text.body.toLowerCase().trim();
          console.log(`Text content: "${text}"`);
          
          // Handle greeting
          if (text === 'hi' || text === 'hello' || text === 'hey') {
            console.log('Greeting detected, sending welcome menu');
            // Send immediate text response
            await sendTextMessage(userPhone, `Hi ${userName}, welcome to Municipal Services! Loading menu...`);
            
            // Send menu after a small delay
            setTimeout(async () => {
              await sendServiceMenu(userPhone, userName);
            }, 1000);
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
              'I didn\'t understand. Please say "hi" to see the service menu, or directly type "property" or "water" for specific services.'
            );
          }
        }
        // Handle interactive responses
        else if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
          const selection = message.interactive.list_reply.id;
          console.log(`User selected: ${selection}`);
          
          if (selection === 'property_tax') {
            await sendTextMessage(userPhone, 'Please enter your Property ID number:');
          }
          else if (selection === 'water_bill') {
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
  console.log(`WhatsApp bot server started on port ${port}`);
  
  // Check configuration
  console.log('\n=== CONFIGURATION ===');
  console.log(`API Key: ${WHATSAPP_API_KEY ? '✓ Configured' : '✗ MISSING'}`);
  console.log(`Phone Number ID: ${PHONE_NUMBER_ID || '✗ MISSING'}`);
  console.log(`API Version: ${API_VERSION}`);
  console.log(`Verify Token: ${VERIFY_TOKEN}`);
  console.log('====================\n');
});