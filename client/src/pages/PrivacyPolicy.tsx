import { useMemo } from "react";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  const effectiveDate = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }, []);

  return (
    <>
      <Helmet>
        <title>ClickStage Pro — Privacy Policy</title>
        <meta name="description" content="Privacy Policy for ClickStage Pro." />
      </Helmet>
      <main className="container mx-auto max-w-4xl px-4 py-10" style={{ lineHeight: 1.6 }}>
        <h1 className="text-4xl font-bold text-center mb-6 underline">ClickStage Pro — Privacy Policy</h1>
        <p className="text-lg mb-8"><strong>Effective Date:</strong> {effectiveDate}</p>

        {/* ===== POLICY TEXT BELOW THIS LINE ===== */}
        <div className="prose prose-lg max-w-none space-y-6">
          <div>
            <p><strong>Entity:</strong> Warfield & Company, Ltd Co. DBA ClickStage Pro ("ClickStage Pro," "we," "us")</p>
            <p><strong>Website:</strong> https://www.clickstagepro.com</p>
            <p><strong>Address:</strong> 403 Woods Lake Rd Suite 100, Greenville, SC 29607</p>
            <p><strong>Contact:</strong> legal@clickstagepro.com</p>
            <p><strong>Governing Law:</strong> South Carolina, USA</p>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-4">1) Scope</h2>
            <p>This Privacy Policy explains how we collect, use, share, and protect personal information when you visit our website, create an account, upload photos/content, or purchase/receive our virtual staging and related creative/AI‑assisted services (the "Services").</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2) Information We Collect</h2>
            <p><strong>You provide:</strong> name, company, role, email, phone, billing details, property addresses/identifiers, photos/uploads, staging instructions, support messages.</p>
            <p><strong>Automatically:</strong> device/browser type, IP address, identifiers, pages viewed, time stamps, referral URLs, cookies and similar technologies, diagnostic logs.</p>
            <p><strong>From service providers:</strong> payment processors, analytics, cloud/AI processors, anti‑fraud/security tools.</p>
            <p><strong>Sensitive data:</strong> we do not seek sensitive data (e.g., health or biometric data). Do not upload it.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3) How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, host, edit, and deliver the Services you request.</li>
              <li>Authenticate accounts; process payments; communicate about orders, security, and service updates.</li>
              <li>Personalize features; measure performance; debug; prevent fraud/abuse; improve our models and workflows.</li>
              <li>Comply with law and enforce our agreements.</li>
            </ul>
            <p><strong>AI notice:</strong> Some deliverables are created/enhanced with AI. We may use de‑identified data to improve quality and safety. See Your Choices for opt‑outs.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4) Legal Bases (EU/UK GDPR)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contract (to deliver the Services).</li>
              <li>Legitimate interests (security, product improvement, analytics, limited marketing).</li>
              <li>Consent (where required, e.g., non‑essential cookies).</li>
              <li>Legal obligation (tax, accounting, compliance).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5) Sharing</h2>
            <p>We share personal information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service providers</strong> (hosting/storage, AI processors, analytics, payments, customer support) under contracts restricting use to our instructions.</li>
              <li><strong>Business transfers</strong> (merger, acquisition, financing).</li>
              <li><strong>Legal and safety</strong> (to comply with law, respond to lawful requests, or protect rights).</li>
            </ul>
            <p>We do not sell personal information for money. We may "share" identifiers for cross‑context advertising where applicable; see Section 9.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6) Cookies & Tracking</h2>
            <p>We use cookies, pixels, and local storage to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Keep you signed in, remember preferences, and secure the site.</li>
              <li>Measure traffic and improve features.</li>
              <li>Show relevant marketing (where permitted).</li>
            </ul>
            <p><strong>Manage cookies:</strong> Use your browser settings and our cookie banner [Accept All] [Reject Non‑Essential] [Cookie Settings]. Non‑essential cookies load only after consent, where required by law.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7) Data Retention</h2>
            <p>We keep personal information only as long as needed for the purposes above, then delete or de‑identify it per our retention schedule and applicable law. Backup copies are purged on rolling schedules.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8) Security</h2>
            <p>We use administrative, technical, and physical safeguards commensurate with risk. No method of transmission or storage is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9) Your Privacy Rights</h2>
            <p><strong>US (incl. CA/VA/CO/CT/UT/etc.):</strong> request access, correction, deletion, portability; opt out of targeted advertising/cross‑context behavioral advertising and certain profiling.</p>
            <p><strong>EU/UK:</strong> access, rectify, erase, restrict, portability, object, withdraw consent.</p>
            <p>Submit requests to legal@clickstagepro.com. We will verify your identity. Authorized agents may act where permitted. If we deny a request, you may appeal by replying "Appeal" to our decision; we will respond within required timelines.</p>
            <p><strong>Do Not Sell/Share (US States):</strong> Use our cookie banner or email legal@clickstagepro.com with subject "Do Not Sell/Share."</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10) International Transfers</h2>
            <p>We process data in the U.S. and may transfer to other countries using lawful tools (e.g., Standard Contractual Clauses/UK Addendum).</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11) Children</h2>
            <p>The Services are not directed to children under 13, and we do not knowingly collect their data.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12) Your Choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Marketing emails:</strong> use the unsubscribe link.</li>
              <li><strong>Cookies/ads:</strong> use the cookie banner and browser controls.</li>
              <li><strong>Portfolio/training opt‑out:</strong> email legal@clickstagepro.com with subject "Staging Portfolio Opt‑Out."</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13) Changes</h2>
            <p>We will post updates here and revise the Effective Date. Material changes may be announced on‑site or by email.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14) State‑Specific Notices (Summary)</h2>
            <p><strong>California (CCPA/CPRA):</strong> rights to know, delete, correct, opt out of "selling"/"sharing," and limit sensitive PI (not collected in ordinary course). We are a "service provider" to B2B clients when processing on their behalf.</p>
            <p><strong>Colorado/Connecticut/Virginia/Utah:</strong> similar rights; opt‑out for targeted advertising/profiling.</p>
            <p><strong>To exercise:</strong> use the cookie banner or email legal@clickstagepro.com.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15) Data Processing Addendum (B2B)</h2>
            <p>When we process personal data on behalf of a business client, our Data Processing Addendum (DPA) applies and is incorporated by reference. For a signed copy or list of sub‑processors, contact legal@clickstagepro.com.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16) Cookie Policy (Quick Reference)</h2>
            <p><strong>Types:</strong> essential, analytics, performance, advertising.</p>
            <p><strong>Controls:</strong> [Accept All] [Reject Non‑Essential] [Cookie Settings]; link also in the footer.</p>
            <p><strong>Banner Text (example):</strong></p>
            <p className="italic">We use cookies and similar technologies to run this site, improve your experience, and for analytics/advertising. By clicking "Accept All," you agree to our use of cookies. You can manage choices at any time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">17) Contact</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
              <p>Warfield & Company, Ltd Co. DBA ClickStage Pro</p>
              <p>403 Woods Lake Rd Suite 100, Greenville, SC 29607</p>
              <p>legal@clickstagepro.com</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}