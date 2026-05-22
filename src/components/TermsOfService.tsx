import { FileText, ArrowLeft, Globe, Shield, AlertTriangle, Scale, Users, CreditCard, Ban, RefreshCw, Mail, Lock } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
  standalone?: boolean;
}

export function TermsOfService({ onBack, standalone = true }: TermsOfServiceProps) {
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
                <FileText className="w-4 h-4 text-white" />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
            <Scale className="w-4 h-4" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">
            Effective Date: {effectiveDate} &middot; Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <Section>
            <p className="text-foreground leading-relaxed">
              Welcome to ProSpaces CRM. These Terms of Service ("<strong>Terms</strong>") govern 
              your access to and use of the website{' '}
              <a href="https://www.prospacescrm.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                www.prospacescrm.com
              </a>{' '}
              and the ProSpaces CRM application (collectively, the "<strong>Service</strong>"), 
              operated by ProSpaces CRM ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>"). 
              By creating an account or using the Service, you agree to be bound by these Terms. 
              If you do not agree, do not use the Service.
            </p>
          </Section>

          {/* 1. Eligibility */}
          <TermsSection
            number="1"
            title="Eligibility"
            icon={<Users className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              You must be at least 16 years of age to use the Service. By using the Service, 
              you represent and warrant that you meet this age requirement and have the legal 
              capacity to enter into these Terms. If you are using the Service on behalf of an 
              organization, you represent that you have the authority to bind that organization 
              to these Terms.
            </p>
          </TermsSection>

          {/* 2. Account Registration */}
          <TermsSection
            number="2"
            title="Account Registration &amp; Security"
            icon={<Lock className="w-5 h-5" />}
          >
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials, including your password.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms or are inactive for an extended period.</li>
            </ul>
          </TermsSection>

          {/* 3. Use of the Service */}
          <TermsSection
            number="3"
            title="Permitted Use"
            icon={<Shield className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              We grant you a limited, non-exclusive, non-transferable, revocable license to 
              access and use the Service for your internal business purposes, subject to these 
              Terms. You agree to use the Service only for lawful purposes and in accordance 
              with these Terms.
            </p>
            <h4 className="font-semibold text-foreground mt-5 mb-2">You agree NOT to:</h4>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>Use the Service for any illegal, fraudulent, or unauthorized purpose.</li>
              <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service or its infrastructure.</li>
              <li>Reverse-engineer, decompile, disassemble, or attempt to derive the source code of the Service.</li>
              <li>Transmit viruses, malware, or any other harmful code through the Service.</li>
              <li>Scrape, harvest, or collect data from the Service without our prior written consent.</li>
              <li>Resell, sublicense, or redistribute access to the Service without authorization.</li>
              <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with a person or entity.</li>
              <li>Use the Service to send unsolicited commercial messages (spam) in violation of applicable laws.</li>
            </ul>
          </TermsSection>

          {/* 4. Your Data */}
          <TermsSection
            number="4"
            title="Your Data &amp; Content"
            icon={<FileText className="w-5 h-5" />}
          >
            <h4 className="font-semibold text-foreground mb-2">4.1 Ownership</h4>
            <p className="text-foreground leading-relaxed mb-4">
              You retain all rights to the data and content you submit, upload, or store through 
              the Service ("<strong>Your Data</strong>"). We do not claim ownership of Your Data.
            </p>

            <h4 className="font-semibold text-foreground mb-2">4.2 License to Us</h4>
            <p className="text-foreground leading-relaxed mb-4">
              By using the Service, you grant us a limited, non-exclusive license to access, 
              process, and display Your Data solely as necessary to provide, maintain, and 
              improve the Service. This license terminates when you delete Your Data or your 
              account.
            </p>

            <h4 className="font-semibold text-foreground mb-2">4.3 Responsibility</h4>
            <p className="text-foreground leading-relaxed">
              You are solely responsible for the accuracy, quality, and legality of Your Data 
              and the means by which you acquired it. You must ensure that Your Data does not 
              violate any applicable law or infringe on any third party's rights.
            </p>
          </TermsSection>

          {/* 5. Third-Party Integrations */}
          <TermsSection
            number="5"
            title="Third-Party Integrations"
            icon={<Globe className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              The Service may integrate with third-party services, including but not limited to 
              Google (Gmail, Google Calendar), Microsoft (Outlook, Microsoft 365), and other 
              providers. When you connect a third-party service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground ml-2">
              <li>You authorize us to access and synchronize data from those services on your behalf.</li>
              <li>Your use of third-party services is subject to their respective terms and privacy policies.</li>
              <li>We are not responsible for the availability, accuracy, or practices of third-party services.</li>
              <li>You may disconnect third-party services at any time through your account settings.</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-foreground leading-relaxed text-sm">
                <strong>Google API Compliance:</strong> Our use of information received from Google 
                APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  className="text-blue-600 hover:underline font-medium"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. See our{' '}
                <a 
                  href="?view=privacy-policy" 
                  className="text-blue-600 hover:underline font-medium"
                >
                  Privacy Policy
                </a>{' '}
                for details.
              </p>
            </div>
          </TermsSection>

          {/* 6. Subscription & Payment */}
          <TermsSection
            number="6"
            title="Subscription &amp; Payment"
            icon={<CreditCard className="w-5 h-5" />}
          >
            <h4 className="font-semibold text-foreground mb-2">6.1 Plans</h4>
            <p className="text-foreground leading-relaxed mb-4">
              The Service may be offered under free or paid subscription plans. Features and 
              usage limits vary by plan. We reserve the right to modify plan features and 
              pricing with reasonable notice.
            </p>

            <h4 className="font-semibold text-foreground mb-2">6.2 Billing</h4>
            <p className="text-foreground leading-relaxed mb-4">
              If you subscribe to a paid plan, you agree to pay all applicable fees. Fees are 
              billed in advance on a recurring basis (monthly or annually, depending on your 
              selected plan). All fees are non-refundable except as expressly stated in these 
              Terms or required by law.
            </p>

            <h4 className="font-semibold text-foreground mb-2">6.3 Cancellation</h4>
            <p className="text-foreground leading-relaxed">
              You may cancel your subscription at any time. Cancellation takes effect at the 
              end of the current billing period. You will continue to have access to paid 
              features until the end of the period for which you have already paid.
            </p>
          </TermsSection>

          {/* 7. Intellectual Property */}
          <TermsSection
            number="7"
            title="Intellectual Property"
            icon={<Shield className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              The Service, including its design, features, code, documentation, logos, and 
              trademarks, is owned by ProSpaces CRM and is protected by copyright, trademark, 
              and other intellectual property laws. These Terms do not grant you any rights to 
              our intellectual property except as expressly stated.
            </p>
            <p className="text-foreground leading-relaxed">
              "ProSpaces CRM," the ProSpaces logo, and related marks are trademarks of 
              ProSpaces CRM. You may not use these marks without our prior written permission.
            </p>
          </TermsSection>

          {/* 8. Privacy */}
          <TermsSection
            number="8"
            title="Privacy"
            icon={<Lock className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              Your privacy is important to us. Our collection, use, and disclosure of your 
              information is governed by our{' '}
              <a 
                href="?view=privacy-policy" 
                className="text-blue-600 hover:underline font-medium"
              >
                Privacy Policy
              </a>
              , which is incorporated into these Terms by reference. By using the Service, 
              you consent to the practices described in the Privacy Policy.
            </p>
          </TermsSection>

          {/* 9. Disclaimers */}
          <TermsSection
            number="9"
            title="Disclaimers"
            icon={<AlertTriangle className="w-5 h-5" />}
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-foreground leading-relaxed text-sm">
                THE SERVICE IS PROVIDED "<strong>AS IS</strong>" AND "<strong>AS AVAILABLE</strong>" 
                WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT 
                LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                TITLE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-foreground leading-relaxed text-sm mt-3">
                WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, 
                THAT DEFECTS WILL BE CORRECTED, OR THAT THE SERVICE IS FREE OF VIRUSES OR OTHER 
                HARMFUL COMPONENTS.
              </p>
            </div>
            <p className="text-foreground leading-relaxed mt-3">
              Some jurisdictions do not allow the exclusion of certain warranties, so some of 
              the above exclusions may not apply to you. In such cases, the exclusions will 
              apply to the fullest extent permitted by applicable law.
            </p>
          </TermsSection>

          {/* 10. Limitation of Liability */}
          <TermsSection
            number="10"
            title="Limitation of Liability"
            icon={<Scale className="w-5 h-5" />}
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
              <p className="text-foreground leading-relaxed text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROSPACES CRM AND ITS OFFICERS, 
                DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
                PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM OR 
                RELATED TO YOUR USE OF THE SERVICE.
              </p>
            </div>
            <p className="text-foreground leading-relaxed">
              Our total aggregate liability for all claims arising from or related to the 
              Service shall not exceed the greater of (a) the total fees paid by you to us 
              in the twelve (12) months preceding the event giving rise to the liability, or 
              (b) one hundred U.S. dollars ($100).
            </p>
          </TermsSection>

          {/* 11. Indemnification */}
          <TermsSection
            number="11"
            title="Indemnification"
            icon={<Shield className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless ProSpaces CRM and its officers, 
              directors, employees, and agents from and against any and all claims, liabilities, 
              damages, losses, costs, and expenses (including reasonable attorneys' fees) arising 
              from or related to: (a) your use of the Service; (b) your violation of these Terms; 
              (c) your violation of any third-party rights; or (d) Your Data.
            </p>
          </TermsSection>

          {/* 12. Termination */}
          <TermsSection
            number="12"
            title="Termination"
            icon={<Ban className="w-5 h-5" />}
          >
            <h4 className="font-semibold text-foreground mb-2">12.1 By You</h4>
            <p className="text-foreground leading-relaxed mb-4">
              You may terminate your account at any time by contacting us or using the account 
              deletion option in your settings (if available).
            </p>

            <h4 className="font-semibold text-foreground mb-2">12.2 By Us</h4>
            <p className="text-foreground leading-relaxed mb-4">
              We may suspend or terminate your access to the Service at any time, with or 
              without cause, and with or without notice, including if we reasonably believe 
              you have violated these Terms.
            </p>

            <h4 className="font-semibold text-foreground mb-2">12.3 Effect of Termination</h4>
            <p className="text-foreground leading-relaxed">
              Upon termination, your right to use the Service ceases immediately. We may 
              delete Your Data within 30 days of termination unless required by law to retain 
              it. Sections that by their nature should survive termination (including Sections 
              on Disclaimers, Limitation of Liability, Indemnification, and Governing Law) 
              will continue to apply.
            </p>
          </TermsSection>

          {/* 13. Modifications */}
          <TermsSection
            number="13"
            title="Modifications to Terms"
            icon={<RefreshCw className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of 
              material changes by posting the updated Terms on this page and updating the 
              "Last Updated" date. We may also notify you by email or through the Service. 
              Your continued use of the Service after changes are posted constitutes your 
              acceptance of the updated Terms. If you do not agree with the revised Terms, 
              you must stop using the Service.
            </p>
          </TermsSection>

          {/* 14. Governing Law */}
          <TermsSection
            number="14"
            title="Governing Law &amp; Disputes"
            icon={<Scale className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-3">
              These Terms shall be governed by and construed in accordance with the laws of 
              the United States, without regard to conflict of law principles. Any disputes 
              arising from or relating to these Terms or the Service shall be resolved through 
              binding arbitration in accordance with the rules of the American Arbitration 
              Association, except that either party may seek injunctive or equitable relief 
              in a court of competent jurisdiction.
            </p>
            <p className="text-foreground leading-relaxed">
              You agree that any dispute resolution proceedings will be conducted on an 
              individual basis and not as part of a class, consolidated, or representative action.
            </p>
          </TermsSection>

          {/* 15. Miscellaneous */}
          <TermsSection
            number="15"
            title="General Provisions"
            icon={<FileText className="w-5 h-5" />}
          >
            <ul className="list-disc list-inside space-y-3 text-foreground ml-2">
              <li><strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and ProSpaces CRM regarding the Service and supersede all prior agreements.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any provision of these Terms shall not be deemed a waiver of that provision or any other provision.</li>
              <li><strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent. We may assign our rights without restriction.</li>
              <li><strong>Force Majeure:</strong> We shall not be liable for any failure or delay in performance due to causes beyond our reasonable control, including natural disasters, war, pandemic, or internet disruptions.</li>
              <li><strong>Notices:</strong> We may send you notices via email, in-app notifications, or by posting updates on our website.</li>
            </ul>
          </TermsSection>

          {/* 16. Contact */}
          <TermsSection
            number="16"
            title="Contact Us"
            icon={<Mail className="w-5 h-5" />}
          >
            <p className="text-foreground leading-relaxed mb-4">
              If you have any questions or concerns about these Terms of Service, please 
              contact us:
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
                    <a href="mailto:legal@prospacescrm.com" className="text-blue-600 hover:underline">
                      legal@prospacescrm.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </TermsSection>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <FileText className="w-3 h-3 text-white" />
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
            These terms are effective as of {effectiveDate}.
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

// Numbered terms section
function TermsSection({
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
        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
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
