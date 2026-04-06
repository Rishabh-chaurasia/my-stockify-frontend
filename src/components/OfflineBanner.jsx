import React, { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { getApiBase } from '../lib/api';

export default function OfflineBanner() {
  const [status,    setStatus]    = useState('checking');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/stocks/RELIANCE.NS?range=1d&interval=1m`, { signal: AbortSignal.timeout(5000) });
        setStatus(r.ok || r.status === 401 ? 'online' : 'offline');
      } catch { setStatus('offline'); }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  if (status === 'online' || status === 'checking' || dismissed) return null;

  return (
    <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:999, width:'calc(100% - 32px)', maxWidth:500,
      background:'#fff', border:'1px solid rgba(235,87,87,0.3)', borderRadius:'var(--r-md)', padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.12)', display:'flex', alignItems:'flex-start', gap:12, animation:'fadeUp 0.3s ease',
    }}>
      <div style={{ width:34, height:34, borderRadius:8, background:'var(--red-lt)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <WifiOff size={15} color="var(--red)"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:3 }}>Backend unreachable</p>
        <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
          Start your Spring Boot server: <code style={{ fontFamily:'var(--mono)', fontSize:11, background:'var(--bg)', padding:'1px 5px', borderRadius:4, border:'1px solid var(--border)' }}>./mvnw spring-boot:run</code>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} style={{ color:'var(--muted)', padding:2, borderRadius:4, flexShrink:0, marginTop:2 }}><X size={15}/></button>
    </div>
  );
}
