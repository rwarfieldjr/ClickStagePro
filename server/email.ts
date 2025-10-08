import nodemailer from 'nodemailer';
import type { StagingRequest } from '@shared/schema';
import { signGet } from './lib/r2';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create transporter with fallback for development
function createTransporter() {
  // Check for environment variables first
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback to Ethereal (development) for testing
  console.warn('SMTP credentials not configured, using Ethereal for development');
  return null; // Will create test account dynamically
}

let transporter: nodemailer.Transporter | null = null;
let isConfigured = false;

export async function initializeEmail() {
  try {
    transporter = createTransporter();
    
    if (!transporter) {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Email configured with test account for development');
    }
    
    isConfigured = true;
    console.log('Email service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    isConfigured = false;
  }
}

export async function sendNewRequestNotification(request: StagingRequest) {
  if (!isConfigured || !transporter) {
    console.log('Email service not configured, skipping notification');
    return;
  }

  // Send to multiple admin email addresses
  const adminEmails = [
    'support@clickstagepro.com',
    'RobWarfield@kw.com',
    'RiaSiangioKW@gmail.com'
  ].join(', ');
  
  const htmlContent = `
    <h2>New Virtual Staging Request</h2>
    <p>A new staging request has been submitted through your website.</p>
    
    <h3>Client Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${request.name}</li>
      <li><strong>Email:</strong> ${request.email}</li>
      ${request.phone ? `<li><strong>Phone:</strong> ${request.phone}</li>` : ''}
    </ul>
    
    <h3>Project Details:</h3>
    <ul>
      <li><strong>Property Type:</strong> ${request.propertyType}</li>
      <li><strong>Number of Rooms:</strong> ${request.rooms}</li>
      ${request.message ? `<li><strong>Message:</strong><br>${request.message.replace(/\n/g, '<br>')}</li>` : ''}
    </ul>
    
    <p><strong>Submitted:</strong> ${new Date(request.createdAt ?? Date.now()).toLocaleDateString()} at ${new Date(request.createdAt ?? Date.now()).toLocaleTimeString()}</p>
    
    <p>Please respond to this inquiry within 24 hours to maintain your service standards.</p>
  `;

  const textContent = `
New Virtual Staging Request

Client Information:
- Name: ${request.name}
- Email: ${request.email}
${request.phone ? `- Phone: ${request.phone}` : ''}

Project Details:
- Property Type: ${request.propertyType}
- Number of Rooms: ${request.rooms}
${request.message ? `- Message: ${request.message}` : ''}

Submitted: ${new Date(request.createdAt ?? Date.now()).toLocaleString()}

Please respond to this inquiry within 24 hours.
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ClickStage Pro" <${process.env.SMTP_FROM || 'noreply@clickstagepro.com'}>`,
      to: adminEmails,
      subject: `New Staging Request from ${request.name}`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Notification email sent:', info.messageId);
    
    // Log preview URL for development
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
}

export async function sendClientConfirmation(request: StagingRequest) {
  if (!isConfigured || !transporter) {
    console.log('Email service not configured, skipping confirmation');
    return;
  }

  const htmlContent = `
    <h2>Thank you for your staging request!</h2>
    <p>Hi ${request.name},</p>
    
    <p>We've received your virtual staging request and our team is excited to help transform your property. Here's what happens next:</p>
    
    <h3>Your Request Details:</h3>
    <ul>
      <li><strong>Property Type:</strong> ${request.propertyType}</li>
      <li><strong>Rooms to Stage:</strong> ${request.rooms}</li>
      <li><strong>Submitted:</strong> ${new Date(request.createdAt ?? Date.now()).toLocaleDateString()}</li>
    </ul>
    
    <h3>Next Steps:</h3>
    <ol>
      <li><strong>Within 4 hours:</strong> We'll review your request and send you a custom quote</li>
      <li><strong>Once approved:</strong> Upload your property photos through our secure portal</li>
      <li><strong>Within 48 hours (12 hours with Rush):</strong> Receive your professionally staged photos</li>
    </ol>
    
    <p>Questions? Reply to this email or call us at <strong>(864) 400-0766</strong></p>
    
    <p>Best regards,<br>
    The ClickStage Pro Team</p>
    
    <hr>
    <p><small>ClickStage Pro - Professional Virtual Staging Services<br>
    Transform empty properties into buyer's dreams</small></p>
  `;

  const textContent = `
Thank you for your staging request!

Hi ${request.name},

We've received your virtual staging request and our team is excited to help transform your property. 

Your Request Details:
- Property Type: ${request.propertyType}
- Rooms to Stage: ${request.rooms}
- Submitted: ${new Date(request.createdAt ?? Date.now()).toLocaleDateString()}

Next Steps:
1. Within 4 hours: We'll review your request and send you a custom quote
2. Once approved: Upload your property photos through our secure portal  
3. Within 48 hours (12 hours with Rush): Receive your professionally staged photos

Questions? Reply to this email or call us at (864) 400-0766

Best regards,
The ClickStage Pro Team

---
ClickStage Pro - Professional Virtual Staging Services
Transform empty properties into buyer's dreams
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ClickStage Pro" <${process.env.SMTP_FROM || 'support@clickstagepro.com'}>`,
      to: request.email,
      subject: 'Your Virtual Staging Request Received - ClickStage Pro',
      text: textContent,
      html: htmlContent,
    });

    console.log('Confirmation email sent:', info.messageId);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
  }
}

export async function sendContactFormNotification(data: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}) {
  if (!isConfigured || !transporter) {
    console.log('Email service not configured, skipping contact form notification');
    return;
  }

  // Send to multiple admin email addresses
  const adminEmails = [
    'support@clickstagepro.com',
    'RobWarfield@kw.com',
    'RiaSiangioKW@gmail.com'
  ].join(', ');
  
  const htmlContent = `
    <h2>New Contact Form Submission</h2>
    <p>A new message has been submitted through your Contact Us form.</p>
    
    <h3>Contact Information:</h3>
    <ul>
      <li><strong>Name:</strong> ${data.firstName} ${data.lastName}</li>
      <li><strong>Email:</strong> ${data.email}</li>
    </ul>
    
    <h3>Message:</h3>
    <p>${data.message.replace(/\n/g, '<br>')}</p>
    
    <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
    
    <p>Reply directly to ${data.email} to respond to this inquiry.</p>
  `;

  const textContent = `
New Contact Form Submission

Contact Information:
- Name: ${data.firstName} ${data.lastName}
- Email: ${data.email}

Message:
${data.message}

Submitted: ${new Date().toLocaleString()}

Reply directly to ${data.email} to respond to this inquiry.
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ClickStage Pro" <${process.env.SMTP_FROM || 'noreply@clickstagepro.com'}>`,
      to: adminEmails,
      replyTo: data.email,
      subject: `Contact Form: Message from ${data.firstName} ${data.lastName}`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Contact form notification email sent:', info.messageId);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
  } catch (error) {
    console.error('Failed to send contact form notification email:', error);
    throw error;
  }
}

export async function sendContactFormConfirmation(data: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  if (!isConfigured || !transporter) {
    console.log('Email service not configured, skipping contact form confirmation');
    return;
  }

  const htmlContent = `
    <h2>Thank you for contacting us!</h2>
    <p>Hi ${data.firstName},</p>
    
    <p>We've received your message and appreciate you reaching out to ClickStage Pro. Our team will review your inquiry and respond within 24 hours.</p>
    
    <p>In the meantime, feel free to:</p>
    <ul>
      <li>Explore our <a href="https://clickstagepro.com/portfolio">portfolio</a> of stunning transformations</li>
      <li>Learn more about our <a href="https://clickstagepro.com/services">services</a></li>
      <li>Check out our <a href="https://clickstagepro.com/pricing">pricing packages</a></li>
    </ul>
    
    <p>For urgent matters, call us at <strong>(864) 400-0766</strong></p>
    
    <p>Best regards,<br>
    The ClickStage Pro Team</p>
    
    <hr>
    <p><small>ClickStage Pro - Professional Virtual Staging Services<br>
    Transform empty properties into buyer's dreams</small></p>
  `;

  const textContent = `
Thank you for contacting us!

Hi ${data.firstName},

We've received your message and appreciate you reaching out to ClickStage Pro. Our team will review your inquiry and respond within 24 hours.

In the meantime, feel free to:
- Explore our portfolio: https://clickstagepro.com/portfolio
- Learn about our services: https://clickstagepro.com/services
- Check our pricing: https://clickstagepro.com/pricing

For urgent matters, call us at (864) 400-0766

Best regards,
The ClickStage Pro Team

---
ClickStage Pro - Professional Virtual Staging Services
Transform empty properties into buyer's dreams
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ClickStage Pro" <${process.env.SMTP_FROM || 'support@clickstagepro.com'}>`,
      to: data.email,
      subject: 'Thank You for Contacting ClickStage Pro',
      text: textContent,
      html: htmlContent,
    });

    console.log('Contact form confirmation email sent:', info.messageId);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
  } catch (error) {
    console.error('Failed to send contact form confirmation email:', error);
  }
}

export async function sendOrderNotificationEmail(order: StagingRequest, fileKeys: string[]) {
  if (!isConfigured || !transporter) {
    console.log('Email service not configured, skipping order notification');
    return;
  }

  // Generate presigned download URLs for photos (valid for 1 hour)
  const photoUrls: { key: string; url: string; filename: string }[] = [];
  
  for (const key of fileKeys) {
    try {
      const url = await signGet(key, 3600); // 1 hour expiry
      const filename = key.split('/').pop() || key;
      photoUrls.push({ key, url, filename });
    } catch (error) {
      console.error(`Error generating download URL for ${key}:`, error);
    }
  }

  // Send to multiple recipients
  const recipients = [
    'orders@clickstagepro.com',
    'RobWarfield@KW.com',
    'RiaSiangioKW@gmail.com'
  ].join(', ');

  // Format style name for display
  const styleName = order.style ? order.style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Not specified';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1a1a1a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
        🎨 New Virtual Staging Order Received
      </h2>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 180px;"><strong>Order ID:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Payment Intent:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${order.paymentIntentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Credits Purchased:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${order.photosPurchased}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Staging Style:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${styleName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Date:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${new Date(order.createdAt ?? Date.now()).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
              hour: '2-digit', minute: '2-digit'
            })}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Customer Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 180px;"><strong>Name:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;">${order.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;"><a href="mailto:${order.email}" style="color: #3b82f6;">${order.email}</a></td>
          </tr>
          ${order.phone ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td>
            <td style="padding: 8px 0; color: #1a1a1a;"><a href="tel:${order.phone}" style="color: #3b82f6;">${order.phone}</a></td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${photoUrls.length > 0 ? `
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">📸 Uploaded Photos (${photoUrls.length})</h3>
        <p style="color: #6b7280; margin-bottom: 15px;">Click to download each photo:</p>
        <ul style="list-style: none; padding: 0;">
          ${photoUrls.map((photo, idx) => `
            <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <a href="${photo.url}" 
                 style="color: #3b82f6; text-decoration: none; display: flex; align-items: center;"
                 download="${photo.filename}">
                <span style="background: #3b82f6; color: white; border-radius: 4px; padding: 4px 8px; margin-right: 10px; font-size: 12px;">
                  ${idx + 1}
                </span>
                ${photo.filename}
                <span style="margin-left: 10px; color: #10b981;">⬇ Download</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
          ⏰ Download links expire in 1 hour for security
        </p>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Next Steps:</strong><br>
          1. Download all uploaded photos<br>
          2. Process the staging request<br>
          3. Contact the customer within 24 hours
        </p>
      </div>

      <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>💡 Tip:</strong> View all orders on the admin dashboard at 
          <a href="https://admin.clickstagepro.com" style="color: #3b82f6;">admin.clickstagepro.com</a>
        </p>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
        ClickStage Pro - Professional Virtual Staging Services<br>
        Transform empty properties into buyer's dreams
      </p>
    </div>
  `;

  const textContent = `
🎨 NEW VIRTUAL STAGING ORDER RECEIVED

ORDER DETAILS
=============
Order ID: ${order.id}
Payment Intent: ${order.paymentIntentId}
Credits Purchased: ${order.photosPurchased}
Staging Style: ${styleName}
Date: ${new Date(order.createdAt ?? Date.now()).toLocaleString()}

CUSTOMER INFORMATION
===================
Name: ${order.name}
Email: ${order.email}
${order.phone ? `Phone: ${order.phone}` : ''}

${photoUrls.length > 0 ? `
UPLOADED PHOTOS (${photoUrls.length})
===================
${photoUrls.map((photo, idx) => `${idx + 1}. ${photo.filename}\n   Download: ${photo.url}`).join('\n\n')}

⏰ Download links expire in 1 hour for security
` : ''}

NEXT STEPS
==========
1. Download all uploaded photos
2. Process the staging request
3. Contact the customer within 24 hours

View all orders at: https://admin.clickstagepro.com

---
ClickStage Pro - Professional Virtual Staging Services
Transform empty properties into buyer's dreams
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ClickStage Pro Orders" <${process.env.SMTP_FROM || 'orders@clickstagepro.com'}>`,
      to: recipients,
      subject: `New Order: ${order.photosPurchased} credits - ${styleName} style - ${order.name}`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Order notification email sent:', info.messageId);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }
  } catch (error) {
    console.error('Failed to send order notification email:', error);
    throw error;
  }
}