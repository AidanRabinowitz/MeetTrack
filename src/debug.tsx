import { useEffect, useState } from 'react';
import { useAuth } from '../supabase/auth';
import { supabase } from '../supabase/supabase';

export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [testQuery, setTestQuery] = useState<any>(null);
  const [localStorageInfo, setLocalStorageInfo] = useState<string>('');

  useEffect(() => {
    const checkSession = async () => {
      // Check localStorage
      const keys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      setLocalStorageInfo(keys.join(', ') || 'none');

      const { data: { session }, error } = await supabase.auth.getSession();
      setSessionInfo({ 
        sessionExists: !!session, 
        userId: session?.user?.id, 
        error: error?.message,
        expiresAt: session?.expires_at 
      });
      
      // Test a simple query
      if (session?.user) {
        const { data, error: queryError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', session.user.id)
          .single();
        setTestQuery({ success: !!data, error: queryError?.message });
      }
    };

    checkSession();
  }, [user]);

  const clearAuth = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <h4>Auth Debug Info</h4>
      <div><strong>Loading:</strong> {loading.toString()}</div>
      <div><strong>User ID:</strong> {user?.id || 'null'}</div>
      <div><strong>Email:</strong> {user?.email || 'null'}</div>
      <div><strong>Profile:</strong> {userProfile?.id || 'null'}</div>
      <div><strong>Session Exists:</strong> {sessionInfo?.sessionExists?.toString() || 'unknown'}</div>
      <div><strong>Session User:</strong> {sessionInfo?.userId || 'null'}</div>
      <div><strong>Session Error:</strong> {sessionInfo?.error || 'none'}</div>
      <div><strong>Expires At:</strong> {sessionInfo?.expiresAt || 'unknown'}</div>
      <div><strong>Test Query:</strong> {testQuery?.success?.toString() || 'not tested'}</div>
      <div><strong>Query Error:</strong> {testQuery?.error || 'none'}</div>
      <div><strong>LocalStorage Keys:</strong> {localStorageInfo}</div>
      <button 
        onClick={clearAuth}
        style={{ 
          marginTop: '10px', 
          padding: '5px 10px', 
          background: 'red', 
          color: 'white', 
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Clear Auth & Reloadd
      </button>
    </div>
  );
}