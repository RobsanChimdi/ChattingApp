// app/privacy/page.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, Mail, FileText } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  const lastUpdated = 'March 1, 2024';

  const sections = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact support. This includes your name, email address, phone number, profile picture, and communications data.',
      items: [
        'Account information (name, email, phone number)',
        'Profile data (profile picture, status, bio)',
        'Communications data (call logs, message history)',
        'Usage data (features used, call duration, quality metrics)',
        'Device information (operating system, browser type, IP address)'
      ]
    },
    {
      title: 'How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, as well as to protect our users and comply with legal obligations.',
      items: [
        'Provide and deliver our calling and messaging services',
        'Process transactions and send related information',
        'Send technical notices, updates, and support messages',
        'Respond to your comments and questions',
        'Monitor and analyze trends, usage, and activities',
        'Detect, investigate, and prevent fraudulent transactions'
      ]
    },
    {
      title: 'Information Sharing',
      content: 'We do not sell your personal information. We may share information in the following circumstances:',
      items: [
        'With other users as necessary to provide our services',
        'With service providers who perform services on our behalf',
        'If required by law or to protect rights and safety',
        'In connection with a business transfer (merger, acquisition)'
      ]
    },
    {
      title: 'Data Security',
      content: 'We take reasonable measures to help protect your information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. All calls and messages are encrypted end-to-end.',
    },
    {
      title: 'Your Rights',
      content: 'Depending on your location, you may have certain rights regarding your personal information:',
      items: [
        'Access your personal information',
        'Correct inaccurate information',
        'Delete your information',
        'Export your data',
        'Opt out of certain data uses'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1">
            <Shield className="h-3 w-3 mr-1" />
            Privacy Policy
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Your Privacy
            <span className="text-primary"> Matters</span>
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {sections.map((section) => (
              <Link
                key={section.title}
                href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {section.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-8 md:p-12 space-y-10">
            {/* Introduction */}
            <div className="prose prose-gray max-w-none">
              <p className="lead text-lg text-muted-foreground">
                This Privacy Policy describes how CallMe ("we," "our," or "us") collects, uses, 
                and shares your personal information when you use our video calling and messaging services.
                By using CallMe, you agree to the collection and use of information in accordance with this policy.
              </p>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <div 
                key={section.title}
                id={section.title.toLowerCase().replace(/\s+/g, '-')}
                className="scroll-mt-20"
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {section.title}
                </h2>
                <p className="text-muted-foreground mb-4">{section.content}</p>
                {section.items && (
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Cookie Policy */}
            <div className="border-t pt-6">
              <h2 className="text-2xl font-bold mb-4">Cookie Policy</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar technologies to provide and improve our services. 
                You can control cookies through your browser settings.
              </p>
              <Link href="/cookies" className="text-primary hover:underline">
                Learn more about our Cookie Policy →
              </Link>
            </div>

            {/* Contact */}
            <div className="bg-primary/5 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Questions About Privacy?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy, please contact us.
              </p>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="mailto:privacy@callme.com">
                    <Mail className="h-4 w-4 mr-2" />
                    privacy@callme.com
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/contact">Contact Form</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}