import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

export default function Portal() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation('/portal/login');
    } else if (user.role === 'admin') {
      setLocation('/portal/admin');
    } else {
      setLocation('/portal/dashboard');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
