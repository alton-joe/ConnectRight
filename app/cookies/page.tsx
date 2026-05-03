import Link from 'next/link'

function DetailTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 mt-3">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/5">
          {rows.map(([label, value]) => (
            <tr key={label} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 text-white/50 w-1/3">{label}</td>
              <td className="px-4 py-2.5 text-white/80">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiesPage() {
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
            <h1 className="text-2xl font-bold text-white mb-2">Cookie Policy</h1>
            <p className="text-white/40 text-xs">Effective Date: May 1, 2026 &nbsp;·&nbsp; Website: ConnectRight &nbsp;·&nbsp; Contact: <a href="mailto:altonjoe670@gmail.com" className="hover:text-white/70 transition-colors">altonjoe670@gmail.com</a></p>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-8 text-white/70 text-sm leading-relaxed">

            <section>
              <h2 className="text-white font-semibold text-base mb-3">1. Introduction</h2>
              <p className="mb-2">This Cookie Policy explains what cookies are, what types of cookies ConnectRight uses, why we use them, and how you can control them.</p>
              <p>By using ConnectRight, you agree to the use of cookies and similar technologies as described in this policy. This Cookie Policy should be read alongside our Privacy Policy and Terms and Conditions.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">2. What Are Cookies?</h2>
              <p className="mb-4">Cookies are small text files that are stored on your device (computer, tablet, or phone) when you visit a website. They help websites remember information about your visit, such as your login session or preferences, so you do not have to re-enter them every time you return.</p>
              <p className="mb-4">There are different types of storage technologies used by websites:</p>
              <div className="rounded-xl overflow-hidden border border-white/10 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">What It Is</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Cookies', 'Small files stored in your browser'],
                      ['Local Storage', 'Data stored in your browser that persists after the session ends'],
                      ['Session Storage', 'Data stored only for the duration of your browser session'],
                    ].map(([type, desc]) => (
                      <tr key={type} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/90 font-medium w-1/3">{type}</td>
                        <td className="px-4 py-3 text-white/60">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>ConnectRight uses Local Storage and Session Storage rather than traditional cookies, but the principles are the same and this policy covers all of them.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">3. What We Do NOT Use</h2>
              <p className="mb-3">ConnectRight is built with user privacy in mind. We want to be transparent about what we do not do:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li>We do not use advertising cookies</li>
                <li>We do not use tracking cookies</li>
                <li>We do not use third-party analytics cookies (such as Google Analytics)</li>
                <li>We do not track you across other websites</li>
                <li>We do not build advertising profiles from your data</li>
                <li>We do not share cookie data with advertisers or data brokers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">4. What Storage We Use and Why</h2>
              <p className="mb-5">ConnectRight uses only the minimum storage necessary to operate the platform. Here is a full breakdown:</p>

              <div className="flex flex-col gap-5">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <p className="text-white/90 font-medium mb-1">4.1 Authentication Session (Supabase Auth)</p>
                  <DetailTable rows={[
                    ['Type', 'Session Storage / Local Storage'],
                    ['Set by', 'Supabase (our backend provider)'],
                    ['Purpose', 'To keep you logged in while using ConnectRight'],
                    ['What it stores', 'Your authentication token (not your password)'],
                    ['Duration', 'Until you log out or the session expires'],
                    ['Can you disable it?', 'No — this is essential for the platform to function'],
                  ]} />
                  <p className="mt-3 text-white/60">When you sign in with Google, Supabase stores a secure session token in your browser so you do not have to log in again every time you visit the site. Without this, the login system cannot work.</p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <p className="text-white/90 font-medium mb-1">4.2 Welcome Popup Preference</p>
                  <DetailTable rows={[
                    ['Type', 'Local Storage'],
                    ['Set by', 'ConnectRight'],
                    ['Purpose', 'To remember that you have already seen the welcome popup'],
                    ['What it stores', 'A simple true/false flag'],
                    ['Duration', 'Permanent (until you clear your browser data)'],
                    ['Can you disable it?', 'Yes — clearing local storage will reset this'],
                  ]} />
                  <p className="mt-3 text-white/60">When you first join ConnectRight, a welcome popup appears explaining what the platform is. Once you close or skip it, we store a small flag in your browser so the popup does not appear again on your next visit.</p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                  <p className="text-white/90 font-medium mb-1">4.3 Google OAuth (Third-Party)</p>
                  <DetailTable rows={[
                    ['Type', 'Managed by Google'],
                    ['Set by', 'Google during the sign-in process'],
                    ['Purpose', 'To authenticate you securely via your Google account'],
                    ['What it stores', 'Google session tokens during the OAuth flow'],
                    ['Duration', 'Managed by Google'],
                    ['Can you disable it?', 'Only by not using Google sign-in'],
                  ]} />
                  <p className="mt-3 text-white/60">When you click "Continue with Google", the authentication process is handled by Google. Google may set its own cookies or storage during this process. This is outside of ConnectRight's control. Please refer to Google's Cookie Policy for more information: <span className="text-white/50">policies.google.com/technologies/cookies</span></p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">5. Summary Table</h2>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Purpose</th>
                      <th className="text-left px-4 py-3 font-medium">Essential</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Supabase Auth Token', 'Local / Session Storage', 'Keeps you logged in', 'Yes'],
                      ['Welcome Popup Flag', 'Local Storage', 'Hides popup after first visit', 'No'],
                      ['Google OAuth Token', 'Managed by Google', 'Google sign-in flow', 'Yes (for login)'],
                    ].map(([name, type, purpose, essential]) => (
                      <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/80 font-medium">{name}</td>
                        <td className="px-4 py-3 text-white/50">{type}</td>
                        <td className="px-4 py-3 text-white/50">{purpose}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${essential.startsWith('Yes') ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-white/40'}`}>
                            {essential}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">6. How to Control or Delete Storage</h2>
              <p className="mb-5">You have full control over your browser's local storage and cookies. Here is how to clear them in common browsers:</p>
              <div className="flex flex-col gap-4">
                {[
                  {
                    browser: 'Google Chrome',
                    steps: ['Click the three dots (top right) → Settings', 'Go to Privacy and Security → Clear browsing data', 'Select Cookies and other site data and Cached images and files', 'Click Clear data'],
                  },
                  {
                    browser: 'Mozilla Firefox',
                    steps: ['Click the three lines (top right) → Settings', 'Go to Privacy and Security', 'Under Cookies and Site Data, click Clear Data'],
                  },
                  {
                    browser: 'Safari',
                    steps: ['Go to Safari → Preferences → Privacy', 'Click Manage Website Data → Remove All'],
                  },
                  {
                    browser: 'Microsoft Edge',
                    steps: ['Click the three dots (top right) → Settings', 'Go to Privacy, Search, and Services', 'Under Clear browsing data, click Choose what to clear', 'Select Cookies and other site data → Clear now'],
                  },
                ].map(({ browser, steps }) => (
                  <div key={browser} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4">
                    <p className="text-white/90 font-medium mb-2">{browser}</p>
                    <ol className="flex flex-col gap-1.5 pl-4 list-decimal list-outside marker:text-white/30">
                      {steps.map((s) => <li key={s}>{s}</li>)}
                    </ol>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-white/50 text-xs bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                Note: Clearing your browser storage will log you out of ConnectRight and reset your welcome popup preference. You will need to sign in again on your next visit.
              </p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-4">7. Essential vs Non-Essential Storage</h2>
              <div className="rounded-xl overflow-hidden border border-white/10 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3 font-medium">Storage</th>
                      <th className="text-left px-4 py-3 font-medium">Category</th>
                      <th className="text-left px-4 py-3 font-medium">Can Be Disabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ['Supabase Auth Token', 'Essential', 'No — app will not work without it'],
                      ['Google OAuth Token', 'Essential', 'No — login will not work without it'],
                      ['Welcome Popup Flag', 'Non-Essential', 'Yes — clearing browser data removes it'],
                    ].map(([name, cat, disable]) => (
                      <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white/80">{name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat === 'Essential' ? 'bg-orange-500/15 text-orange-400' : 'bg-white/5 text-white/40'}`}>{cat}</span>
                        </td>
                        <td className="px-4 py-3 text-white/50">{disable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Because ConnectRight uses only one non-essential storage item (the welcome popup flag), and it stores no personal information, we do not currently display a cookie consent banner. If our storage practices change in the future, we will update this policy and add a consent mechanism accordingly.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">8. Future Changes to Storage Practices</h2>
              <p className="mb-3">As ConnectRight grows and new features are added, we may introduce additional storage. If we do, we will:</p>
              <ul className="flex flex-col gap-2 pl-4 list-disc list-outside marker:text-white/30">
                <li>Update this Cookie Policy with full details</li>
                <li>Update the Effective Date at the top</li>
                <li>Notify users through the platform if the changes are significant</li>
                <li>Add a consent mechanism if any non-essential tracking is introduced</li>
              </ul>
              <p className="mt-3">We are committed to always being transparent about what we store and why.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">9. Changes to This Cookie Policy</h2>
              <p>We may update this Cookie Policy from time to time to reflect changes in technology, law, or our platform. Any changes will be posted on this page with an updated Effective Date. Your continued use of ConnectRight after changes are posted means you accept the updated policy.</p>
            </section>

            <section>
              <h2 className="text-white font-semibold text-base mb-3">10. Contact Us</h2>
              <p className="mb-2">If you have any questions or concerns about this Cookie Policy or how we use storage on ConnectRight, please contact us:</p>
              <p>Email: <a href="mailto:altonjoe670@gmail.com" className="text-white/50 hover:text-white transition-colors">altonjoe670@gmail.com</a></p>
              <p>Website: ConnectRight</p>
              <p className="mt-2">We aim to respond to all enquiries within 30 days.</p>
            </section>

            <div className="pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs">By continuing to use ConnectRight, you acknowledge that you have read and understood this Cookie Policy.</p>
            </div>

          </div>
        </div>{/* end card */}
      </div>
    </div>
  )
}
