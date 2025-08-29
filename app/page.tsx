'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { signIn, useSession, signOut } from 'next-auth/react';

type UserType = 'admin' | 'contributor';

export default function AuthPage() {
  const { data: session, status } = useSession();
  const [preferredRole, setPreferredRole] = useState<'admin' | 'contributor' | null>(null);
  const [userType, setUserType] = useState<UserType>('admin');
  const [isLogin, setIsLogin] = useState(true);
  
  // Admin form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  
  // Contributor form state
  const [contributorGithubId, setContributorGithubId] = useState('');
  const [contributorUsername, setContributorUsername] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [contributorPassword, setContributorPassword] = useState('');
  
  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/api/v1/auth/admin/login' : '/api/v1/auth/admin/signin';
      const body = isLogin 
        ? { email: adminEmail, password: adminPassword }
        : { email: adminEmail, password: adminPassword, name: adminName };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      // Log the API response
      console.log(`Admin ${isLogin ? 'Login' : 'Signup'} Response:`, {
        endpoint,
        requestBody: body,
        response: data,
        timestamp: new Date().toISOString()
      });

      if (data.success) {
        setSuccess(isLogin ? 'Login successful! Redirecting...' : 'Account created successfully! Redirecting...');
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Log successful authentication
        console.log('Admin Authentication Success:', {
          user: data.user,
          token: data.token,
          timestamp: new Date().toISOString()
        });
        
        setTimeout(() => {
          const nextPath = data.user?.role === 'admin' ? '/admin/dashboard' : '/contributor/dashboard';
          router.push(nextPath);
        }, 1000);
      } else {
        setError(data.message || (isLogin ? 'Login failed' : 'Account creation failed'));
        
        // Log authentication failure
        console.error('Admin Authentication Failed:', {
          error: data.message,
          requestBody: body,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContributorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/api/v1/auth/contributer/login' : '/api/v1/auth/contributer/signin';
      const body = isLogin 
        ? { email: contributorEmail, password: contributorPassword }
        : { 
            githubId: contributorGithubId, 
            username: contributorUsername, 
            email: contributorEmail, 
            password: contributorPassword 
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      // Log the API response
      console.log(`Contributor ${isLogin ? 'Login' : 'Signup'} Response:`, {
        endpoint,
        requestBody: body,
        response: data,
        timestamp: new Date().toISOString()
      });

      if (data.success) {
        setSuccess(isLogin ? 'Login successful! Redirecting...' : 'Account created successfully! Redirecting...');
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Log successful authentication
        console.log('Contributor Authentication Success:', {
          user: data.user,
          token: data.token,
          timestamp: new Date().toISOString()
        });
        
        setTimeout(() => {
          const nextPath = data.user?.role === 'admin' ? '/admin/dashboard' : '/contributer/dashboard';
          router.push(nextPath);
        }, 1000);
      } else {
        setError(data.message || (isLogin ? 'Login failed' : 'Account creation failed'));
        
        // Log authentication failure
        console.error('Contributor Authentication Failed:', {
          error: data.message,
          requestBody: body,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAdminEmail('');
    setAdminPassword('');
    setAdminName('');
    setContributorGithubId('');
    setContributorUsername('');
    setContributorEmail('');
    setContributorPassword('');
    setError('');
    setSuccess('');
  };

  const handleTabChange = (value: string) => {
    setUserType(value as UserType);
    resetForm();
  };

  const handleModeToggle = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  // When authenticated via GitHub, auto-redirect if user has a preferred role stored
  useEffect(() => {
    if (status === 'authenticated') {
      const saved = (typeof window !== 'undefined' && localStorage.getItem('preferredRole')) as
        | 'admin'
        | 'contributor'
        | null;
      if (saved) {
        setPreferredRole(saved);
        router.push(saved === 'admin' ? '/admin/dashboard' : '/contributor/dashboard');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleChooseRole = (role: 'admin' | 'contributor') => {
    setPreferredRole(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredRole', role);
    }
    router.push(role === 'admin' ? '/admin/dashboard' : '/contributor/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Join our developer community'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {status === 'authenticated' ? (
              <div className="space-y-5">
                <Alert>
                  <AlertDescription>
                    Signed in as {(session as any)?.user?.email || (session as any)?.user?.name}
                  </AlertDescription>
                </Alert>
                <div className="space-y-2 text-center">
                  <p className="text-sm text-gray-700">Choose how you want to continue</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleChooseRole('admin')}
                      className="h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Continue as Admin
                    </Button>
                    <Button
                      onClick={() => handleChooseRole('contributor')}
                      className="h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Continue as Contributor
                    </Button>
                  </div>
                  <Button variant="ghost" onClick={() => signOut()} className="h-10 text-gray-600">
                    Sign out
                  </Button>
                </div>
              </div>
            ) : null}

            {status !== 'authenticated' ? (
            <Tabs value={userType} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="admin" className="text-sm font-medium">
                  Admin
                </TabsTrigger>
                <TabsTrigger value="contributor" className="text-sm font-medium">
                  Contributor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="space-y-4">
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="adminName" className="text-sm font-medium text-gray-700">
                        Name
                      </Label>
                      <Input
                        id="adminName"
                        type="text"
                        placeholder="Your name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required={!isLogin}
                        className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="Enter your password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                      </div>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="contributor" className="space-y-4">
                <form onSubmit={handleContributorSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="contributorGithubId" className="text-sm font-medium text-gray-700">
                          GitHub ID
                        </Label>
                        <Input
                          id="contributorGithubId"
                          type="text"
                          placeholder="your-github-username"
                          value={contributorGithubId}
                          onChange={(e) => setContributorGithubId(e.target.value)}
                          required={!isLogin}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="contributorUsername" className="text-sm font-medium text-gray-700">
                          Username
                        </Label>
                        <Input
                          id="contributorUsername"
                          type="text"
                          placeholder="your-username"
                          value={contributorUsername}
                          onChange={(e) => setContributorUsername(e.target.value)}
                          required={!isLogin}
                          className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="contributorEmail" className="text-sm font-medium text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="contributorEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={contributorEmail}
                      onChange={(e) => setContributorEmail(e.target.value)}
                      required
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contributorPassword" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="contributorPassword"
                      type="password"
                      placeholder="Enter your password"
                      value={contributorPassword}
                      onChange={(e) => setContributorPassword(e.target.value)}
                      required
                      className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                      </div>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            ) : null}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 text-center space-y-3">
              <Button
                variant="ghost"
                onClick={handleModeToggle}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Button>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>Demo Admin: admin@devpaystream.com / admin123</p>
                <p>Demo Contributor: dev@example.com / devpass123</p>
                <div className="pt-2" />
                <Button
                  type="button"
                  variant="default"
                  onClick={() => signIn('github', { callbackUrl: '/' })}
                  className="w-full h-11 bg-black hover:bg-zinc-900 text-white flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 .5a12 12 0 00-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0012 .5z" />
                  </svg>
                  Continue with GitHub
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
