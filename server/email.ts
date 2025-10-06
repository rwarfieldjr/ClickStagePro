import nodemailer from 'nodemailer';
import type { StagingRequest } from '@shared/schema';

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