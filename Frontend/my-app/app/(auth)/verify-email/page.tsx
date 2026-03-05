'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');
  
  const { 
    verifyEmail, 
    resendVerificationCode, 
    isLoading, 
    error, 
    clearError, 
    isAuthenticated,
    isEmailVerified,
    user
  } = useAuth();
  
  const [email, setEmail] = useState(emailParam || '');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Redirect if already verified
  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isEmailVerified, router]);

  // Auto-fill email from user data
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  // Resend timer
  useEffect(() => {
    if (!resendDisabled) return;

    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setResendDisabled(false);
          clearInterval(timer);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendDisabled]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      setVerificationCode(prev => 
        prev.map((_, i) => pastedCode[i] || '')
      );
      
      // Focus last filled input
      const lastFilledIndex = Math.min(pastedCode.length - 1, 5);
      const nextInput = document.getElementById(`code-${lastFilledIndex + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    } else {
      // Handle single digit
      setVerificationCode(prev => {
        const newCode = [...prev];
        newCode[index] = value;
        return newCode;
      });

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        if (nextInput) {
          (nextInput as HTMLInputElement).focus();
        }
      }
    }

    // Clear any errors
    if (error) {
      clearError();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // Focus previous input on backspace
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      return;
    }

    try {
      await verifyEmail({ email, verification_code: code });
      setVerificationSuccess(true);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleResendCode = async () => {
    if (!email || resendDisabled) return;

    try {
      await resendVerificationCode(email);
      setResendSuccess(true);
      setResendDisabled(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (verificationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => router.push('/')}
            >
              Continue to Chat
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to<br />
            <span className="font-medium text-foreground">{email || 'your email'}</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {resendSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Verification code resent successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Email input (editable if not from user) */}
            {!user?.email && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Verification code input */}
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-between gap-2">
                {verificationCode.map((digit, index) => (
                  <Input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cn(
                      "w-12 h-12 text-center text-lg",
                      error && "border-destructive"
                    )}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code sent to your email
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || verificationCode.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                type="button"
                variant="link"
                onClick={handleResendCode}
                disabled={isLoading || resendDisabled || !email}
                className="text-sm"
              >
                {resendDisabled ? (
                  `Resend code in ${resendTimer}s`
                ) : (
                  'Resend verification code'
                )}
              </Button>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Back to login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}