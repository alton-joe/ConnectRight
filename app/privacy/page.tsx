import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">

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
            <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-white/40 text-xs">Effective Date: May 1, 2026 &nbsp;·&nbsp; Website: ConnectRight &nbsp;·&nbsp; Contact: <a href="mailto:altonjoe670@gmail.com" className="hover:text-white/70 transition-colors">altonjoe670@gmail.com</a></p>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-8 text-white/70 text-sm leading-relaxed">

            <section>
              <h2 className="text-white font-semibold text-base mb-3">1. Introduction</h2>
              <p className="mb-2">Welcome to ConnectRight. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, who we share it with, and what rights you have over your data.</p>
              <p>By using ConnectRight, you agree to the collection and use of information in accordance with this policy.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">2. Who We Are</h2>
              <p className="mb-2">ConnectRight is a real-time people connection and chat platform. We allow users to discover other users, send connection requests, and communicate through real-time messaging once connected.</p>
              <p>Contact us at: <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a></p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">3. Information We Collect</h2>

              <h3 className="text-white/80 font-medium mb-2">3.1 Information You Provide Directly</h3>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30 mb-5">
                <li><span className="text-white/90">Username</span> — chosen by you during onboarding</li>
                <li><span className="text-white/90">Google Email Address</span> — collected when you sign in via Google OAuth</li>
              </ul>

              <h3 className="text-white/80 font-medium mb-2">3.2 Information Collected Automatically</h3>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30 mb-5">
                <li><span className="text-white/90">Last Active Status</span> — timestamp of your most recent activity on the platform</li>
                <li><span className="text-white/90">Account Creation Date</span> — recorded when your profile is first created</li>
                <li><span className="text-white/90">Connection History</span> — records of connection requests sent, received, accepted, and declined</li>
                <li><span className="text-white/90">Messages</span> — content of real-time messages exchanged between connected users</li>
              </ul>

              <h3 className="text-white/80 font-medium mb-2">3.3 Information We Do NOT Collect</h3>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li>We do not collect your phone number</li>
                <li>We do not collect your physical address</li>
                <li>We do not collect payment information</li>
                <li>We do not collect your location data</li>
                <li>We do not track you across other websites</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">4. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect for the following purposes:</p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Purpose</th>
                      <th className="text-left px-4 py-3 font-medium">Data Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['To create and manage your account', 'Email, Username'],
                      ['To display your profile to connected users', 'Username, Last Active'],
                      ['To enable connection requests', 'Username, User ID'],
                      ['To enable real-time messaging', 'Messages, Connection ID'],
                      ['To show your activity status', 'Last Active Timestamp'],
                      ['To improve the platform', 'Aggregated usage data'],
                      ['To respond to support requests', 'Email, Username'],
                    ].map(([purpose, data]) => (
                      <tr key={purpose} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/70">{purpose}</td>
                        <td className="px-4 py-3 text-white/50">{data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4">We do not use your data for advertising or sell it to any third party.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">5. How We Store Your Data</h2>
              <p className="mb-3">Your data is stored securely using Supabase, a trusted backend-as-a-service platform. Supabase uses industry-standard encryption for data at rest and in transit.</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li>All database tables have Row Level Security (RLS) enabled</li>
                <li>This means each user can only access data they are authorized to see</li>
                <li>Your private messages are only accessible to you and the user you are connected with</li>
                <li>Your email address is never visible to other users on the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">6. How Long We Keep Your Data</h2>
              <div className="rounded-xl overflow-hidden border border-white/10 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Data Type</th>
                      <th className="text-left px-4 py-3 font-medium">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Profile (username, email)', 'Until you delete your account'],
                      ['Messages', 'Until you delete your account'],
                      ['Connection records', 'Until you delete your account'],
                      ['Last active status', 'Continuously updated, deleted with account'],
                    ].map(([type, period]) => (
                      <tr key={type} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/70">{type}</td>
                        <td className="px-4 py-3 text-white/50">{period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>If you request account deletion, all your data will be permanently removed from our database within 30 days.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">7. Who We Share Your Data With</h2>
              <p className="mb-4">We do not sell, trade, or rent your personal data to anyone. We only share data with the following third-party services that are essential to operate ConnectRight:</p>

              <div className="flex flex-col gap-4">
                {[
                  {
                    title: '7.1 Google (OAuth Provider)',
                    points: [
                      'Used for authentication only',
                      'We receive your name and email from Google when you sign in',
                      "Google's privacy policy applies: policies.google.com/privacy",
                    ],
                  },
                  {
                    title: '7.2 Supabase (Database and Realtime)',
                    points: [
                      'Used to store all user data and power real-time messaging',
                      "Supabase's privacy policy applies: supabase.com/privacy",
                    ],
                  },
                  {
                    title: '7.3 Vercel (Hosting)',
                    points: [
                      'Used to host and serve the ConnectRight web application',
                      "Vercel's privacy policy applies: vercel.com/legal/privacy-policy",
                    ],
                  },
                ].map(({ title, points }) => (
                  <div key={title} className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-4">
                    <p className="text-white/80 font-medium mb-2">{title}</p>
                    <ul className="flex flex-col gap-1.5 pl-4 list-disc list-outside marker:text-white/30">
                      {points.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4">We do not share your data with advertisers, data brokers, or any other third parties beyond the above.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">8. What Other Users Can See</h2>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Information</th>
                      <th className="text-left px-4 py-3 font-medium">Visible To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Username', 'All users on the platform'],
                      ['Email Address', 'Only you (on your own profile)'],
                      ['Last Active Status', 'Users who view your profile'],
                      ['Messages', 'Only the user you are chatting with'],
                      ['Connection requests sent/received', 'Only you'],
                    ].map(([info, visible]) => (
                      <tr key={info} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/70">{info}</td>
                        <td className="px-4 py-3 text-white/50">{visible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">9. Cookies and Local Storage</h2>
              <p className="mb-3">ConnectRight uses minimal browser storage:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li><span className="text-white/90">Session storage</span> — to maintain your login session via Supabase Auth</li>
                <li><span className="text-white/90">Local storage</span> — to remember if you have seen the welcome popup so it does not show again</li>
                <li>We do not use tracking cookies or advertising cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">10. Your Rights</h2>
              <p className="mb-3">Depending on where you are located, you may have the following rights regarding your personal data:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30 mb-3">
                <li><span className="text-white/90">Right to Access</span> — You can request a copy of the data we hold about you</li>
                <li><span className="text-white/90">Right to Correction</span> — You can update your username at any time</li>
                <li><span className="text-white/90">Right to Deletion</span> — You can request full deletion of your account and all associated data</li>
                <li><span className="text-white/90">Right to Object</span> — You can object to how we process your data</li>
                <li><span className="text-white/90">Right to Portability</span> — You can request your data in a portable format</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a>. We will respond to all requests within 30 days.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">11. Children's Privacy</h2>
              <p className="mb-2">ConnectRight is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it immediately.</p>
              <p>If you believe a child under 13 is using the platform, please contact us at <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">12. Data Security</h2>
              <p className="mb-3">We take data security seriously. The following measures are in place to protect your information:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30 mb-3">
                <li>HTTPS encryption for all data in transit</li>
                <li>Supabase Row Level Security (RLS) to prevent unauthorized data access</li>
                <li>Google OAuth for secure authentication — we never store your Google password</li>
                <li>Regular security reviews of our database policies</li>
              </ul>
              <p>However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">13. Third-Party Links</h2>
              <p>ConnectRight may in the future contain links to third-party websites or services. This Privacy Policy does not apply to those external sites. We encourage you to read the privacy policies of any third-party sites you visit.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">14. Changes to This Privacy Policy</h2>
              <p className="mb-3">We may update this Privacy Policy from time to time. When we do, we will:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li>Update the Effective Date at the top of this page</li>
                <li>Notify users through the platform if the changes are significant</li>
              </ul>
              <p className="mt-3">Your continued use of ConnectRight after any changes means you accept the updated Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">15. Governing Law</h2>
              <p>This Privacy Policy is governed by the laws of India. Any disputes relating to this policy shall be subject to the exclusive jurisdiction of the courts in India.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">16. Contact Us</h2>
              <p className="mb-2">If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out to us:</p>
              <p>Email: <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a></p>
              <p>Website: ConnectRight</p>
              <p className="mt-2">We are committed to resolving any privacy concerns promptly and transparently.</p>
            </section>

            <div className="pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs">By using ConnectRight, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your information as described above.</p>
            </div>

          </div>
        </div>{/* end card */}
      </div>
    </div>
  )
}
