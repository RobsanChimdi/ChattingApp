// app/terms/page.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  const lastUpdated = 'March 1, 2024';

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using CallMe, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.'
    },
    {
      title: '2. Eligibility',
      content: 'You must be at least 13 years old to use CallMe. By using our services, you represent and warrant that you meet all eligibility requirements.',
      items: [
        'You are at least 13 years of age',
        'You have the legal capacity to enter into these terms',
        'You are not located in a country subject to US sanctions',
        'You have not been previously suspended or removed from our services'
      ]
    },
    {
      title: '3. Account Responsibilities',
      content: 'You are responsible for maintaining the security of your account and password. CallMe cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.',
      items: [
        'Keep your password confidential',
        'Notify us immediately of unauthorized access',
        'You are responsible for all activity under your account',
        'Provide accurate and complete information'
      ]
    },
    {
      title: '4. Acceptable Use',
      content: 'You agree not to misuse our services or help anyone else do so. Prohibited activities include:',
      items: [
        'Violating any laws or regulations',
        'Harassing, abusing, or harming others',
        'Impersonating any person or entity',
        'Distributing malware or harmful code',
        'Interfering with or disrupting the service',
        'Collecting personal information without consent',
        'Using the service for illegal purposes'
      ]
    },
    {
      title: '5. Content and Intellectual Property',
      content: 'You retain ownership of any content you submit, post, or display on or through CallMe. By submitting content, you grant us a worldwide, royalty-free license to use, reproduce, and display that content solely for the purpose of providing our services.'
    },
    {
      title: '6. Cancellation and Termination',
      content: 'You may stop using our services at any time. We may suspend or terminate your access to our services if you violate these terms or for any other reason at our discretion.',
    },
    {
      title: '7. Disclaimer of Warranties',
      content: 'Our services are provided "as is" without any warranties, express or implied. We do not guarantee that our services will be uninterrupted, secure, or error-free.',
    },
    {
      title: '8. Limitation of Liability',
      content: 'To the maximum extent permitted by law, CallMe shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1">
            <FileText className="h-3 w-3 mr-1" />
            Terms of Service
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-primary">Agreement</span>
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Summary */}
      <section className="py-8 border-b bg-primary/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex gap-3 p-4 rounded-lg">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong>Quick Summary:</strong> These terms govern your use of CallMe. 
              By using our services, you agree to follow these rules. Please read the full terms below.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-8 md:p-12">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <div key={section.title} className={index > 0 ? 'pt-6 border-t' : ''}>
                  <h2 className="text-xl font-bold mb-3">{section.title}</h2>
                  <p className="text-muted-foreground mb-3">{section.content}</p>
                  {section.items && (
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {/* Governing Law */}
              <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-3">9. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms shall be governed and construed in accordance with the laws of the United States, 
                  without regard to its conflict of law provisions.
                </p>
              </div>

              {/* Contact */}
              <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-3">10. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms, please contact us:
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Email:</strong>{' '}
                    <Link href="mailto:legal@callme.com" className="text-primary hover:underline">
                      legal@callme.com
                    </Link>
                  </li>
                  <li>
                    <strong>Address:</strong> 123 Communication St, San Francisco, CA 94105
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}