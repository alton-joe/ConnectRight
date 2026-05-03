import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black pt-16 md:pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 md:px-6">

        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors mt-6 mb-6 group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Home
        </Link>

        {/* Card */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8">

        {/* Header */}
        <div className="mb-8 pb-6 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white mb-2">Terms and Conditions</h1>
          <p className="text-white/40 text-xs">Effective Date: May 1, 2026 &nbsp;·&nbsp; Website: ConnectRight &nbsp;·&nbsp; Contact: <a href="mailto:altonjoe670@gmail.com" className="hover:text-white/70 transition-colors">altonjoe670@gmail.com</a></p>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-8 text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ConnectRight, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time, and continued use of the platform after changes means you accept the revised terms.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use ConnectRight. By creating an account, you confirm that you meet this age requirement. If you are under 18, you must have parental or guardian consent to use this platform.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Account Registration</h2>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>You must sign in using a valid Google account.</li>
              <li>You are responsible for choosing a username that is appropriate, not offensive, and does not impersonate another person or entity.</li>
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>You must notify us immediately if you suspect unauthorized use of your account.</li>
              <li>We reserve the right to remove or reclaim any username that violates these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. User Conduct</h2>
            <p className="mb-3">By using ConnectRight, you agree not to:</p>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>Harass, bully, threaten, or intimidate other users</li>
              <li>Send spam, unsolicited messages, or repeated unwanted connection requests</li>
              <li>Impersonate any person or entity</li>
              <li>Share content that is obscene, hateful, discriminatory, or illegal</li>
              <li>Use the platform for any commercial solicitation without prior written permission</li>
              <li>Attempt to gain unauthorized access to any part of the platform or other users' accounts</li>
              <li>Use automated bots or scripts to interact with the platform</li>
              <li>Share personal information of other users without their consent</li>
            </ul>
            <p className="mt-3">Violation of any of the above may result in immediate suspension or permanent ban of your account.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Connection Requests and Messaging</h2>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>You may send connection requests to other users on the platform.</li>
              <li>Other users have the right to accept or decline your request.</li>
              <li>Once connected, both users can exchange real-time messages.</li>
              <li>ConnectRight does not monitor private messages but reserves the right to investigate reports of abuse.</li>
              <li>You are solely responsible for the content of messages you send.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Privacy and Data</h2>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>We collect your Google email address, username, and activity data for the purpose of operating the platform.</li>
              <li>We do not sell your personal data to third parties.</li>
              <li>Your email address is visible only to you on your profile. Other users can see your username and last active status.</li>
              <li>By using ConnectRight, you consent to the collection and use of your data as described in our Privacy Policy.</li>
              <li>We use Supabase as our backend and database provider. Your data is stored securely in accordance with Supabase's data protection policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Intellectual Property</h2>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>All design, branding, and code associated with ConnectRight are the property of the ConnectRight team.</li>
              <li>Users retain ownership of the content they create, including messages and usernames.</li>
              <li>By using the platform, you grant ConnectRight a non-exclusive, royalty-free license to display your username and profile information within the platform for the purpose of operating the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Disclaimer of Warranties</h2>
            <p className="mb-3">ConnectRight is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not guarantee:</p>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>That the platform will be uninterrupted or error-free</li>
              <li>That connections made on the platform will be safe or suitable</li>
              <li>That any user on the platform has verified their identity</li>
            </ul>
            <p className="mt-3">Use the platform at your own discretion and risk.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Limitation of Liability</h2>
            <p className="mb-3">To the fullest extent permitted by law, ConnectRight and its team shall not be liable for:</p>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>Any indirect, incidental, or consequential damages arising from your use of the platform</li>
              <li>Any loss of data or unauthorized access to your account</li>
              <li>Any harm resulting from interactions with other users on the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Termination</h2>
            <p className="mb-2">We reserve the right to suspend or terminate your account at any time, with or without notice, if we determine that you have violated these Terms and Conditions or engaged in behavior that is harmful to other users or the platform.</p>
            <p>You may also delete your account at any time by contacting us at <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Third-Party Services</h2>
            <p className="mb-3">ConnectRight uses the following third-party services:</p>
            <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
              <li>Google OAuth — for authentication</li>
              <li>Supabase — for database and real-time messaging</li>
              <li>Vercel — for hosting</li>
            </ul>
            <p className="mt-3">Your use of these services is also subject to their respective terms and privacy policies.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. Governing Law</h2>
            <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts located in India.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">13. Contact Us</h2>
            <p className="mb-2">If you have any questions, concerns, or reports regarding these Terms and Conditions, please contact us at:</p>
            <p>Email: <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a></p>
            <p>Website: ConnectRight</p>
          </section>

          <div className="pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">By using ConnectRight, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.</p>
          </div>

        </div>
        </div>{/* end card */}
      </div>
    </div>
  )
}
