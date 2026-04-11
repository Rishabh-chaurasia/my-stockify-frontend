import React, { useEffect, useState } from 'react';
import { WifiOff, X, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [status,    setStatus]    = useState('checking');
  const [dismissed, setDismissed] = useState(false);
  const [retrying,  setRetrying]  = useState(false);

  const check = async () => {
    try {
      // Always use relative /api path — goes through Vite proxy in dev,
      // and hits the correct domain in production (no CORS issues)
      const r = await fetch(
        '/api/stocks/RELIANCE.NS?range=1d&interval=1m',
        { signal: AbortSignal.timeout(8000) }
      );
      // Any response under 500 means server is reachable
      setStatus(r.status < 500 ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setDismissed(false);
    await check();
    setRetrying(false);
  };

  if (status === 'online' || status === 'checking' || dismissed) return null;

  return (
    <div style={{
      position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
      zIndex:999, width:'calc(100% - 32px)', maxWidth:460,
      background:'#fff', border:'1px solid rgba(235,87,87,0.3)',
      borderRadius:'var(--r-md)', padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
      display:'flex', alignItems:'flex-start', gap:12,
      animation:'fadeUp 0.3s ease',
    }}>
      <div style={{ width:34, height:34, borderRadius:8, background:'var(--red-lt)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <WifiOff size={15} color="var(--red)"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:3 }}>Server unreachable</p>
        <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
          Unable to connect to the Stockify server. Please check your connection and try again.
        </p>
        <button onClick={handleRetry} disabled={retrying}
          style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'var(--red)', background:'var(--red-lt)', border:'none', padding:'4px 10px', borderRadius:'var(--r-sm)', cursor:'pointer' }}>
          <RefreshCw size={11} style={{ animation: retrying ? 'spin 0.8s linear infinite' : 'none' }}/>
          {retrying ? 'Checking…' : 'Retry'}
        </button>
      </div>
      <button onClick={() => setDismissed(true)} style={{ color:'var(--muted)', padding:2, borderRadius:4, flexShrink:0, marginTop:2, background:'none', border:'none', cursor:'pointer' }}>
        <X size={15}/>
      </button>
    </div>
  );
}
