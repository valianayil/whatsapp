const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = process.env.API_VERSION || 'v16.0';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'electronic_city_municipal_services';

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

// Add a test route to check API connectivity
app.get('/test-api', async (req, res) => {
  console.log('Testing WhatsApp API connection...');
  
  try {
    // First, try to get basic metadata
    console.log('Checking API connectivity...');
    const metaResponse = await axios({
      method: 'GET',
      url: `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    const phoneData = metaResponse.data;
    
    // If the query parameter 'to' is provided, try sending a test message
    let messageResult = { sent: false };
    if (req.query.to) {
      const testPhone = req.query.to;
      console.log(`Trying to send test message to ${testPhone}...`);
      
      // Attempt to send a message
      const success = await sendTextMessage(
        testPhone,
        'This is a test message from the WhatsApp Municipal Services Bot.'
      );
      
      messageResult = { 
        sent: success,
        to: testPhone
      };
    }
    
    // Return diagnostic information
    res.json({
      api_status: 'connected',
      api_version: API_VERSION,
      phone_number_id: PHONE_NUMBER_ID,
      display_phone_number: phoneData.display_phone_number || 'unknown',
      phone_status: phoneData.status || 'unknown',
      token_length: WHATSAPP_API_KEY?.length || 0,
      test_message: messageResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API test failed:', error);
    
    // Return error information
    res.status(500).json({
      api_status: 'error',
      error_type: error.response ? 'API error' : error.code || 'unknown',
      status_code: error.response ? error.response.status : null,
      error_message: error.response ? error.response.data : error.message,
      api_version: API_VERSION,
      phone_number_id: PHONE_NUMBER_ID,
      token_length: WHATSAPP_API_KEY?.length || 0,
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook handler for incoming messages
app.post('/webhook', async (req, res) => {
  // IMPORTANT: Send HTTP response immediately to acknowledge receipt
  res.status(200).send('EVENT_RECEIVED');
  
  try {
    // Log full request for debugging
    console.log(`Webhook received: ${JSON.stringify(req.body, null, 2)}`);
    
    // Validate webhook data
    if (!req.body.object || req.body.object !== 'whatsapp_business_account') {
      console.log('Invalid webhook data - not a WhatsApp Business Account message');
      return;
    }
    
    // Extract entries
    const entries = req.body.entry || [];
    if (entries.length === 0) {
      console.log('No entries found in webhook data');
      return;
    }
    
    // Process all changes
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        // Skip status updates (delivery receipts, etc.)
        if (change.value.statuses) {
          console.log('Skipping status update message');
          continue;
        }
        
        // Process actual messages
        const messages = change.value.messages || [];
        if (messages.length === 0) {
          console.log('No messages found in this change');
          continue;
        }
        
        // Process each message
        for (const message of messages) {
          // Ensure we have all required data
          if (!message.from || !message.type) {
            console.log('Message missing required data:', message);
            continue;
          }
          
          const userPhone = message.from;
          const userName = change.value.contacts?.[0]?.profile?.name || 'there';
          
          console.log(`Processing message from ${userName} (${userPhone}): ${message.type}`);
          
          // Track message timestamp to avoid duplicate processing
          const messageTimestamp = message.timestamp;
          const messageId = message.id;
          console.log(`Message details: ID=${messageId}, timestamp=${messageTimestamp}`);
          
          // Process text messages
          if (message.type === 'text' && message.text && message.text.body) {
            const text = message.text.body.toLowerCase().trim();
            console.log(`Text message content: "${text}"`);
            
            // Process immediately
            try {
              // Handle greetings (hi, hello)
              if (text === 'hi' || text === 'hello' || text === 'hey') {
                await sendTextMessage(
                  userPhone, 
                  `Hi ${userName}, welcome to Municipal Services! I can help you with Property Tax or Water Bill payments. Which service do you need today? Reply with "property" or "water".`
                );
              }
              // Handle property tax requests
              else if (text.includes('property') || text === '1') {
                await sendTextMessage(userPhone, 'Please enter your Property ID number:');
              }
              // Handle water bill requests
              else if (text.includes('water') || text === '2') {
                await sendTextMessage(userPhone, 'Please enter your Water Consumer Number:');
              }
              // Handle property ID input (numeric 6-10 digits)
              else if (/^\d{6,10}$/.test(text)) {
                await sendTextMessage(
                  userPhone,
                  `Thank you! Your Property Tax details:\nProperty ID: ${text}\nAmount Due: ₹5,250\n\nTo pay, visit: https://municipality.gov/pay-property/${text}`
                );
              }
              // Handle water consumer ID input (alphanumeric 6-12 chars)
              else if (/^[A-Za-z0-9]{6,12}$/.test(text)) {
                await sendTextMessage(
                  userPhone,
                  `Thank you! Your Water Bill details:\nConsumer No: ${text}\nAmount Due: ₹750\n\nTo pay, visit: https://municipality.gov/pay-water/${text}`
                );
              }
              // Default response for unrecognized messages
              else {
                await sendTextMessage(
                  userPhone,
                  'I didn\'t understand. Please say "hi" to start over, or type "property" or "water" for specific services.'
                );
              }
            } catch (messageError) {
              console.error(`Error processing message from ${userPhone}:`, messageError);
            }
          } else {
            console.log(`Skipping unsupported message type: ${message.type}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

// Add retry logic for API calls
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

// Function to send text messages with retry logic
async function sendTextMessage(to, message) {
  console.log(`Sending message to ${to}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  
  // Make sure phone number is in correct format
  const formattedNumber = to.startsWith('+') ? to.substring(1) : to;
  
  // Prepare the message payload once
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedNumber,
    type: 'text',
    text: { body: message }
  };
  
  // Construct the API URL with proper format
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  
  // Log connection details
  console.log(`WhatsApp API: Using URL ${url}`);
  console.log(`WhatsApp API: Using Phone Number ID ${PHONE_NUMBER_ID}`);
  console.log(`WhatsApp API: Using token length ${WHATSAPP_API_KEY?.length || 0}`);
  
  // Implement retry logic
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt}/${MAX_RETRIES} for sending to ${to}...`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
    
    try {
      // Send the message with reduced timeout (faster response but may fail more often)
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: data,
        timeout: 5000 // 5 second timeout, shorter to fail faster
      });
      
      // Log success response
      console.log(`✅ Message sent successfully to ${to}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } catch (error) {
      lastError = error;
      
      // Only show detailed error on last retry
      if (attempt === MAX_RETRIES) {
        // Handle specific error cases
        console.error(`❌ Failed to send message to ${to}:`);
        
        if (error.response) {
          // The API responded with an error
          console.error(`Status: ${error.response.status}`);
          console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
          
          // Common error types and advice
          const errorCode = error.response.data?.error?.code;
          const errorMessage = error.response.data?.error?.message || '';
          
          if (errorCode === 100) {
            console.error('ERROR: Invalid parameter - Check phone number and Phone Number ID');
          } else if (errorCode === 190) {
            console.error('ERROR: Authentication failed - Token is invalid or expired');
          } else if (errorCode === 10) {
            console.error('ERROR: Permission denied - Token does not have required permissions');
          } else if (errorMessage.includes('rate limit')) {
            console.error('ERROR: Rate limit hit - Too many messages too quickly');
          }
        } else if (error.code === 'ECONNABORTED') {
          console.error('ERROR: Request timed out - Check your internet connection');
        } else if (error.code === 'ENOTFOUND') {
          console.error('ERROR: Cannot connect to API - Check your internet connection');
        } else {
          console.error(`Error: ${error.message}`);
        }
      } else {
        // Simple log for retries
        console.log(`Attempt ${attempt+1} failed: ${error.message}`);
      }
      
      // Continue to next retry
      continue;
    }
  }
  
  // If we got here, all retries failed
  return false;
}

// Start the server
app.listen(port, () => {
  console.log(`WhatsApp Chatbot server listening on port ${port}`);
}); 