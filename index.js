const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v22.0';

// Middleware to parse JSON bodies
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log('=== INCOMING REQUEST ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('=======================');
  next();
});

// Welcome route
app.get('/', (req, res) => {
  res.send('Electronic City Municipal Services WhatsApp Bot is running!');
});

// Test webhook route
app.get('/webhook-test', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Webhook Test</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #128C7E; }
          .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .steps { line-height: 1.6; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>WhatsApp Webhook Test Page</h1>
        <div class="info">
          <p>Use this information to configure your webhook in the Meta Developer Portal:</p>
          <ul>
            <li><strong>Callback URL:</strong> <code>https://whatsapp-nu-neon.vercel.app/webhook</code></li>
            <li><strong>Verify Token:</strong> <code>${process.env.VERIFY_TOKEN || 'electronic_city_municipal_services'}</code></li>
            <li><strong>Fields to subscribe:</strong> <code>messages</code></li>
          </ul>
        </div>
        <div class="steps">
          <h2>Steps to Configure Webhook:</h2>
          <ol>
            <li>Go to <a href="https://developers.facebook.com/" target="_blank">Meta Developer Portal</a></li>
            <li>Navigate to your WhatsApp Business App</li>
            <li>Go to WhatsApp &gt; Configuration &gt; Webhooks</li>
            <li>Click "Configure Webhooks" or "Edit" if already configured</li>
            <li>Enter the Callback URL and Verify Token provided above</li>
            <li>Select "messages" under Subscription Fields</li>
            <li>Click "Verify and Save"</li>
          </ol>
        </div>
      </body>
    </html>
  `);
});

// Conversation state tracking
const userStates = {};

// WhatsApp API message sender function
async function sendWhatsAppMessage(to, message) {
  try {
    console.log(`Sending WhatsApp message to ${to}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
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
        text: {
          body: message
        }
      }
    });
    console.log(`Message sent successfully to ${to}, response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Send interactive message with buttons
async function sendInteractiveButtonMessage(to, headerText, bodyText, buttons) {
  try {
    console.log(`Sending interactive button message to ${to}`);
    console.log(`Header: "${headerText}", Body: "${bodyText.substring(0, 50)}${bodyText.length > 50 ? '...' : ''}"`);
    console.log('Buttons:', JSON.stringify(buttons, null, 2));
    
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
        type: 'interactive',
        interactive: {
          type: 'button',
          header: headerText ? {
            type: 'text',
            text: headerText
          } : undefined,
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons
          }
        }
      }
    });
    console.log(`Interactive message sent successfully to ${to}, response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error sending interactive message:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Send a template message (useful for testing)
async function sendTemplateMessage(to, templateName, languageCode = 'en_US') {
  try {
    console.log('Sending template message:', {
      to,
      templateName,
      languageCode,
      phoneNumberId: PHONE_NUMBER_ID,
      apiVersion: API_VERSION
    });

    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      }
    });
    console.log('Template message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending template message:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      throw new Error(`WhatsApp API Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('No response received from WhatsApp API');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
}

// Send interactive list message with sections
async function sendInteractiveListMessage(to, headerText, bodyText, buttonText, sections) {
  try {
    console.log('Attempting to send interactive list message:', {
      to,
      headerText,
      bodyText: bodyText.substring(0, 50) + (bodyText.length > 50 ? '...' : ''),
      buttonText,
      phoneNumberId: process.env.PHONE_NUMBER_ID,
      apiVersion: process.env.API_VERSION
    });

    const requestData = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: headerText ? {
          type: 'text',
          text: headerText
        } : undefined,
        body: {
          text: bodyText
        },
        footer: {
          text: 'Powered by Electronic City Municipal Corporation'
        },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    };

    console.log('Request payload:', JSON.stringify(requestData, null, 2));

    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/${process.env.API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: requestData
    });

    console.log('Interactive list message sent successfully. Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error sending interactive list message:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Request config:', JSON.stringify({
        url: error.config.url,
        method: error.config.method,
        headers: {
          ...error.config.headers,
          'Authorization': 'Bearer [REDACTED]'
        }
      }, null, 2));
    } else if (error.request) {
      console.error('No response received from API:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw error;
  }
}

// Webhook verification endpoint for WhatsApp
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Add a test endpoint to try sending a message
app.get('/test-message', async (req, res) => {
  try {
    const to = req.query.to; // Get the target phone number from query parameter
    
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        error: "Please provide a 'to' parameter with the recipient's phone number" 
      });
    }
    
    // Send a template message using environment variables
    const result = await sendTemplateMessage(to, 'hello_world');
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a test info endpoint that shows the curl command
app.get('/test-info', (req, res) => {
  const to = req.query.to || 'YOUR_PHONE_NUMBER'; // Default number or get from query
  
  const curlCommand = `curl -i -X POST \\
  https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{ "messaging_product": "whatsapp", "to": "${to}", "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }'`;

  res.send(`
    <html>
      <head>
        <title>WhatsApp Test Info</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #128C7E; }
          .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          pre { background: #eee; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .warning { color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>WhatsApp Test Information</h1>
        <div class="warning">
          <strong>Note:</strong> For security reasons, sensitive values are not displayed. Use your actual API key and phone number when testing.
        </div>
        <div class="info">
          <h2>Environment Variables Status:</h2>
          <ul>
            <li><strong>API Version:</strong> ${API_VERSION}</li>
            <li><strong>Configuration Status:</strong> ${WHATSAPP_API_KEY && PHONE_NUMBER_ID ? '✅ Configured' : '❌ Missing'}</li>
          </ul>
        </div>
        <div class="info">
          <h2>Test Endpoints:</h2>
          <ul>
            <li><strong>Send Test Message:</strong> <code>/test-message?to=your_number</code></li>
            <li><strong>Debug Test:</strong> <code>/debug-test</code></li>
            <li><strong>Webhook Test:</strong> <code>/webhook-test</code></li>
          </ul>
        </div>
        <div class="info">
          <h2>Example cURL Command Format:</h2>
          <pre>${curlCommand}</pre>
          <p><em>Replace YOUR_API_KEY with your actual WhatsApp API key</em></p>
        </div>
      </body>
    </html>
  `);
});

// Add a debug test route
app.get('/debug-test', async (req, res) => {
  try {
    console.log('Debug test initiated');
    console.log('Environment variables:');
    console.log('API Version:', API_VERSION);
    console.log('Phone Number ID:', PHONE_NUMBER_ID);
    console.log('API Key Length:', WHATSAPP_API_KEY ? WHATSAPP_API_KEY.length : 'not set');
    
    // Test the API connection
    const response = await axios({
      method: 'GET',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      apiConnection: 'successful',
      phoneNumberDetails: response.data
    });
  } catch (error) {
    console.error('Debug test error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Process incoming messages
async function processIncomingMessage(message, from, userName) {
  console.log(`Processing message from ${from}, userName: ${userName}`);

  try {
    // Handle messages based on type
    if (message.type === 'text') {
      // Handle text messages
      const text = message.text.body.toLowerCase().trim();
      console.log(`Received text message: "${text}" from ${from}`);

      // Always process greetings immediately
      if (text === 'hi' || text === 'hello' || text === 'hey' || text === 'hola') {
        console.log(`Sending welcome message to ${from} with name ${userName}`);
        try {
          await sendInteractiveListMessage(
            message.from, // Use message.from to ensure we reply to the sender
            'Electronic City Municipal Services',
            `Hi ${userName}, welcome to Electronic City Municipal Services.\nPlease select one of our services:`,
            'View Services',
            [
              {
                title: 'Municipal Services',
                rows: [
                  { id: 'property_tax', title: 'Pay Property tax', description: 'Pay your property tax online' },
                  { id: 'water_bill', title: 'Pay Water charges', description: 'Pay your water bill online' }
                ]
              }
            ]
          );
        } catch (error) {
          console.error('Error in greeting flow:', error);
          // If interactive message fails, send fallback text message
          await sendWhatsAppMessage(
            message.from, // Use message.from to ensure we reply to the sender
            `Hi ${userName}, welcome to Electronic City Municipal Services.\n\nAvailable services:\n1. Property Tax Payment - reply with '1'\n2. Water Bill Payment - reply with '2'`
          );
        }
        return;
      }

      // Handle property tax related messages
      if (text === '1' || text === 'property' || text === 'property tax' || text.includes('property')) {
        await sendWhatsAppMessage(message.from, 'Please enter your PID number.');
        return;
      }

      // Handle water bill related messages
      if (text === '2' || text === 'water' || text === 'water bill' || text.includes('water')) {
        await sendWhatsAppMessage(message.from, 'Please enter your Water Billing ID.');
        return;
      }

      // Handle PID number format (assuming PID is numeric and 6-10 digits)
      if (/^\d{6,10}$/.test(text)) {
        await sendWhatsAppMessage(
          message.from,
          `Thank you! You can pay your property tax by clicking on this link:\nhttps://municipality.com/paytax?userID=${text}`
        );
        return;
      }

      // Handle Water ID format (assuming Water ID is alphanumeric and 6-12 characters)
      if (/^[A-Za-z0-9]{6,12}$/.test(text)) {
        await sendWhatsAppMessage(
          message.from,
          `Thank you! You can pay your water bill by clicking on this link:\nhttps://municipality.com/waterbill?userID=${text}`
        );
        return;
      }

      // If we reach here, we didn't understand the message
      await sendWhatsAppMessage(
        message.from,
        `I'm not sure what you're looking for. Please try one of these options:\n\n1. Say "hi" for a welcome message\n2. Type "1" for Property Tax Payment\n3. Type "2" for Water Bill Payment`
      );
    } else if (message.type === 'interactive') {
      // Handle interactive responses
      const interactive = message.interactive;
      if (interactive.type === 'list_reply') {
        if (interactive.list_reply.id === 'property_tax') {
          await sendWhatsAppMessage(message.from, 'Please enter your PID number.');
        } else if (interactive.list_reply.id === 'water_bill') {
          await sendWhatsAppMessage(message.from, 'Please enter your Water Billing ID.');
        }
      }
    }
  } catch (error) {
    console.error('Error in processIncomingMessage:', error);
    try {
      await sendWhatsAppMessage(
        message.from,
        'Sorry, I encountered an error processing your message. Please try again.'
      );
    } catch (fallbackError) {
      console.error('Error sending error message:', fallbackError);
    }
  }
}

// Webhook for incoming messages
app.post('/webhook', async (req, res) => {
  try {
    // Debug logging for environment variables
    console.log('============ DEBUG INFO ============');
    console.log('API Version:', process.env.API_VERSION);
    console.log('Phone Number ID:', process.env.PHONE_NUMBER_ID);
    console.log('API Key Length:', process.env.WHATSAPP_API_KEY ? process.env.WHATSAPP_API_KEY.length : 'not set');
    console.log('Verify Token:', process.env.VERIFY_TOKEN);
    console.log('==================================');

    // Log all incoming webhook requests
    console.log('============ WEBHOOK RECEIVED ============');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('==========================================');
    
    // Immediately respond to the webhook to avoid timeouts
    res.status(200).send('EVENT_RECEIVED');

    // Check if this is a WhatsApp message
    if (req.body.object === 'whatsapp_business_account') {
      for (const entry of req.body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          
          // Check if this is a status update
          if (value.statuses) {
            console.log('Received status update:', value.statuses[0].status);
            continue; // Skip status updates
          }

          // Check if this is a new message
          if (change.field === 'messages' && 
              value.messages && 
              value.messages[0] &&
              value.messages[0].type === 'text') { // Only process text messages
            
            const message = value.messages[0];
            
            // Extract user name from contacts if available
            let userName = 'there';
            if (value.contacts?.[0]?.profile?.name) {
              userName = value.contacts[0].profile.name;
            }

            console.log(`Processing message from ${message.from} (${userName}):`, JSON.stringify(message, null, 2));

            // Process message based on type and user state
            await processIncomingMessage(message, message.from, userName);
            console.log(`Response sent to ${message.from}`);
          } else {
            console.log('Skipping non-text message or status update');
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
  console.log(`WhatsApp Chatbot server listening on port ${port}`);
}); 