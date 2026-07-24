'use client';



import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { Separator } from '@/components/ui/separator';

import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle } from 'lucide-react';

import { cn } from '@/lib/utils';



export default function RegisterPage() {

  const router = useRouter();

  const { register, isLoading, error, clearError, setLoading, isAuthenticated } = useAuth();

  

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({

    username: '',

    email: '',

    password: '',

    confirm_password: '',

    first_name: '',

    last_name: ''

  });

  const [formErrors, setFormErrors] = useState<{

    username?: string;

    email?: string;

    password?: string;

    confirm_password?: string;

  }>({});

  const [passwordStrength, setPasswordStrength] = useState<{

    score: number;

    feedback: string[];

  }>({ score: 0, feedback: [] });



  // Redirect if already authenticated

  useEffect(() => {

    if (isAuthenticated) {

      router.push('/dashboard');

    }

  }, [isAuthenticated, router]);



  // Reset form data when component mounts

  useEffect(() => {

    setFormData({

      username: '',

      email: '',

      password: '',

      confirm_password: '',

      first_name: '',

      last_name: ''

    });

    setFormErrors({});

    setPasswordStrength({ score: 0, feedback: [] });

  }, []);



  // Clear error on unmount

  useEffect(() => {

    return () => {

      clearError();

    };

  }, [clearError]);



  // Check password strength

  useEffect(() => {

    if (!formData.password) {

      setPasswordStrength({ score: 0, feedback: [] });

      return;

    }



    const feedback: string[] = [];

    let score = 0;



    // Length check

    if (formData.password.length >= 8) {

      score += 1;

    } else {

      feedback.push('At least 8 characters');

    }



    // Uppercase check

    if (/[A-Z]/.test(formData.password)) {

      score += 1;

    } else {

      feedback.push('At least one uppercase letter');

    }



    // Lowercase check

    if (/[a-z]/.test(formData.password)) {

      score += 1;

    } else {

      feedback.push('At least one lowercase letter');

    }



    // Number check

    if (/[0-9]/.test(formData.password)) {

      score += 1;

    } else {

      feedback.push('At least one number');

    }



    // Special character check

    if (/[^A-Za-z0-9]/.test(formData.password)) {

      score += 1;

    } else {

      feedback.push('At least one special character');

    }



    setPasswordStrength({ score, feedback });

  }, [formData.password]);



  const validateForm = () => {

    const errors: typeof formErrors = {};

    

    if (!formData.username.trim()) {

      errors.username = 'Username is required';

    } else if (formData.username.length < 3) {

      errors.username = 'Username must be at least 3 characters';

    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {

      errors.username = 'Username can only contain letters, numbers, and underscores';

    }

    

    if (!formData.email.trim()) {

      errors.email = 'Email is required';

    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {

      errors.email = 'Please enter a valid email address';

    }

    

    if (!formData.password) {

      errors.password = 'Password is required';

    } else if (formData.password.length < 6) {

      errors.password = 'Password must be at least 6 characters';

    } else if (passwordStrength.score < 3) {

      errors.password = 'Password is too weak';

    }

    

    if (!formData.confirm_password) {

      errors.confirm_password = 'Please confirm your password';

    } else if (formData.password !== formData.confirm_password) {

      errors.confirm_password = 'Passwords do not match';

    }

    

    setFormErrors(errors);

    return Object.keys(errors).length === 0;

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    

    if (!validateForm()) return;

    

    try {

      await register(formData);

    } catch (error) {

      // Error is handled by the hook

    }

  };



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing

    if (formErrors[name as keyof typeof formErrors]) {

      setFormErrors(prev => ({ ...prev, [name]: undefined }));

    }

    // Clear global error when user makes changes

    if (error) {

      clearError();

    }

  };



  const getPasswordStrengthColor = () => {

    switch (passwordStrength.score) {

      case 0:

      case 1:

        return 'bg-destructive';

      case 2:

      case 3:

        return 'bg-yellow-500';

      case 4:

      case 5:

        return 'bg-green-500';

      default:

        return 'bg-muted';

    }

  };



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">

      <Card className="w-full max-w-lg">

        <CardHeader className="space-y-1 text-center">

          <CardTitle className="text-3xl font-bold">Create an Account</CardTitle>

          <CardDescription>

            Sign up to start chatting with your friends

          </CardDescription>

        </CardHeader>

        

        <form onSubmit={handleSubmit}>

          <CardContent className="space-y-4">

            {error && (

              <Alert variant="destructive">

                <AlertDescription>{error}</AlertDescription>

              </Alert>

            )}



            {/* Name fields */}

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">

                <Label htmlFor="first_name">First Name (Optional)</Label>

                <Input

                  id="first_name"

                  name="first_name"

                  placeholder="John"

                  value={formData.first_name}

                  onChange={handleChange}

                  disabled={isLoading}

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="last_name">Last Name (Optional)</Label>

                <Input

                  id="last_name"

                  name="last_name"

                  placeholder="Doe"

                  value={formData.last_name}

                  onChange={handleChange}

                  disabled={isLoading}

                />

              </div>

            </div>



            {/* Username */}

            <div className="space-y-2">

              <Label htmlFor="username">Username</Label>

              <div className="relative">

                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input

                  id="username"

                  name="username"

                  type="text"

                  placeholder="johndoe"

                  className={cn(

                    "pl-10",

                    formErrors.username && "border-destructive"

                  )}

                  value={formData.username}

                  onChange={handleChange}

                  disabled={isLoading}

                  autoComplete="username"

                />

              </div>

              {formErrors.username && (

                <p className="text-sm text-destructive">{formErrors.username}</p>

              )}

            </div>



            {/* Email */}

            <div className="space-y-2">

              <Label htmlFor="email">Email</Label>

              <div className="relative">

                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input

                  id="email"

                  name="email"

                  type="email"

                  placeholder="john@example.com"

                  className={cn(

                    "pl-10",

                    formErrors.email && "border-destructive"

                  )}

                  value={formData.email}

                  onChange={handleChange}

                  disabled={isLoading}

                  autoComplete="email"

                />

              </div>

              {formErrors.email && (

                <p className="text-sm text-destructive">{formErrors.email}</p>

              )}

            </div>



            {/* Password */}

            <div className="space-y-2">

              <Label htmlFor="password">Password</Label>

              <div className="relative">

                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input

                  id="password"

                  name="password"

                  type={showPassword ? 'text' : 'password'}

                  placeholder="Create a password"

                  className={cn(

                    "pl-10 pr-10",

                    formErrors.password && "border-destructive"

                  )}

                  value={formData.password}

                  onChange={handleChange}

                  disabled={isLoading}

                  autoComplete="new-password"

                />

                <Button

                  type="button"

                  variant="ghost"

                  size="icon"

                  className="absolute right-1 top-1 h-8 w-8"

                  onClick={() => setShowPassword(!showPassword)}

                >

                  {showPassword ? (

                    <EyeOff className="h-4 w-4" />

                  ) : (

                    <Eye className="h-4 w-4" />

                  )}

                </Button>

              </div>

              

              {/* Password strength indicator */}

              {formData.password && (

                <div className="space-y-2">

                  <div className="flex items-center space-x-2">

                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">

                      <div

                        className={cn(

                          "h-full transition-all",

                          getPasswordStrengthColor()

                        )}

                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}

                      />

                    </div>

                    <span className="text-xs text-muted-foreground">

                      {passwordStrength.score}/5

                    </span>

                  </div>

                  {passwordStrength.feedback.length > 0 && (

                    <ul className="text-xs space-y-1">

                      {passwordStrength.feedback.map((item, index) => (

                        <li key={index} className="text-muted-foreground">

                          • {item}

                        </li>

                      ))}

                    </ul>

                  )}

                </div>

              )}

              

              {formErrors.password && (

                <p className="text-sm text-destructive">{formErrors.password}</p>

              )}

            </div>



            {/* Confirm Password */}

            <div className="space-y-2">

              <Label htmlFor="confirm_password">Confirm Password</Label>

              <div className="relative">

                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

                <Input

                  id="confirm_password"

                  name="confirm_password"

                  type={showConfirmPassword ? 'text' : 'password'}

                  placeholder="Confirm your password"

                  className={cn(

                    "pl-10 pr-10",

                    formErrors.confirm_password && "border-destructive"

                  )}

                  value={formData.confirm_password}

                  onChange={handleChange}

                  disabled={isLoading}

                  autoComplete="new-password"

                />

                <Button

                  type="button"

                  variant="ghost"

                  size="icon"

                  className="absolute right-1 top-1 h-8 w-8"

                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}

                >

                  {showConfirmPassword ? (

                    <EyeOff className="h-4 w-4" />

                  ) : (

                    <Eye className="h-4 w-4" />

                  )}

                </Button>

              </div>

              {formErrors.confirm_password && (

                <p className="text-sm text-destructive">{formErrors.confirm_password}</p>

              )}

            </div>



            {/* Terms agreement */}

            <p className="text-xs text-muted-foreground text-center">

              By creating an account, you agree to our{' '}

              <Link href="/terms" className="text-primary hover:underline">

                Terms of Service

              </Link>{' '}

              and{' '}

              <Link href="/privacy" className="text-primary hover:underline">

                Privacy Policy

              </Link>

            </p>

          </CardContent>



          <CardFooter className="flex flex-col space-y-4">

            <Button

              type="submit"

              className="w-full"

              disabled={isLoading}

            >

              {isLoading ? (

                <>

                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  Creating account...

                </>

              ) : (

                'Create Account'

              )}

            </Button>



            <div className="relative">

              <div className="absolute inset-0 flex items-center">

                <Separator className="w-full" />

              </div>

              <div className="relative flex justify-center text-xs uppercase">

                <span className="bg-card px-2 text-muted-foreground">

                  Already have an account?

                </span>

              </div>

            </div>



            <Button

              variant="outline"

              className="w-full"

              onClick={() => router.push('/login')}

              disabled={isLoading}

            >

              Sign in instead

            </Button>

          </CardFooter>

        </form>

      </Card>

    </div>

  );

}