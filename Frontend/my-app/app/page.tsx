'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Video,
  Phone,
  MessageSquare,
  Shield,
  Zap,
  Globe,
  Users,
  Clock,
  Star,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const features = [
    {
      icon: Video,
      title: 'HD Video Calls',
      description: 'Crystal clear video calls with up to 8 participants. Perfect for team meetings and family catchups.'
    },
    {
      icon: Phone,
      title: 'High-Quality Audio',
      description: 'Experience studio-quality sound with noise cancellation and echo reduction technology.'
    },
    {
      icon: MessageSquare,
      title: 'Instant Messaging',
      description: 'Send messages, share files, and express yourself with rich media support.'
    },
    {
      icon: Shield,
      title: 'End-to-End Encrypted',
      description: 'Your conversations are private and secure with enterprise-grade encryption.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Connect instantly with optimized WebRTC technology for minimal latency.'
    },
    {
      icon: Globe,
      title: 'Global Connectivity',
      description: 'Works anywhere in the world with adaptive bitrate for varying network conditions.'
    }
  ];

  const stats = [
    { value: '1M+', label: 'Active Users' },
    { value: '50M+', label: 'Calls Made' },
    { value: '99.9%', label: 'Uptime' },
    { value: '150+', label: 'Countries' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Product Manager',
      content: 'CallMe has transformed how our remote team communicates. The video quality is unmatched!',
      avatar: '/avatars/sarah.jpg',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Freelance Developer',
      content: 'Finally a calling app that just works. The audio quality is incredible, even on slow connections.',
      avatar: '/avatars/michael.jpg',
      rating: 5
    },
    {
      name: 'Emma Williams',
      role: 'Small Business Owner',
      content: 'My team loves it. Easy to use, reliable, and the screen sharing feature is a game-changer.',
      avatar: '/avatars/emma.jpg',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        'Up to 4 participants per call',
        '60-minute call duration',
        'Basic chat features',
        'Screen sharing',
        'Mobile apps'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: '/month',
      description: 'For professionals and small teams',
      features: [
        'Up to 8 participants per call',
        'Unlimited call duration',
        'Advanced chat features',
        'Cloud recording',
        'Custom backgrounds',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Business',
      price: '$19.99',
      period: '/month',
      description: 'For growing businesses',
      features: [
        'Up to 16 participants per call',
        'Unlimited call duration',
        'Admin dashboard',
        'Analytics & insights',
        'API access',
        'Dedicated support'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const faqs = [
    {
      question: 'Is CallMe really free?',
      answer: 'Yes! Our free plan includes all essential features with some limitations on participant count and call duration. Perfect for personal use.'
    },
    {
      question: 'How is call quality?',
      answer: 'We use advanced WebRTC technology to ensure HD quality video and crystal clear audio. Our adaptive bitrate technology adjusts to your internet connection for the best possible experience.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. All calls and messages are end-to-end encrypted. We never store your conversation content and follow industry best practices for security.'
    },
    {
      question: 'Can I use it on mobile?',
      answer: 'Yes! CallMe works seamlessly on both iOS and Android devices through your mobile browser. Native apps coming soon!'
    },
    {
      question: 'Do I need to create an account?',
      answer: 'Yes, you need a free account to start calling. This helps us provide a secure and personalized experience.'
    },
    {
      question: 'What about group calls?',
      answer: 'Free plan supports up to 4 participants, Pro up to 8, and Business up to 16 participants per call.'
    }
  ];

  if (!isLoading && isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">CallMe</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-grid-pattern" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1 text-sm border-primary/20 bg-primary/5">
              <Star className="h-3 w-3 mr-1 text-primary" />
              Trusted by 1M+ users worldwide
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Crystal Clear Calls,
              <br />
              <span className="text-primary">Anywhere, Anytime</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the future of communication with HD video calls, 
              crystal clear audio, and instant messaging — all secured with 
              end-to-end encryption.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/register">
                <Button size="lg" className="min-w-[200px]">
                  Start Calling Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Image/Preview */}
        <div className="container mx-auto px-4 mt-16">
          <div className="relative rounded-xl overflow-hidden border shadow-2xl">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Preview of CallMe in action</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need in One App
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features that make calling and messaging effortless, 
              whether for work or personal use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Calling in Minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to connect with anyone, anywhere.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up for free in seconds with your email or social accounts.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Friends</h3>
              <p className="text-muted-foreground">
                Connect with contacts or invite them to join CallMe.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Calling</h3>
              <p className="text-muted-foreground">
                Make HD video or audio calls with just one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that's right for you. All plans include our core features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={cn(
                "p-6 relative",
                plan.popular && "border-primary shadow-lg"
              )}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Users Worldwide
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of satisfied users who trust CallMe for their daily communication.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="p-6">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto divide-y">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-4">
                <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Calling?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join millions of users who already enjoy crystal clear calls with CallMe.
            </p>
            <Link href="/register">
              <Button size="lg" className="min-w-[200px]">
                Create Free Account
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Video className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl">CallMe</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Crystal clear calls and messaging for everyone, everywhere.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CallMe. All rights reserved.
            </p>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Link href="https://github.com/callme" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Github className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://twitter.com/callme" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Twitter className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://linkedin.com/company/callme" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="mailto:support@callme.com">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mail className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}