import { useEffect, useState } from 'react';
import { useAuth } from '../supabase/auth';
import { supabase } from '../supabase/supabase';

export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [testQuery, setTestQuery] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSessionInfo({ session: session?.user?.id, error });
      
      // Test a simple query
      if (session?.user) {
        const { data, error: queryError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', session.user.id)
          .single();
        setTestQuery({ data, error: queryError });
      }
    };

    checkSession();
  }, [user]);

  if (loading) return <div>Loading auth debug...</div>;

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>Auth Debug Info</h4>
      <div><strong>User ID:</strong> {user?.id || 'null'}</div>
      <div><strong>Email:</strong> {user?.email || 'null'}</div>
      <div><strong>Profile:</strong> {userProfile?.id || 'null'}</div>
      <div><strong>Loading:</strong> {loading.toString()}</div>
      <div><strong>Session ID:</strong> {sessionInfo?.session || 'null'}</div>
      <div><strong>Session Error:</strong> {sessionInfo?.error?.message || 'none'}</div>
      <div><strong>Test Query:</strong> {testQuery?.data?.id || 'failed'}</div>
      <div><strong>Query Error:</strong> {testQuery?.error?.message || 'none'}</div>
      <div><strong>auth.uid():</strong> 
        <button onClick={async () => {
          const { data } = await supabase.rpc('auth.uid');
          alert(`auth.uid() = ${data}`);
        }}>
          Test auth.uid()
        </button>
      </div>
    </div>
  );
}