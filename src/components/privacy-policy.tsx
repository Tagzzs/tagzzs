'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface PrivacyPolicyProps {
  children: React.ReactNode
  className?: string
}

export function PrivacyPolicy({ children, className }: PrivacyPolicyProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className={className || "hover:underline cursor-pointer"}>
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Privacy Policy</DialogTitle>
          <DialogDescription>
            Last updated: August 19, 2025
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Introduction */}
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Introduction</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TAGZS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our personal knowledge management service.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access or use the Service.
              </p>
            </section>

            <Separator />

            {/* Information We Collect */}
            <section>
              <h3 className="text-lg font-semibold mb-3">2. Information We Collect</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We collect information you provide directly to us, such as:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Name and email address when you create an account</li>
                    <li>Profile information and preferences</li>
                    <li>Content you upload, save, or create in the system</li>
                    <li>Communications with our support team</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Automatically Collected Information</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    When you use our Service, we automatically collect certain information:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Device information (browser type, operating system)</li>
                    <li>Usage data (pages visited, features used, time spent)</li>
                    <li>IP address and location data</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Content Information</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We process the content you store in TAGZS, including:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Text content and documents</li>
                    <li>PDF files and extracted text</li>
                    <li>Web page content and metadata</li>
                    <li>Tags and organizational structures</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            {/* How We Use Your Information */}
            <section>
              <h3 className="text-lg font-semibold mb-3">3. How We Use Your Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process and store your content securely</li>
                <li>Generate AI-powered tags and insights</li>
                <li>Authenticate and authorize access to your account</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect, investigate, and prevent fraudulent or illegal activities</li>
              </ul>
            </section>

            <Separator />

            {/* AI and Machine Learning */}
            <section>
              <h3 className="text-lg font-semibold mb-3">4. AI and Machine Learning Processing</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Content Analysis</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use AI and machine learning technologies to analyze your content for:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>Automatic tag generation</li>
                    <li>Content categorization</li>
                    <li>Text extraction from documents</li>
                    <li>Search relevance improvement</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Processing</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your content is processed using third-party AI services (such as Groq) in compliance with their privacy policies. We ensure that:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>Data is transmitted securely</li>
                    <li>Processing is limited to necessary functions</li>
                    <li>No content is permanently stored by AI providers</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            {/* Information Sharing */}
            <section>
              <h3 className="text-lg font-semibold mb-3">5. Information Sharing and Disclosure</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>With your explicit consent</li>
                <li>To trusted service providers who assist in operating our Service</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a business transfer or acquisition</li>
                <li>To prevent fraud or security threats</li>
              </ul>
            </section>

            <Separator />

            {/* Data Storage and Security */}
            <section>
              <h3 className="text-lg font-semibold mb-3">6. Data Storage and Security</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Data Storage</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your data is stored using industry-standard cloud services:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>User authentication data with Supabase</li>
                    <li>Content and metadata with Firebase</li>
                    <li>Encrypted transmission and storage</li>
                    <li>Regular backups and redundancy</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Security Measures</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We implement appropriate security measures including:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>Encryption in transit and at rest</li>
                    <li>Access controls and authentication</li>
                    <li>Regular security audits</li>
                    <li>Incident response procedures</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            {/* Your Rights and Choices */}
            <section>
              <h3 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Access: Request access to your personal information</li>
                <li>Correction: Request correction of inaccurate information</li>
                <li>Deletion: Request deletion of your personal information</li>
                <li>Portability: Request export of your data</li>
                <li>Withdrawal: Withdraw consent for processing</li>
                <li>Objection: Object to certain types of processing</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                To exercise these rights, please contact us using the information provided at the end of this policy.
              </p>
            </section>

            <Separator />

            {/* Cookies and Tracking */}
            <section>
              <h3 className="text-lg font-semibold mb-3">8. Cookies and Tracking Technologies</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Essential Cookies</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use essential cookies to:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>Maintain your login session</li>
                    <li>Remember your preferences</li>
                    <li>Ensure security of the Service</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Analytics Cookies</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We may use analytics cookies to understand how users interact with our Service and improve functionality.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Third-Party Services */}
            <section>
              <h3 className="text-lg font-semibold mb-3">9. Third-Party Services</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our Service integrates with third-party services:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Supabase (authentication and database)</li>
                <li>Firebase (content storage)</li>
                <li>Groq (AI processing)</li>
                <li>Google OAuth (optional authentication)</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <Separator />

            {/* Data Retention */}
            <section>
              <h3 className="text-lg font-semibold mb-3">10. Data Retention</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We retain your information for as long as necessary to provide the Service and fulfill legal obligations:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Account information: Until account deletion</li>
                <li>Content data: Until deletion by user or account termination</li>
                <li>Usage logs: 12 months for analytics</li>
                <li>Security logs: 24 months for security purposes</li>
              </ul>
            </section>

            <Separator />

            {/* International Transfers */}
            <section>
              <h3 className="text-lg font-semibold mb-3">11. International Data Transfers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
              </p>
            </section>

            <Separator />

            {/* Children's Privacy */}
            <section>
              <h3 className="text-lg font-semibold mb-3">12. Children's Privacy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <Separator />

            {/* Changes to Privacy Policy */}
            <section>
              <h3 className="text-lg font-semibold mb-3">13. Changes to This Privacy Policy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <Separator />

            {/* Contact Information */}
            <section>
              <h3 className="text-lg font-semibold mb-3">14. Contact Us</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p><strong>Email:</strong> privacy@tagzs.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@tagzs.com</p>
                <p><strong>Address:</strong> 123 Knowledge Street, Digital City, DC 12345</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default PrivacyPolicy
