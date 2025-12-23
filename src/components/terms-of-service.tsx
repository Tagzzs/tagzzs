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

interface TermsOfServiceProps {
  children: React.ReactNode
  className?: string
}

export function TermsOfService({ children, className }: TermsOfServiceProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className={className || "hover:underline cursor-pointer"}>
          {children}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Terms of Service</DialogTitle>
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
                Welcome to TAGZS ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our personal knowledge management system and related services (the "Service") operated by TAGZS.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
              </p>
            </section>

            <Separator />

            {/* Acceptance of Terms */}
            <section>
              <h3 className="text-lg font-semibold mb-3">2. Acceptance of Terms</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By creating an account or using TAGZS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>You must be at least 13 years old to use this service</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
              </ul>
            </section>

            <Separator />

            {/* Description of Service */}
            <section>
              <h3 className="text-lg font-semibold mb-3">3. Description of Service</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TAGZS is a personal knowledge management system that allows you to:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Save and organize content from various sources</li>
                <li>Extract text and metadata from PDFs and web pages</li>
                <li>Generate AI-powered tags for content organization</li>
                <li>Search and retrieve your saved content efficiently</li>
                <li>Manage your personal knowledge base</li>
              </ul>
            </section>

            <Separator />

            {/* User Accounts */}
            <section>
              <h3 className="text-lg font-semibold mb-3">4. User Accounts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To use certain features of the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <Separator />

            {/* Content and Data */}
            <section>
              <h3 className="text-lg font-semibold mb-3">5. Content and Data</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Your Content</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You retain ownership of all content you upload, create, or store using TAGZS. By using our Service, you grant us a limited license to process, store, and display your content solely for the purpose of providing the Service.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Content Guidelines</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You agree not to upload, store, or share content that:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                    <li>Violates any laws or regulations</li>
                    <li>Infringes on intellectual property rights</li>
                    <li>Contains malicious software or code</li>
                    <li>Is harmful, offensive, or inappropriate</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            {/* AI and Machine Learning */}
            <section>
              <h3 className="text-lg font-semibold mb-3">6. AI and Machine Learning Features</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TAGZS uses artificial intelligence and machine learning technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Content analysis and tag generation</li>
                <li>Text extraction and processing</li>
                <li>Search and recommendation algorithms</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                While we strive for accuracy, AI-generated content may not always be perfect. You should review and verify any AI-generated suggestions.
              </p>
            </section>

            <Separator />

            {/* Prohibited Uses */}
            <section>
              <h3 className="text-lg font-semibold mb-3">7. Prohibited Uses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You may not use TAGZS for any unlawful purpose or in any way that could damage, disable, or impair the Service. Prohibited activities include:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Attempting to gain unauthorized access to systems</li>
                <li>Interfering with the Service's operation</li>
                <li>Using the Service to store or distribute illegal content</li>
                <li>Reverse engineering or attempting to extract source code</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            <Separator />

            {/* Service Availability */}
            <section>
              <h3 className="text-lg font-semibold mb-3">8. Service Availability</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We strive to maintain high service availability, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Scheduled maintenance</li>
                <li>Technical difficulties</li>
                <li>Third-party service dependencies</li>
                <li>Force majeure events</li>
              </ul>
            </section>

            <Separator />

            {/* Limitation of Liability */}
            <section>
              <h3 className="text-lg font-semibold mb-3">9. Limitation of Liability</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, TAGZS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill.
              </p>
            </section>

            <Separator />

            {/* Termination */}
            <section>
              <h3 className="text-lg font-semibold mb-3">10. Termination</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Either party may terminate this agreement at any time. Upon termination:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Your access to the Service will be suspended</li>
                <li>You may request data export within 30 days</li>
                <li>We may delete your data after the retention period</li>
              </ul>
            </section>

            <Separator />

            {/* Changes to Terms */}
            <section>
              <h3 className="text-lg font-semibold mb-3">11. Changes to Terms</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <Separator />

            {/* Contact Information */}
            <section>
              <h3 className="text-lg font-semibold mb-3">12. Contact Information</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="text-sm text-muted-foreground mt-2">
                <p>Email: legal@tagzs.com</p>
                <p>Address: 123 Knowledge Street, Digital City, DC 12345</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default TermsOfService
