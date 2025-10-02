'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { signIn, useSession, signOut } from 'next-auth/react';


export default function AuthPage() {
  const { data: session, status } = useSession();
  const [, setPreferredRole] = useState<'admin' | 'contributor' | null>(null);
  const [checkSession, setCheckSession] = useState(false);
  const router = useRouter();


  // Only check session when user explicitly wants to authenticate
  useEffect(() => {
    if (checkSession && status === 'authenticated') {
      const saved = (typeof window !== 'undefined' && localStorage.getItem('preferredRole')) as
        | 'admin'
        | 'contributor'
        | null;
      if (saved) {
        setPreferredRole(saved);
        // Don't auto-redirect - let user choose their role explicitly
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSession, status]);

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
              Welcome to DevPayStream
            </CardTitle>
            <CardDescription className="text-gray-600">
              Choose your role to continue
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {checkSession && status === 'authenticated' ? (
              <div className="space-y-5">
                <Alert>
                  <AlertDescription>
                    Signed in as {(session as { user?: { email?: string; name?: string } })?.user?.email || (session as { user?: { email?: string; name?: string } })?.user?.name}
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

            {!checkSession || status !== 'authenticated' ? (
              <div className="space-y-5">
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
                  </div>
                      </div>
            ) : null}


            <div className="mt-6 text-center space-y-3">
              <div className="space-y-2">
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
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCheckSession(true)}
                    className="w-full h-11 text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    Check Existing Session
                  </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
