import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, ArrowRight, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { login, getApiBase } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [backendOk, setBackendOk] = useState(null);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth } = useAuth();
  const successMsg = location.state?.message;

  useEffect(() => {
    fetch(`${getApiBase()}/api/stocks/RELIANCE.NS?range=1d&interval=1m`, { signal: AbortSignal.timeout(5000) })
      .then(r => setBackendOk(r.status < 500)).catch(() => setBackendOk(false));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      await login({ username: username.trim(), password });
      setAuth(username.trim());
      navigate('/portfolio', { replace: true });
    } catch (err) {
      if (err.status === 401 || err.status === 403) setError('Incorrect username or password.');
      else setError(err.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8f9fa', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{
        width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
        background: 'linear-gradient(135deg, #eef0ff 0%, #f0fff8 100%)',
        borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
      }} className="lp-side">
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: 0, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)', pointerEvents: 'none' }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>
            <TrendingUp size={18} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Stockify</span>
        </div>

        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-1px', marginBottom: 16 }}>
            Trade smarter.<br/>
            <span style={{ color: 'var(--blue)' }}>Learn faster.</span>
          </p>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 40 }}>
            Practice stock trading with live NSE prices. No real money, full experience.
          </p>
          {[
            { icon: Activity, title: 'Live NSE Prices', desc: 'Real-time data from Yahoo Finance via your backend' },
            { icon: TrendingUp, title: 'Market & Limit Orders', desc: 'Full order book with pending order tracking' },
            { icon: CheckCircle, title: 'Portfolio Analytics', desc: 'Track P&L with live price enrichment' },
          ].map(({ icon: Ic, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-lt)', border: '1px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic size={15} color="var(--blue)"/>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted2)', position: 'relative' }}>© 2025 Stockify · Virtual trading platform</p>
      </div>

      {/* Right panel - form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div className="lp-mob-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Stockify</span>
          </div>

          {/* Backend status */}
          {backendOk !== null && (
            <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 'var(--r)', marginBottom: 28, fontSize: 12, fontWeight: 500, background: backendOk ? 'var(--green-lt)' : 'var(--red-lt)', border: `1px solid ${backendOk ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: backendOk ? 'var(--green)' : 'var(--red)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: backendOk ? 'pulse 2s infinite' : 'none' }}/>
              {backendOk ? 'Backend connected' : 'Backend unreachable — start Spring Boot server'}
            </div>
          )}

          <h1 className="fade-up stagger-1" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.6px', marginBottom: 6 }}>Welcome back</h1>
          <p className="fade-up stagger-2" style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>Sign in to your Stockify account</p>

          {successMsg && (
            <div className="fade-up" style={{ display: 'flex', gap: 10, background: 'var(--green-lt)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 24 }}>
              <CheckCircle size={15} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }}/>
              <span style={{ fontSize: 13, color: 'var(--green)' }}>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="fade-up stagger-3">
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 7, fontWeight: 600, letterSpacing: '0.3px' }}>Username</label>
              <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Your username" autoComplete="username" autoCapitalize="none" autoCorrect="off"/>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 7, fontWeight: 600, letterSpacing: '0.3px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Your password" autoComplete="current-password" style={{ paddingRight: 48 }}/>
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', padding: 4, borderRadius: 4 }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--red-lt)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r)', padding: '11px 14px', marginBottom: 16, marginTop: 12 }}>
                <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }}/>
                <span style={{ fontSize: 13, color: 'var(--red)', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || backendOk === false}
              style={{ width: '100%', padding: '13px 0', marginTop: 20, border: 'none', borderRadius: 'var(--r)', fontSize: 15, fontWeight: 600, cursor: loading || backendOk === false ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s', opacity: loading ? 0.7 : 1,
                background: loading || backendOk === false ? 'var(--muted2)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff',
                boxShadow: loading || backendOk === false ? 'none' : '0 4px 16px rgba(59,130,246,0.25)',
              }}>
              {loading ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> Signing in…</> : <><span>Sign in</span><ArrowRight size={16}/></>}
            </button>
          </form>

          <p className="fade-up stagger-4" style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', marginTop: 28 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create one →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .lp-side { display: none !important; } .lp-mob-logo { display: flex !important; } }
      `}</style>
    </div>
  );
}
