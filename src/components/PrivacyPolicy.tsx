import { Shield, ArrowLeft, Mail, Globe, Lock, Eye, Database, UserCheck, Bell, Trash2 } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  standalone?: boolean;
}

export function PrivacyPolicy({ onBack, standalone = true }: PrivacyPolicyProps) {
  const effectiveDate = 'February 17, 2026';
  const lastUpdated = 'February 17, 2026';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${standalone ? '' : ''}`}>
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">ProSpaces CRM</span>
            </div>
          </div>
          <a
            href="https://www.prospacescrm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <Globe className="w-4 h-4" />
            www.prospacescrm.com
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Lock className="w-4 h-4" />
            Your Privacy Matters
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: {effectiveDate} &middot; Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Policy Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <Section>
            <p className="text-foreground leading-relaxed">
              ProSpaces CRM ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") 
              operates the website{' '}
              <a href="https://www.prospacescrm.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                www.prospacescrm.com
              </a>{' '}
              and the ProSpaces CRM application (collectively, the "<strong>Service</strong>"). 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our Service. Please read this policy carefully. By accessing 
              or using the Service, you agree to the terms of this Privacy Policy.
            </p>
          </Section>

          {/* 1. Information We Collect */}
          <PolicySection
            number="1"
            title="Information We Collect"
            icon={<Database className="w-5 h-5" />}
          >
            <h4 className="font-semibold text-foreground mt-4 mb-2">1.1 Information You Provide</h4>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
              <li><strong>Profile Information:</strong> Organization name, job title, profile picture, and other details you choose to provide.</li>
              <li><strong>CRM Data:</strong> Contacts, opportunities, tasks, notes, bids, appointments, documents, and other business data you enter into the Service.</li>
              <li><strong>Communications:</strong> Emails and messages you send or receive through integrated email services.</li>
              <li><strong>Payment Information:</strong> If applicable, billing details processed through our third-party payment providers.</li>
            </ul>

            <h4 className="font-semibold text-foreground mt-6 mb-2">1.2 Information Collected Automatically</h4>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li><strong>Usage Data:</strong> Pages viewed, features used, session duration, and interaction patterns.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and screen resolution.</li>
              <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
              <li><strong>Cookies &amp; Similar Technologies:</strong> Session cookies for authentication and preferences.</li>
            </ul>

            <h4 className="font-semibold text-foreground mt-6 mb-2">1.3 Information from Third-Party Services</h4>
            <p className="text-foreground leading-relaxed">
              When you connect third-party services (such as Google Gmail, Google Calendar, 
              or Microsoft Outlook/365), we may receive:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2 mt-2">
              <li><strong>Email Data:</strong> Email messages, metadata (sender, recipient, subject, timestamps), and attachments for display within the Service.</li>
              <li><strong>Calendar Data:</strong> Calendar events, attendees, and scheduling information for synchronization.</li>
              <li><strong>OAuth Tokens:</strong> Encrypted access and refresh tokens to maintain your authorized connection. We do not store your third-party passwords.</li>
            </ul>
          </PolicySection>

          {/* 2. How We Use Your Information */}
          <PolicySection
            number="2"
            title="How We Use Your Information"
            icon={<Eye className="w-5 h-5" />}
          >
            <p className="text-foreground mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Manage your account, authentication, and user preferences.</li>
              <li>Synchronize your emails and calendar events with connected third-party services.</li>
              <li>Enable CRM features including contact management, bidding, task tracking, and reporting.</li>
              <li>Improve and personalize your experience, including AI-powered suggestions.</li>
              <li>Send administrative notifications (e.g., security alerts, service updates).</li>
              <li>Detect, prevent, and address technical issues or security threats.</li>
              <li>Comply with legal obligations and enforce our terms.</li>
            </ul>
          </PolicySection>

          {/* 3. Google API Services */}
          <PolicySection
            number="3"
            title="Google API Services &mdash; Limited Use Disclosure"
            icon={<Lock className="w-5 h-5" />}
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-foreground leading-relaxed">
                ProSpaces CRM's use and transfer to any other app of information received from 
                Google APIs will adhere to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  className="text-blue-600 hover:underline font-medium"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
            <p className="text-foreground leading-relaxed mb-3">Specifically:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>We only request access to the Google API scopes necessary to provide our email and calendar integration features.</li>
              <li>We do not use Google user data for serving advertisements.</li>
              <li>We do not allow humans to read your Google data unless (a) we have your explicit consent, (b) it is necessary for security purposes, (c) it is required to comply with applicable law, or (d) our use is limited to internal operations and the data has been aggregated and anonymized.</li>
              <li>We do not transfer Google user data to third parties except as necessary to provide or improve the Service, as required by law, or as part of a merger, acquisition, or asset sale with prior notice.</li>
            </ul>
          </PolicySection>

          {/* 4. Data Sharing & Disclosure */}
          <PolicySection
            number="4"
            title="Data Sharing &amp; Disclosure"
            icon={<UserCheck className="w-5 h-5" />}
          >
            <p className="text-foreground mb-3">We do not sell your personal information. We may share your data only in these circumstances:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li><strong>Service Providers:</strong> Trusted third parties that help us operate the Service (e.g., Supabase for hosting and database, cloud infrastructure providers). These providers are bound by contractual obligations to keep your data confidential.</li>
              <li><strong>Within Your Organization:</strong> Other users within the same organization account may access shared CRM data based on role-based permissions.</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request.</li>
              <li><strong>Safety &amp; Security:</strong> To protect the rights, property, or safety of ProSpaces CRM, our users, or the public.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with advance notice to you.</li>
            </ul>
          </PolicySection>

          {/* 5. Data Security */}
          <PolicySection
            number="5"
            title="Data Security"
            icon={<Shield className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>Encryption of data in transit (TLS/SSL) and at rest.</li>
              <li>Secure OAuth 2.0 authentication for third-party service connections.</li>
              <li>Role-based access controls and row-level security policies.</li>
              <li>Regular security audits and monitoring.</li>
              <li>Encrypted storage of authentication tokens and credentials.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-3">
              While we strive to protect your data, no method of transmission or storage is 100% secure. 
              We cannot guarantee absolute security.
            </p>
          </PolicySection>

          {/* 6. Data Retention */}
          <PolicySection
            number="6"
            title="Data Retention"
            icon={<Database className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to 
              provide the Service. When you delete your account, we will delete or anonymize your 
              personal data within 30 days, except where we are required to retain it for legal, 
              regulatory, or legitimate business purposes. Third-party OAuth tokens are revoked 
              when you disconnect a service or delete your account.
            </p>
          </PolicySection>

          {/* 7. Your Rights & Choices */}
          <PolicySection
            number="7"
            title="Your Rights &amp; Choices"
            icon={<UserCheck className="w-5 h-5" />}
          >
            <p className="text-foreground mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data.</li>
              <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent is the legal basis.</li>
              <li><strong>Disconnect Services:</strong> Revoke third-party service connections at any time from your account settings.</li>
              <li><strong>Opt-Out:</strong> Opt out of non-essential communications.</li>
            </ul>
            <p className="text-foreground mt-3">
              To exercise any of these rights, please contact us at the address below.
            </p>
          </PolicySection>

          {/* 8. Third-Party Links */}
          <PolicySection
            number="8"
            title="Third-Party Links &amp; Services"
            icon={<Globe className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              The Service may contain links to third-party websites or integrate with third-party 
              services (e.g., Google, Microsoft). We are not responsible for the privacy practices 
              of these third parties. We encourage you to review their privacy policies before 
              providing them with your information.
            </p>
          </PolicySection>

          {/* 9. Children's Privacy */}
          <PolicySection
            number="9"
            title="Children's Privacy"
            icon={<Shield className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              The Service is not directed to individuals under the age of 16. We do not knowingly 
              collect personal information from children. If we become aware that we have collected 
              data from a child under 16, we will take steps to delete it promptly.
            </p>
          </PolicySection>

          {/* 10. International Data Transfers */}
          <PolicySection
            number="10"
            title="International Data Transfers"
            icon={<Globe className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              Your information may be processed and stored in countries other than your own. 
              By using the Service, you consent to the transfer of your information to countries 
              that may have different data protection laws. We take appropriate safeguards to 
              ensure your data is protected in accordance with this Privacy Policy.
            </p>
          </PolicySection>

          {/* 11. Changes to This Policy */}
          <PolicySection
            number="11"
            title="Changes to This Privacy Policy"
            icon={<Bell className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by posting the updated policy on this page and updating the 
              "Last Updated" date. Your continued use of the Service after changes are posted 
              constitutes your acceptance of the updated policy.
            </p>
          </PolicySection>

          {/* 12. Contact Us */}
          <PolicySection
            number="12"
            title="Contact Us"
            icon={<Mail className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy 
              or our data practices, please contact us:
            </p>
            <div className="bg-muted rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-sm text-muted-foreground">Company</span>
                  <p className="text-foreground font-medium">ProSpaces CRM</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-sm text-muted-foreground">Website</span>
                  <p className="text-foreground">
                    <a href="https://www.prospacescrm.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      www.prospacescrm.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="text-foreground">
                    <a href="mailto:privacy@prospacescrm.com" className="text-blue-600 hover:underline">
                      privacy@prospacescrm.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </PolicySection>

          {/* Data Deletion Section */}
          <PolicySection
            number="13"
            title="Data Deletion Requests"
            icon={<Trash2 className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              You may request the deletion of your account and all associated personal data at 
              any time. To submit a data deletion request:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>Email us at{' '}
                <a href="mailto:privacy@prospacescrm.com" className="text-blue-600 hover:underline">
                  privacy@prospacescrm.com
                </a>{' '}
                with the subject line "Data Deletion Request."
              </li>
              <li>Use the "Delete Account" option in your account settings (if available).</li>
              <li>We will process your request within 30 days and confirm deletion via email.</li>
            </ul>
          </PolicySection>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">ProSpaces CRM</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ProSpaces CRM. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="?view=privacy-policy" className="text-xs text-blue-600 hover:underline">
              Privacy Policy
            </a>
            <span className="text-xs text-slate-300">|</span>
            <a href="?view=terms-of-service" className="text-xs text-blue-600 hover:underline">
              Terms of Service
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This privacy policy is effective as of {effectiveDate}.
          </p>
        </footer>
      </main>
    </div>
  );
}

// Reusable section wrapper
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background rounded-xl shadow-sm border border-border p-6 sm:p-8">
      {children}
    </div>
  );
}

// Numbered policy section
function PolicySection({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-xl shadow-sm border border-border p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-foreground">
          {number}. {title}
        </h3>
      </div>
      {children}
    </div>
  );
}