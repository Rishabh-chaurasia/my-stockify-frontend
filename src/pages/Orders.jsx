import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Clock, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, Info, AlertCircle, Package,
  TrendingUp, TrendingDown, Trash2
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getOrders, getStockData, getMarketStatus, deleteOrder } from '../lib/api';

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);
const fmtDate = s => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}); }
  catch { return '—'; }
};

const STATUS_STYLE = {
  PENDING:   { label:'Pending',   bg:'#fffbeb', border:'rgba(244,161,0,0.35)',   text:'#92400e', dot:'#f4a100', Icon:Clock       },
  EXECUTED:  { label:'Executed',  bg:'#f0fdf4', border:'rgba(0,183,134,0.35)',   text:'#065f46', dot:'#00b386', Icon:CheckCircle },
  CANCELLED: { label:'Cancelled', bg:'#f8fafc', border:'rgba(148,163,184,0.35)', text:'#475569', dot:'#94a3b8', Icon:XCircle     },
};

const TABS = ['ALL','PENDING','EXECUTED'];

function StatCard({ label, value, color, bg, borderColor }) {
  return (
    <div style={{ flex:'1 1 0', minWidth:90, padding:'14px 16px', background:bg||'#fff', border:`1px solid ${borderColor||'var(--border)'}`, borderRadius:'var(--r-md)', boxShadow:'var(--shadow-xs)' }}>
      <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)', color:color||'var(--text)', letterSpacing:'-0.5px' }}>{value}</p>
    </div>
  );
}

export default function Orders() {
  const { username } = useAuth();
  const [data,     setData]     = useState({ orders:[], totalOrders:0, pendingOrders:0, executedOrders:0 });
  const [livePx,   setLivePx]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('ALL');
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const market = getMarketStatus();

  const load = useCallback(async (quiet = false) => {
    if (!username) return;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const result = await getOrders(username, 'ALL');
      setData(result);
      const pending = result.orders.filter(o => o.status === 'PENDING');
      const syms = [...new Set(pending.map(o=>o.symbol).filter(Boolean))];
      if (syms.length > 0) {
        const r = {};
        await Promise.allSettled(syms.map(async s => {
          try { const d = await getStockData(s,'1d','1m'); if(d?.meta?.price) r[s]=d.meta.price; } catch {}
        }));
        setLivePx(r);
      }
    } catch(e) { setError(e.message || 'Failed to load orders.'); }
    setLoading(false);
  }, [username]);

  useEffect(() => {
    load();
    const iv = setInterval(() => load(true), 30000);
    return () => clearInterval(iv);
  }, [load]);

  const handleDelete = async (orderId) => {
    if (!window.confirm('Delete this order?')) return;
    setDeleting(orderId);
    try {
      await deleteOrder(username, orderId);
      await load(true);
    } catch (e) {
      alert(e.message || 'Failed to delete order');
    }
    setDeleting(null);
  };

  const shown = tab==='ALL' ? data.orders : data.orders.filter(o => o.status === tab);

  // Empty state
  if (!loading && !error && data.totalOrders === 0) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <Header/>
        <main className="page" style={{ maxWidth:720 }}>
          <div className="fade-up" style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:80,height:80,borderRadius:'50%',background:'var(--green-lt)',margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Package size={36} color="var(--green-d)"/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:8 }}>No orders yet</h2>
            <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.7, marginBottom:28 }}>
              Place your first buy or sell order from the <strong>Trade</strong> or <strong>Search</strong> page.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <a href="/trade" className="btn btn-green" style={{ padding:'11px 24px', fontSize:14 }}>Go to Trade</a>
              <a href="/stocks" className="btn btn-outline" style={{ padding:'11px 24px', fontSize:14 }}>Search Stocks</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:760 }}>

        {/* Header */}
        <div className="fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:4 }}>Orders</h1>
            <p style={{ fontSize:13, color:'var(--muted)' }}>All your buy & sell orders with live status</p>
          </div>
          <button onClick={() => load()} disabled={loading}
            style={{ width:38,height:38,border:'1.5px solid var(--border)',background:'#fff',borderRadius:'var(--r)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
            <RefreshCw size={14} color="var(--text2)" style={{ animation:loading?'spin 0.8s linear infinite':'none' }}/>
          </button>
        </div>

        {/* Stats */}
        <div className="fade-up" style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <StatCard label="Total" value={data.totalOrders} />
          <StatCard label="Pending" value={data.pendingOrders} color="#92400e" bg="#fffbeb" borderColor="rgba(244,161,0,0.3)" />
          <StatCard label="Executed" value={data.executedOrders} color="#065f46" bg="#f0fdf4" borderColor="rgba(0,183,134,0.3)" />
        </div>

        {/* Market status */}
        <div className="fade-up" style={{ background:market.open?'#f0fdf4':'#fffbeb', border:`1px solid ${market.open?'rgba(0,183,134,0.2)':'rgba(244,161,0,0.2)'}`, borderRadius:'var(--r)', padding:'11px 16px', marginBottom:12, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:market.color,display:'inline-block',flexShrink:0,animation:market.open?'pulse 2s ease infinite':'none' }}/>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:13, fontWeight:600, color:market.open?'#065f46':'#92400e' }}>{market.label}</span>
            {!market.open && data.pendingOrders > 0 && <span style={{ fontSize:12, color:'#92400e', marginLeft:8 }}>· {data.pendingOrders} order{data.pendingOrders!==1?'s':''} pending for next open</span>}
            {market.open  && data.pendingOrders > 0 && <span style={{ fontSize:12, color:'#065f46', marginLeft:8 }}>· Checking {data.pendingOrders} pending order{data.pendingOrders!==1?'s':''} every 10s</span>}
          </div>
        </div>

        {/* Info */}
        <div className="fade-up" style={{ background:'var(--blue-lt)', border:'1px solid rgba(83,103,255,0.15)', borderRadius:'var(--r)', padding:'11px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
          <Info size={14} color="var(--blue)" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:12, color:'#1e3a8a', lineHeight:1.6 }}>
            <strong>MARKET</strong> orders execute immediately during 9:15 AM–3:30 PM IST. After hours → PENDING.&nbsp;
            <strong>LIMIT</strong> orders execute when live price ≤ your limit price.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="fade-up" style={{ background:'var(--red-lt)', border:'1px solid rgba(235,87,87,0.3)', borderRadius:'var(--r)', padding:'14px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
            <AlertCircle size={16} color="var(--red)" style={{ flexShrink:0 }}/>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>{error}</p>
            </div>
            <button onClick={() => load()} style={{ fontSize:12, color:'var(--red)', fontWeight:600, background:'rgba(235,87,87,0.1)', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:'var(--r-sm)' }}>Retry</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {TABS.map(t => {
            const count = t==='ALL'?data.totalOrders : t==='PENDING'?data.pendingOrders : data.executedOrders;
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'7px 18px', borderRadius:20, border:active?'none':'1.5px solid var(--border)', fontSize:13, fontWeight:active?700:400, cursor:'pointer', flexShrink:0, background:active?'var(--green)':'#fff', color:active?'#fff':'var(--text2)', transition:'all 0.15s' }}>
                {t}{count > 0 && <span style={{ marginLeft:5, opacity:0.85, fontSize:11 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading && data.orders.length === 0 ? (
          Array(4).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:76, borderRadius:'var(--r-md)', marginBottom:8 }}/>)
        ) : shown.length === 0 ? (
          <div style={{ textAlign:'center', padding:'56px 20px', background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
            <ClipboardList size={44} color="var(--muted2)" style={{ margin:'0 auto 14px', display:'block' }}/>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{tab==='ALL'?'No orders yet':`No ${tab.toLowerCase()} orders`}</p>
            <p style={{ fontSize:13, color:'var(--muted)' }}>{tab==='ALL'?'Place orders from Trade or Search':'Switch to ALL tab to see other orders'}</p>
          </div>
        ) : (
          <div>
            {shown.map((o, idx) => {
              const key     = o.id ?? idx;
              const isOpen  = expanded === key;
              const sym     = (o.symbol||'').replace('.NS','');
              const st      = STATUS_STYLE[o.status] || STATUS_STYLE.PENDING;
              const StIc    = st.Icon;
              const live    = livePx[o.symbol];
              const isPending = o.status === 'PENDING';
              const isSell  = o.type === 'SELL';
              const displayPrice = o.executedPrice || o.limitPrice || o.price || 0;
              const total   = displayPrice * (o.quantity || 0);
              const limitMet = isPending && o.orderType==='LIMIT' && live!=null && live<=(o.limitPrice||o.price);

              return (
                <div key={key} className="fade-in"
                  style={{ background:'#fff', border:`1px solid ${isOpen?'var(--border2)':'var(--border)'}`, borderRadius:'var(--r-md)', marginBottom:8, overflow:'hidden', boxShadow:isOpen?'var(--shadow-sm)':'var(--shadow-xs)', transition:'all 0.15s' }}>

                  <button onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ width:'100%', display:'flex', alignItems:'center', padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', gap:12, textAlign:'left' }}>

                    {/* Status icon */}
                    <div style={{ width:40,height:40,borderRadius:10,background:st.bg,border:`1px solid ${st.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <StIc size={18} color={st.dot}/>
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sym}</span>

                        {/* BUY / SELL type badge */}
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4,
                          background: isSell ? 'var(--red-lt)' : 'var(--green-lt)',
                          color: isSell ? 'var(--red)' : 'var(--green-d)',
                          border: `1px solid ${isSell ? 'rgba(235,87,87,0.3)' : 'rgba(0,183,134,0.3)'}`,
                        }}>
                          {isSell ? '▼ SELL' : '▲ BUY'}
                        </span>

                        {/* Status badge */}
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:st.bg, color:st.text, border:`1px solid ${st.border}` }}>
                          {st.label}
                        </span>

                        <span style={{ fontSize:11, color:'var(--muted)', background:'var(--bg)', padding:'1px 7px', borderRadius:4 }}>
                          {o.orderType}
                        </span>

                        {limitMet && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:'var(--green-lt)', color:'var(--green-d)', border:'1px solid rgba(0,183,134,0.3)' }}>
                            ✓ Condition Met
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize:12, color:'var(--muted)' }}>
                        {o.quantity} share{o.quantity!==1?'s':''} · {fmtDate(o.createdAt)}
                      </p>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign:'right', flexShrink:0, marginRight:6 }}>
                      <p style={{ fontSize:15, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', marginBottom:2 }}>₹{FMT(displayPrice)}</p>
                      {total > 0 && <p style={{ fontSize:11, color:'var(--muted)' }}>{INR(total)}</p>}
                      {live != null && isPending && (
                        <p style={{ fontSize:11, fontWeight:600, color:limitMet?'var(--green-d)':'#f4a100' }}>Live ₹{FMT(live)}</p>
                      )}
                    </div>

                    {isOpen ? <ChevronUp size={14} color="var(--muted)"/> : <ChevronDown size={14} color="var(--muted)"/>}
                  </button>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ padding:'0 18px 20px', borderTop:'1px solid var(--border)' }}>

                      {/* Pending context */}
                      {isPending && (
                        <div style={{ margin:'14px 0 16px', padding:'14px 16px', borderRadius:'var(--r)', background:market.open?'var(--green-lt)':'#fffbeb', border:`1px solid ${market.open?'rgba(0,183,134,0.25)':'rgba(244,161,0,0.25)'}` }}>
                          <p style={{ fontSize:13, fontWeight:600, color:market.open?'#065f46':'#92400e', marginBottom:o.orderType==='LIMIT'&&live!=null?8:0 }}>
                            {market.open ? '🔄 Market Open — checking every 10 seconds' : '⏰ Market Closed — executes when market opens at 9:15 AM IST'}
                          </p>
                          {o.orderType === 'LIMIT' && live != null && (
                            <>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
                                <span style={{ color:'var(--muted)' }}>Your limit price</span>
                                <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)' }}>₹{FMT(o.limitPrice||o.price)}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
                                <span style={{ color:'var(--muted)' }}>Current market price</span>
                                <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)' }}>₹{FMT(live)}</span>
                              </div>
                              <div style={{ height:5, background:'var(--border)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                                <div style={{ height:'100%', width:`${Math.min(100,Math.max(5,((o.limitPrice||o.price)/live)*100))}%`, background:limitMet?'var(--green-d)':'#f4a100', borderRadius:4, transition:'width 0.4s' }}/>
                              </div>
                              <p style={{ fontSize:12, fontWeight:600, color:limitMet?'#065f46':'#92400e' }}>
                                {limitMet ? '✅ Condition met — will execute in next scheduler run' : `₹${FMT(((live-(o.limitPrice||o.price))).toFixed(2))} above limit`}
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Detail grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginTop:isPending?0:14 }}>
                        {[
                          { k:'Action',      v: isSell ? '🔴 SELL' : '🟢 BUY' },
                          { k:'Order Type',  v: o.orderType },
                          { k:'Quantity',    v: `${o.quantity} shares` },
                          { k:'Status',      v: o.status },
                          { k:'Order Price', v: `₹${FMT(o.price)}` },
                          { k:'Total Value', v: total > 0 ? INR(total) : '—' },
                        ].map(({ k, v }) => (
                          <div key={k} style={{ background:'var(--bg)', borderRadius:'var(--r-sm)', padding:'10px 12px', border:'1px solid var(--border)' }}>
                            <p style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>{k}</p>
                            <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Delete button */}
                    <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
                      <button onClick={() => handleDelete(o.id)}
                        disabled={deleting === o.id}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', border:'1px solid rgba(235,87,87,0.3)', borderRadius:'var(--r-sm)', background:'var(--red-lt)', color:'var(--red)', fontSize:12, fontWeight:600, cursor:'pointer', opacity: deleting===o.id ? 0.6 : 1 }}>
                        <Trash2 size={12}/>
                        {deleting===o.id ? 'Deleting…' : 'Delete Order'}
                      </button>
                    </div>

                    {/* Executed confirmation */}
                      {o.status === 'EXECUTED' && (
                        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:'var(--r)', background:isSell?'var(--red-lt)':'var(--green-lt)', border:`1px solid ${isSell?'rgba(235,87,87,0.2)':'rgba(0,183,134,0.2)'}`, display:'flex', alignItems:'center', gap:8 }}>
                          <CheckCircle size={15} color={isSell?'var(--red)':'var(--green-d)'}/>
                          <p style={{ fontSize:12, color:isSell?'var(--red)':'#065f46', fontWeight:500 }}>
                            {isSell
                              ? `${o.quantity} share${o.quantity!==1?'s':''} of ${sym} sold · ₹${INR(total)} credited to wallet.`
                              : `${o.quantity} share${o.quantity!==1?'s':''} of ${sym} added to portfolio at ₹${FMT(o.executedPrice||o.price)}.`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height:24 }}/>
      </main>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .btn-outline{background:#fff;border:1.5px solid var(--border2);color:var(--text2);}
        .btn-green{background:var(--green);color:#fff;}
      `}</style>
    </div>
  );
}
