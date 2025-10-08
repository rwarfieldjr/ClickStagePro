/// <reference types="cypress" />

// Full end-to-end user journey for ClickStagePro.com
// This test uses network stubs for Supabase Auth, Resend, Stripe Checkout, and storage presign
// so it can run deterministically in CI and local dev without external dependencies.
// Replace stubs with real integrations in a staging environment as needed.

// Environment variables (set via cypress.config.* or CLI):
// - BASE_URL: e.g., https://clickstagepro.com or http://localhost:5000
// - TEST_PASSWORD: a simple password for mock auth
// - STRIPE_TEST: set true to use Stripe test intercept/stub

const BASE_URL = (Cypress.env('BASE_URL') as string) || 'http://localhost:5000';

function randomEmail(): string {
  const ts = Date.now();
  return `test+${ts}@test.com`;
}

// Common selectors used across app
const selectors = {
  // Header / navigation
  headerClientPortalBtn: '[data-testid="button-client-portal"]',
  // Auth
  adminApiKeyInput: '[data-testid="input-api-key"]',
  adminLoginBtn: '[data-testid="button-login"]',
  // Pricing / Checkout
  backToPricing: '[data-testid="button-back-to-pricing"]',
  // Payment
  completePaymentBtn: '[data-testid="button-complete-payment"]',
  // Account / Dashboard
  accountTitle: '[data-testid="text-account-title"]',
  // File manager (client portal)
  fileManagerUploadInput: 'input[type="file"]',
  // Buttons we added in FileManager.tsx
  fileBtnOpen: 'button:contains("Open")',
  fileBtnJpg: 'button:contains("JPG")',
  fileBtnPng: 'button:contains("PNG")',
  fileBtnWebp: 'button:contains("WebP")',
  fileBtnZip: 'button:contains("Download ZIP")',
};

// Utility: stub /api/auth/me to emulate authenticated user after sign-in
function stubAuthMe(user: { id: string; email: string }) {
  cy.intercept('GET', `${BASE_URL}/api/auth/me`, {
    statusCode: 200,
    body: { success: true, user },
  }).as('authMe');
}

// Utility: stub R2 manager endpoints to list and upload files
function stubFileManager(initialKeys: string[] = []) {
  let keys = [...initialKeys];

  // List endpoint
  cy.intercept('GET', `${BASE_URL}/api/manager/list**`, req => {
    req.reply({
      base: '/',
      folders: [],
      files: keys.map((k, i) => ({ key: k, name: k.split('/').pop(), size: 123456 + i, lastModified: new Date().toISOString() })),
    });
  }).as('listFiles');

  // Presign upload
  cy.intercept('POST', `${BASE_URL}/api/manager/sign-upload`, req => {
    const { filename } = req.body || {};
    const userId = 'user_123';
    const y = new Date().getUTCFullYear();
    const m = String(new Date().getUTCMonth() + 1).padStart(2, '0');
    const key = `${userId}/originals/${y}/${m}/${Cypress._.random(10000, 99999)}-${(filename || 'file').replace(/[^\w.\-]+/g, '_')}`;
    // remember the key; the client PUT to url will succeed via stub below
    keys.push(key);
    req.reply({ key, url: `${BASE_URL}/__fake_presigned`, headers: { 'x-mock': '1' } });
  }).as('signUpload');

  // Presigned PUT (accept and return 200)
  cy.intercept('PUT', `${BASE_URL}/__fake_presigned`, { statusCode: 200, body: '' }).as('r2Put');

  // File download links
  cy.intercept('GET', `${BASE_URL}/api/files/url**`, req => {
    const url = `${BASE_URL}/public/placeholder.png`;
    req.reply({ url });
  }).as('fileUrl');

  // Zip download
  cy.intercept('POST', `${BASE_URL}/api/files/zip`, req => {
    req.reply({ statusCode: 200, body: new Blob(['PK\u0003\u0004'], { type: 'application/zip' }) });
  }).as('zip');
}

// Utility: Stripe checkout stub (return a URL that is on our app to continue the flow)
function stubStripeCheckout() {
  cy.intercept('POST', `${BASE_URL}/api/billing/create-checkout-session`, req => {
    req.reply({ statusCode: 200, body: { url: `${BASE_URL}/payment-success?session_id=cs_test_123` } });
  }).as('createCheckout');
}

// Utility: Mock Supabase Auth email verification by stubbing an auth endpoint or final redirect
function stubSupabaseAuth() {
  // If your app calls Supabase auth endpoints, intercept them here. Example patterns:
  cy.intercept('POST', /supabase\.co\/auth\/v1\/signup/, { statusCode: 200, body: { id: 'user_123' } }).as('supabaseSignup');
  cy.intercept('POST', /supabase\.co\/auth\/v1\/token/, { statusCode: 200, body: { access_token: 'test_token', token_type: 'bearer' } }).as('supabaseToken');
}

// Utility: Intercept admin alert email/Resend (mock)
function stubResend() {
  cy.intercept('POST', /resend\.com\/emails/, { statusCode: 200, body: { id: 'email_123' } }).as('resendEmail');
}

// Fixture files — ensure these exist in cypress/fixtures
const fixtureFiles = ['sample1.jpg', 'sample2.jpg', 'sample3.jpg'];

describe('Full Order Flow - ClickStagePro', () => {
  it('completes signup → login → upload → checkout → post-order verification', () => {
    const email = randomEmail();
    const password = (Cypress.env('TEST_PASSWORD') as string) || 'P@ssw0rd!';

    // Mocks
    stubSupabaseAuth();
    stubResend();
    stubStripeCheckout();
    stubFileManager([]);

    // Step 1: Visit home page
    cy.visit(BASE_URL);
    cy.contains('ClickStage Pro').should('be.visible');

    // Step 2: Navigate to signup (adapt if you have a button)
    cy.visit(`${BASE_URL}/register`);

    // Step 3: Create Supabase-authenticated user (mocked)
    // Replace selectors with your actual signup form fields
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button', /sign up|create account/i).click({ force: true });

    // Step 4/5: Intercept verification email and simulate confirmation
    // In a real staging env, fetch the verification link from the email and visit it.
    // Here we stub the login state by stubbing /api/auth/me below.
    stubAuthMe({ id: 'user_123', email });

    // Step 6: Login with same user (mocked flow)
    cy.visit(`${BASE_URL}/login`);
    cy.contains(/redirecting to login/i).should('exist');

    // The app polls /api/auth/me on mount; our stub returns an authenticated user
    cy.visit(`${BASE_URL}/account`);
    cy.get(selectors.accountTitle).should('be.visible');

    // Step 7: Upload 2–3 test images in Client Portal (FileManager)
    cy.visit(`${BASE_URL}/client-portal`);
    cy.get(selectors.fileManagerUploadInput).should('exist');
    fixtureFiles.slice(0, 2).forEach((name) => {
      cy.get(selectors.fileManagerUploadInput)
        .selectFile(`cypress/fixtures/${name}`, { force: true });
      cy.wait(['@signUpload', '@r2Put']);
    });
    cy.wait('@listFiles');

    // Verify files appear in the list (stubbed response includes uploaded keys)
    cy.contains('Open').should('exist');

    // Step 8: Select a staging bundle (navigate to pricing/checkout)
    cy.visit(`${BASE_URL}/pricing`);
    cy.contains(/Buy 10 Credits|Credit Packs|Place Staging Order/i).should('exist');

    // The app’s Checkout page creates a payment intent/session — we stubbed to return /payment-success
    cy.visit(`${BASE_URL}/checkout?plan=pack-5`);

    // Step 9: Complete checkout (Stripe test — stubbed)
    cy.wait('@createCheckout');
    cy.visit(`${BASE_URL}/payment-success?session_id=cs_test_123`);

    // Step 10: Confirm payment success redirect (the PaymentSuccess page then redirects to order-completion)
    cy.contains('[data-testid="text-payment-success"]', 'Payment Successful').should('exist');

    // Step 11: Verify order emails — client + admin (mocked Resend)
    // In a real env, verify Resend logs or use an internal endpoint to assert delivery.
    // Here we simply ensure our flow hit the mocked endpoint at least once.
    // cy.wait('@resendEmail'); // Uncomment if your app calls Resend HTTP API

    // Step 12: Log out → Log back in (mocking login via /api/auth/me again)
    cy.visit(`${BASE_URL}/account`);
    cy.get(selectors.accountTitle).should('be.visible');

    // Step 13: Confirm uploaded photos visible in client portal
    cy.visit(`${BASE_URL}/client-portal`);
    cy.get(selectors.fileBtnOpen).should('exist');

    // Step 14: Confirm download options exist for JPG, PNG, ZIP
    cy.get(selectors.fileBtnJpg).first().click({ force: true });
    cy.wait('@fileUrl');
    cy.get(selectors.fileBtnPng).first().click({ force: true });
    cy.wait('@fileUrl');
    cy.get(selectors.fileBtnWebp).first().click({ force: true });
    cy.wait('@fileUrl');

    // Folder-level ZIP (button we added)
    cy.get(selectors.fileBtnZip).click({ force: true });
    cy.wait('@zip');
  });
});
