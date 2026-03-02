// app/blog/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function BlogPage() {
  const posts = [
    {
      id: 1,
      title: 'Introducing End-to-End Encryption for All Calls',
      excerpt: 'We\'re excited to announce that all calls on CallMe are now protected with end-to-end encryption, ensuring your conversations stay private.',
      author: 'Alex Thompson',
      date: 'March 1, 2024',
      readTime: '5 min read',
      category: 'Security',
      image: '/blog/e2ee.jpg'
    },
    {
      id: 2,
      title: 'How We Built a Scalable WebRTC Infrastructure',
      excerpt: 'Learn about the technical challenges we overcame to build a reliable video calling platform that serves millions of users.',
      author: 'Sarah Chen',
      date: 'February 15, 2024',
      readTime: '8 min read',
      category: 'Engineering',
      image: '/blog/webrtc.jpg'
    },
    {
      id: 3,
      title: 'The Future of Remote Work: 2024 Trends',
      excerpt: 'Discover how video calling is shaping the future of work and what trends to watch in the coming year.',
      author: 'Michael Rodriguez',
      date: 'February 1, 2024',
      readTime: '6 min read',
      category: 'Remote Work',
      image: '/blog/remote-work.jpg'
    },
    {
      id: 4,
      title: '5 Tips for Better Video Call Quality',
      excerpt: 'Simple adjustments you can make to improve your video call experience, from lighting to bandwidth optimization.',
      author: 'Emily Watson',
      date: 'January 20, 2024',
      readTime: '4 min read',
      category: 'Tips & Tricks',
      image: '/blog/tips.jpg'
    }
  ];

  const categories = [
    'All Posts',
    'Security',
    'Engineering',
    'Remote Work',
    'Product Updates',
    'Tips & Tricks',
    'Company News'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4">Blog</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Insights from the
            <br />
            <span className="text-primary">CallMe Team</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Stories, updates, and guides from the team building the future of communication.
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search articles..." 
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === 'All Posts' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 flex flex-col justify-center">
                <Badge className="w-fit mb-4">Featured</Badge>
                <h2 className="text-3xl font-bold mb-4">
                  Introducing CallMe Groups: Connect with Everyone
                </h2>
                <p className="text-muted-foreground mb-6">
                  Today we're launching group calls with up to 16 participants, 
                  along with screen sharing and virtual backgrounds. Here's what's new.
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Product Team</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>March 5, 2024</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>6 min read</span>
                  </div>
                </div>
                <Link href="/blog/callme-groups-launch">
                  <Button>
                    Read Article
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="bg-muted h-64 md:h-auto flex items-center justify-center">
                <div className="text-4xl text-muted-foreground/30">Featured Image</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground/30">Post Image</span>
                </div>
                <div className="p-6">
                  <Badge variant="outline" className="mb-3">{post.category}</Badge>
                  <h3 className="text-xl font-semibold mb-2">
                    <Link href={`/blog/${post.id}`} className="hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{post.author}</span>
                    <div className="flex items-center gap-3">
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-12">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">
            Get the latest posts delivered right to your inbox.
          </p>
          <div className="flex gap-2">
            <Input placeholder="Enter your email" className="flex-1" />
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>
    </div>
  );
}