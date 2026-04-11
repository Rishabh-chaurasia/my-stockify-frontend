import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, Plus, ArrowUpRight } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getPortfolio, getUserProfile, fetchHoldingPrices } from '../lib/api';

const INR = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v ?? 0);
const FMT = v => v == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(v);

export default function Portfolio() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [prices,   setPrices]   = useState({});
  const [wallet,   setWallet]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!username) return;
    if (!quiet) setLoading(true); else setSpinning(true);
    setError('');
    try {
      const [{ holdings: h }, profile] = await Promise.all([
        getPortfolio(username),
        getUserProfile(username),
      ]);
      setHoldings(h);
      setWallet(profile?.wallet || null);
      if (h.length > 0) {
        const syms = [...new Set(h.map(x => x.symbol))];
        const px = await fetchHoldingPrices(syms);
        setPrices(px);
      }
    } catch (e) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); setSpinning(false); }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const enriched = holdings.map(h => {
    const live  = prices[h.symbol];
    const liveP = live?.price ?? h.avgPrice;
    const val   = liveP * h.qty;
    const pl    = val - h.investment;
    const plPct = h.investment > 0 ? (pl / h.investment) * 100 : 0;
    return { ...h, livePrice: live?.price ?? null, liveChg: live?.changePercent ?? null, value: val, pl, plPct };
  });

  const totalInvested = enriched.reduce((s, h) => s + h.investment, 0);
  const totalValue    = enriched.reduce((s, h) => s + h.value, 0);
  const totalPL       = totalValue - totalInvested;
  const totalPLPct    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const plPos         = totalPL >= 0;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:90, borderRadius:'var(--r-md)' }}/>)}
        </div>
        <div className="skeleton" style={{ height:200, borderRadius:'var(--r-md)', marginBottom:16 }}/>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:64, borderRadius:'var(--r-md)', marginBottom:8 }}/>)}
      </main>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ textAlign:'center', paddingTop:80 }}>
        <p style={{ color:'var(--red)', marginBottom:16 }}>{error}</p>
        <button onClick={() => load()} className="btn btn-green">Retry</button>
      </main>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page">

        {/* ── Header ── */}
        <div className="fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:3 }}>My Portfolio</h1>
            <p style={{ fontSize:12, color:'var(--muted)' }}>Your virtual stock holdings</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link to="/trade" className="btn btn-green" style={{ fontSize:13, padding:'9px 18px' }}>
              <Plus size={14}/> Add stocks
            </Link>
            <button onClick={() => load(true)} style={{ width:38, height:38, borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <RefreshCw size={14} color="var(--text2)" style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}/>
            </button>
          </div>
        </div>

        {/* ── Groww-style top summary card ── */}
        <div className="fade-up" style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', marginBottom:16, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
          {/* Current value row */}
          <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:12, color:'var(--muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>Current Value</p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap' }}>
              <p style={{ fontSize:34, fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)', letterSpacing:'-1.5px', lineHeight:1 }}>{INR(totalValue)}</p>
              {totalInvested > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:13, fontWeight:700, color:plPos?'var(--green-d)':'var(--red)', background:plPos?'var(--green-lt)':'var(--red-lt)', padding:'3px 10px', borderRadius:6 }}>
                    {plPos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                    {plPos?'+':''}{INR(Math.abs(totalPL))} ({plPos?'+':''}{totalPLPct.toFixed(2)}%)
                  </span>
                  <span style={{ fontSize:12, color:'var(--muted)' }}>all time</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats row — Groww style */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)' }}>
            {[
              { label:'Invested',      val: INR(totalInvested),            clr:'var(--text)'  },
              { label:'1D Returns',    val: '—',                           clr:'var(--muted)' },
              { label:'Total Returns', val: plPos?`+${INR(Math.abs(totalPL))}`:INR(totalPL), clr:plPos?'var(--green-d)':'var(--red)' },
            ].map(({ label, val, clr }, i) => (
              <div key={label} style={{ padding:'14px 20px', borderRight: i<2 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize:11, color:'var(--muted)', fontWeight:500, marginBottom:5 }}>{label}</p>
                <p style={{ fontSize:14, fontWeight:700, fontFamily:'var(--mono)', color:clr }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Wallet card ── */}
        {wallet && (
          <div className="fade-up" style={{ background:'linear-gradient(135deg,#f0fff9,#eef0ff)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 20px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'var(--shadow-xs)' }}>
            <div>
              <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:4 }}>Available Cash</p>
              <p style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)', color:'var(--green-d)', letterSpacing:'-0.5px' }}>{INR(wallet.amount)}</p>
            </div>
            <Link to="/trade" style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--green-d)', fontWeight:700, background:'var(--green-lt)', padding:'9px 16px', borderRadius:'var(--r)', border:'1px solid rgba(0,179,134,0.25)' }}>
              Invest <ArrowUpRight size={14}/>
            </Link>
          </div>
        )}

        {/* ── Holdings ── */}
        <div className="fade-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Holdings ({enriched.length})</h2>
          </div>

          {enriched.length === 0 ? (
            <div style={{ textAlign:'center', padding:'56px 20px', background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
              <BarChart3 size={48} color="var(--muted2)" style={{ margin:'0 auto 16px', display:'block' }}/>
              <p style={{ color:'var(--text)', fontSize:16, fontWeight:700, marginBottom:6 }}>No stocks yet</p>
              <p style={{ color:'var(--muted)', fontSize:13, marginBottom:22, lineHeight:1.5 }}>
                Your executed orders will appear here.<br/>Pending orders show in Orders page.
              </p>
              <Link to="/trade" className="btn btn-green" style={{ fontSize:13 }}><Plus size={14}/> Buy stocks</Link>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
              {/* Header */}
              <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr', gap:8, padding:'10px 20px', background:'#fafafa', borderBottom:'1px solid var(--border)' }}>
                {['STOCK','QTY','AVG COST','LTP','P&L',''].map(h => (
                  <p key={h} style={{ fontSize:10, color:'var(--muted)', fontWeight:700, letterSpacing:'0.5px' }}>{h}</p>
                ))}
              </div>

              {enriched.map((h, i) => {
                const pos = h.pl >= 0;
                return (
                  <div key={h.id||i}
                    style={{ display:'grid', gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr auto', gap:8, padding:'14px 20px', borderBottom: i<enriched.length-1?'1px solid var(--border)':'none', alignItems:'center', transition:'background 0.1s', cursor:'default' }}
                    onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{h.name.replace('.NS','')}</p>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{h.symbol}</p>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, fontFamily:'var(--mono)', color:'var(--text)' }}>{h.qty}</p>
                    <p style={{ fontSize:13, fontFamily:'var(--mono)', color:'var(--text2)' }}>₹{FMT(h.avgPrice)}</p>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                        {h.livePrice ? `₹${FMT(h.livePrice)}` : '—'}
                      </p>
                      {h.liveChg != null && (
                        <p style={{ fontSize:10, fontWeight:600, color:h.liveChg>=0?'var(--green-d)':'var(--red)' }}>
                          {h.liveChg>=0?'▲':'▼'} {Math.abs(h.liveChg).toFixed(2)}%
                        </p>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:pos?'var(--green-d)':'var(--red)' }}>
                        {pos?'+':'-'}{INR(Math.abs(h.pl))}
                      </p>
                      <p style={{ fontSize:10, fontWeight:600, color:pos?'var(--green-d)':'var(--red)' }}>
                        {pos?'+':''}{h.plPct.toFixed(2)}%
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/trade?sell=${encodeURIComponent(h.symbol)}`)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'var(--red-lt)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--red)'; e.currentTarget.style.color='#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='var(--red-lt)'; e.currentTarget.style.color='var(--red)'; }}>
                      Sell
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Note about pending orders */}
        <div style={{ marginTop:16, padding:'12px 16px', background:'#fffbeb', border:'1px solid rgba(244,161,0,0.2)', borderRadius:'var(--r)', fontSize:12, color:'#92400e', lineHeight:1.6 }}>
          💡 <strong>Note:</strong> Orders placed show as PENDING in the Orders page. Once the backend executes them (when market opens & price conditions are met), they appear here in your portfolio.
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
