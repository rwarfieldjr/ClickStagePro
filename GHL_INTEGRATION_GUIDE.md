# Go High Level Integration Guide for ClickStage Pro

## Overview
This guide explains how to integrate the ClickStage Pro virtual staging website with Go High Level (GHL) for seamless CRM integration and lead management.

## Integration Methods

### 1. Webhook Integration (Recommended)

**Webhook Endpoint**: `https://your-domain.replit.app/api/ghl-webhook`

**Setup in Go High Level:**
1. Go to Settings → Automations → Workflows
2. Create a new workflow triggered by "Contact Created" or "Form Submitted"
3. Add a Custom Webhook action with the following configuration:

**Request Type**: POST
**URL**: `https://your-domain.replit.app/api/ghl-webhook`
**Headers**: 
```
Content-Type: application/json
```

**Request Body** (JSON):
```json
{
  "contact": {
    "first_name": "{{contact.first_name}}",
    "last_name": "{{contact.last_name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}",
    "property_type": "{{contact.property_type}}",
    "rooms": "{{contact.rooms}}",
    "message": "{{contact.message}}"
  }
}
```

### 2. Form Embedding

**Contact Form URL**: `https://your-domain.replit.app/contact`

The contact form can be embedded directly in GHL using:
- iframe embedding
- Custom HTML widget
- Direct link in funnels

**Iframe Code:**
```html
<iframe 
  src="https://your-domain.replit.app/contact" 
  width="100%" 
  height="800px" 
  frameborder="0">
</iframe>
```

### 3. API Integration

**Direct API Endpoints for Custom Integration:**

**Create Staging Request:**
```
POST https://your-domain.replit.app/api/staging-requests
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(864) 400-0766",
  "propertyType": "Single Family Home",
  "rooms": "3",
  "message": "Need staging for my listing",
  "propertyImages": []
}
```

## GHL Form Field Mapping

| GHL Field Name | ClickStage Field | Required |
|---------------|------------------|----------|
| first_name    | name (part 1)    | No       |
| last_name     | name (part 2)    | No       |
| email         | email            | Yes      |
| phone         | phone            | No       |
| property_type | propertyType     | No       |
| rooms         | rooms            | No       |
| message       | message          | No       |

## Website Compatibility Features

### 1. Clean HTML Structure
- Semantic HTML5 elements
- No complex JavaScript dependencies blocking GHL
- External CSS/JS via CDN when needed

### 2. Responsive Design
- Mobile-first responsive layout
- Works in GHL's mobile app preview
- Consistent across all devices

### 3. Form Integration
- Works with GHL form builders
- Compatible with GHL's tracking pixels
- Supports GHL's conversion tracking

### 4. SEO Optimization
- Proper meta tags for GHL page builder
- Open Graph tags for social sharing
- Clean URL structure

## Stripe Payment Integration

### 1. Payment Flow in GHL
When integrating payments:
1. Collect lead information in GHL
2. Redirect to ClickStage pricing page
3. Process payment via Stripe
4. Return confirmation to GHL

### 2. Webhook Notifications
Configure Stripe webhooks to notify GHL of:
- Successful payments
- Failed payments
- Subscription status changes

**Stripe Webhook Endpoint**: `/api/stripe-webhook`

## Implementation Steps

### Step 1: Deploy ClickStage Pro
1. Ensure your Replit app is published
2. Note your app's URL (e.g., `your-app.replit.app`)
3. Configure environment variables:
   - `STRIPE_SECRET_KEY`
   - `VITE_STRIPE_PUBLIC_KEY`
   - `ADMIN_API_KEY`

### Step 2: Configure GHL Webhook
1. Create a new workflow in GHL
2. Set trigger to "Contact Created" or "Form Submitted"
3. Add Custom Webhook action
4. Use the webhook URL and JSON payload from above
5. Test the integration

### Step 3: Embed Contact Form
1. Choose your preferred embedding method
2. Add the contact form to your GHL funnel/website
3. Test form submissions
4. Verify webhook data reception

### Step 4: Set Up Admin Access
1. Set the `ADMIN_API_KEY` environment variable
2. Access admin dashboard at `/admin`
3. Monitor incoming leads and staging requests

## Testing Integration

### 1. Webhook Testing
- Use GHL's workflow testing feature
- Monitor webhook logs in your app
- Verify contact creation in admin dashboard

### 2. Form Testing
- Submit test forms from different devices
- Check email notifications
- Verify data appears in GHL and admin dashboard

### 3. Payment Testing
- Use Stripe test mode for payment testing
- Test different pricing tiers
- Verify webhook notifications

## Troubleshooting

### Common Issues:

**Webhook Not Triggering:**
- Check GHL workflow is active
- Verify webhook URL is correct
- Check for SSL/HTTPS requirements

**Form Not Submitting:**
- Check CORS settings
- Verify JavaScript isn't blocked
- Test in different browsers

**Missing Data:**
- Check field mapping in webhook payload
- Verify required fields are present
- Check for character encoding issues

## Advanced Features

### 1. Custom Fields
Add custom fields to match your GHL setup:
- Property address
- Listing price
- Preferred staging style
- Timeline requirements

### 2. Automated Follow-up
Configure GHL workflows for:
- Immediate confirmation emails
- Follow-up sequences
- Appointment scheduling
- Service delivery notifications

### 3. Analytics Integration
- Track conversion rates
- Monitor lead quality
- Measure ROI on staging services

## Support

For technical issues with the ClickStage Pro integration:
1. Check the admin dashboard for error logs
2. Verify webhook payloads in GHL
3. Test API endpoints directly
4. Contact support with specific error messages

## Security Considerations

- All API endpoints use HTTPS
- Admin access requires API key authentication
- File uploads are validated and secured
- Webhook endpoints validate incoming data
- Stripe handles all payment processing securely