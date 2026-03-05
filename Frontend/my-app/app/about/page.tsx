// app/about/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Globe,
  Heart,
  Target,
  Eye,
  Award,
  ChevronRight,
  Mail,
  MapPin,
  Calendar,
  Video,
  Shield
} from 'lucide-react';

export default function AboutPage() {
  const team = [
    {
      name: 'Alex Thompson',
      role: 'CEO & Co-founder',
      bio: 'Former engineering 10+ years in real-time communications.',
      image: '/team/alex.jpg',
      social: { twitter: '#', linkedin: '#' }
    },
    {
      name: 'Sarah Chen',
      role: 'CTO & Co-founder',
      bio: 'WebRTC expert and open source contributor. Previously.',
      image: '/team/sarah.jpg',
      social: { twitter: '#', linkedin: '#' }
    },
    {
      name: 'Michael Rodriguez',
      role: 'Head of Product',
      bio: 'Product leader who built communication tools serving 50M+ users.',
      image: '/team/michael.jpg',
      social: { twitter: '#', linkedin: '#' }
    },
    {
      name: 'Emily Watson',
      role: 'Head of Engineering',
      bio: 'Distributed systems specialist with a passion for scalable architecture.',
      image: '/team/emily.jpg',
      social: { twitter: '#', linkedin: '#' }
    }
  ];

  const values = [
    {
      icon: Users,
      title: 'User First',
      description: 'Every decision we make starts with our users. Your experience drives our innovation.'
    },
    {
      icon: Shield,
      title: 'Privacy by Design',
      description: 'We build security into every layer of our platform, not as an afterthought.'
    },
    {
      icon: Globe,
      title: 'Global Community',
      description: 'Connecting people across borders, cultures, and time zones seamlessly.'
    },
    {
      icon: Heart,
      title: 'Passion for Quality',
      description: 'We obsess over every pixel and packet to deliver the best possible experience.'
    }
  ];

  const milestones = [
    { year: '2020', event: 'CallMe founded in San Francisco' },
    { year: '2021', event: 'Launched beta version with 10K users' },
    { year: '2022', event: 'Reached 100K active users' },
    { year: '2023', event: 'Introduced group calls and screen sharing' },
    { year: '2024', event: '1M+ users and expanding globally' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">About Us</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Connecting the World,
              <br />
              <span className="text-primary">One Call at a Time</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We're on a mission to make high-quality video communication accessible 
              to everyone, everywhere. No barriers, no compromises.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8">
              <Target className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                To democratize communication by providing crystal clear, secure, 
                and reliable video calling that's accessible to everyone, 
                regardless of their technical expertise or internet connection.
              </p>
            </Card>
            
            <Card className="p-8">
              <Eye className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground">
                A world where distance doesn't matter – where families stay close, 
                teams collaborate effortlessly, and communities connect meaningfully 
                through technology that feels natural and intuitive.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">What We Stand For</h2>
            <p className="text-muted-foreground">
              Our core values guide everything we do, from product development to customer support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="p-6 text-center">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet the Team</h2>
            <p className="text-muted-foreground">
              We're a diverse group of engineers, designers, and dreamers 
              passionate about connecting people.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {team.map((member) => (
              <Card key={member.name} className="p-6 text-center">
                <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-primary mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Our Journey</h2>
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <div key={milestone.year} className="flex items-start gap-4">
                  <div className="min-w-[80px] font-bold text-primary">{milestone.year}</div>
                  <div className="flex-1 pb-6 border-l-2 border-primary/20 pl-6 relative">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1" />
                    <p className="text-muted-foreground">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Join Us on Our Journey</h2>
          <p className="text-muted-foreground mb-8">
            We're always looking for talented people to join our team.
          </p>
          <Link href="/careers">
            <Button size="lg">
              View Open Positions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}