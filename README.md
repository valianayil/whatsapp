# WhatsApp Municipal Services Chatbot

An interactive WhatsApp chatbot for Electronic City Municipal Services built with Node.js and Express.

## Features

- Interactive menu-driven chatbot interface
- Property tax payment service
- Water bill payment service
- Automatic name detection from WhatsApp profile

## Deployment Instructions

### 1. Set Environment Variables

Before deploying, you must set these environment variables:

```
WHATSAPP_API_KEY=your_whatsapp_api_key
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
API_VERSION=v22.0
VERIFY_TOKEN=electronic_city_municipal_services
```

**IMPORTANT:** These values should be set in your hosting environment and NOT committed to version control.

### 2. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Set environment variables
vercel env add WHATSAPP_API_KEY
vercel env add PHONE_NUMBER_ID
vercel env add API_VERSION
vercel env add VERIFY_TOKEN

# Deploy to production
vercel --prod
```

### 3. Configure WhatsApp Business API Webhook

1. Go to the Meta Developer Portal
2. Navigate to your WhatsApp app
3. Set up the webhook:
   - URL: `https://your-deployment-url.vercel.app/webhook`
   - Verify token: `electronic_city_municipal_services` (or your custom token)
   - Subscribe to `messages` events

## Local Development

1. Clone the repository
2. Create a `.env` file with your credentials (see `.env.example`)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Security Notes

- API keys and credentials are stored in environment variables
- The `.env` file is git-ignored to prevent accidental exposure
- Logs are carefully sanitized to avoid exposing sensitive information

## Exact Flow

1. **Initial Greeting (Triggered on any incoming message):**
   * Gets the user's name from the WhatsApp API metadata (`contacts.name`)
   * Sends a welcome message with a single button titled: `Select Service`

2. **Service Menu (After clicking "Select Service"):**
   * Shows an interactive button menu with two options:
     * Property Tax Payment
     * Water Bill Payment

3. **Service Handling:**
   * If the user selects **Property Tax Payment**, the bot asks:
     ```
     Please enter your PID number.
     ```
     When the user replies with a PID, the bot responds with:
     ```
     Thank you! You can pay your property tax by clicking on this link:
     https://municipality.com/paytax?userID=PID_NUMBER
     ```

   * If the user selects **Water Bill Payment**, the bot asks:
     ```
     Please enter your Water Billing ID.
     ```
     When the user replies with the ID, the bot responds with:
     ```
     Thank you! You can pay your water bill by clicking on this link:
     https://municipality.com/waterbill?userID=WATER_ID
     ```

## License

ISC 