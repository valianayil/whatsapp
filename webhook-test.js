require('dotenv').config();
const axios = require('axios');
const express = require('express');

// Get configuration
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'electronic_city_municipal_services';
const YOUR_WEBHOOK_URL = 'https://whatsapp-nu-neon.vercel.app/webhook';  // Update with your actual webhook URL

console.log('=== WEBHOOK VERIFICATION TEST ===');
console.log('Webhook URL:', YOUR_WEBHOOK_URL);
console.log('Verify Token:', VERIFY_TOKEN);

// Function to simulate Meta's webhook verification
async function testWebhookVerification() {
  console.log('\nSimulating Meta webhook verification...');
  
  try {
    // Build verification URL with challenge and token
    const challenge = 'test_challenge_' + Math.floor(Math.random() * 1000000);
    const verificationUrl = `${YOUR_WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=${challenge}`;
    
    console.log(`Sending verification request to: ${verificationUrl}`);
    
    const response = await axios.get(verificationUrl);
    
    // Check if the challenge was returned correctly
    if (response.status === 200 && response.data === challenge) {
      console.log('\n✅ SUCCESS: Webhook verification passed!');
      console.log('Your webhook correctly returned the challenge.');
      return true;
    } else {
      console.log('\n❌ ERROR: Webhook verification failed!');
      console.log('Status code:', response.status);
      console.log('Response:', response.data);
      
      if (response.status === 200 && response.data !== challenge) {
        console.log('Your webhook responded but did not return the challenge correctly.');
      }
      
      return false;
    }
  } catch (error) {
    console.log('\n❌ ERROR: Could not verify webhook');
    
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Response:', error.response.data);
      
      if (error.response.status === 403) {
        console.log('Your webhook rejected the verification (403 Forbidden).');
        console.log('This usually means the verify_token did not match.');
      } else if (error.response.status === 404) {
        console.log('Your webhook URL could not be found (404 Not Found).');
        console.log('Check if your webhook URL is correct and accessible.');
      }
    } else if (error.code === 'ENOTFOUND') {
      console.log('Could not resolve the webhook URL.');
      console.log('Check if your webhook URL is correct.');
    } else {
      console.log('Error details:', error.message);
    }
    
    return false;
  }
}

// Function to simulate sending a test message to the webhook
async function sendTestMessageToWebhook() {
  console.log('\nSimulating Meta sending a message to your webhook...');
  
  const testPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '123456789',
            phone_number_id: '123456789'
          },
          contacts: [{
            profile: {
              name: 'Test User'
            },
            wa_id: '123456789'
          }],
          messages: [{
            from: '123456789',
            id: 'test-message-id',
            timestamp: Math.floor(Date.now() / 1000),
            text: {
              body: 'This is a test message'
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  try {
    console.log('Sending test message payload to webhook...');
    
    const response = await axios.post(YOUR_WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Webhook accepted the message!');
    console.log('Status code:', response.status);
    console.log('Response:', response.data);
    
    if (response.status === 200 && response.data === 'EVENT_RECEIVED') {
      console.log('Your webhook is correctly processing messages.');
    } else {
      console.log('Your webhook responded with an unexpected response.');
    }
    
    return true;
  } catch (error) {
    console.log('\n❌ ERROR: Failed to send test message to webhook');
    
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error details:', error.message);
    }
    
    return false;
  }
}

// Run tests
async function runTests() {
  const verificationPassed = await testWebhookVerification();
  
  if (verificationPassed) {
    await sendTestMessageToWebhook();
    
    console.log('\n==== WEBHOOK TEST SUMMARY ====');
    console.log('Your webhook verification is working correctly.');
    console.log('');
    console.log('Make sure you have also:');
    console.log('1. Set up the webhook in the Meta Developer Portal');
    console.log('2. Subscribed to the "messages" field');
    console.log('3. Verified your WhatsApp Business number');
    console.log('==============================');
  } else {
    console.log('\n==== WEBHOOK TEST SUMMARY ====');
    console.log('Your webhook verification is NOT working correctly.');
    console.log('This must be fixed before your WhatsApp messages will work.');
    console.log('');
    console.log('Check that:');
    console.log('1. Your webhook URL is correct and accessible');
    console.log('2. Your verify token matches in both your .env file and Meta Developer Portal');
    console.log('3. Your webhook is properly handling the verification request');
    console.log('==============================');
  }
}

// Start the tests
runTests().catch(err => {
  console.error('Unexpected error during tests:', err);
}); 