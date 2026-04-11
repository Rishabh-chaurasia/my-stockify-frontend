import React, { useState } from 'react';
import {
  TrendingUp, Search, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, BarChart2, Activity,
  DollarSign, Shield, ChevronDown, ChevronUp, Star
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer
} from 'recharts';
import Header from '../components/Header';

// ── BENCHMARKS ────────────────────────────────────────
const opmMin     = { IT:22, Pharma:25, FMCG:18, Paints:18, Auto:8, Retail:5, Metals:8 };
const peIndustry = { IT:20, FMCG:30, Paints:25, Auto:15, Banks:15, Commodities:8 };
const roaMin     = { IT:20, FMCG:15, Manufacturing:8, Capital:5, Banks:0.8 };

// ── YAHOO FINANCE FETCH (via /yf proxy) ───────────────
const fetchFundamentals = async (symbol) => {
  try {
    const sym = symbol.includes('.') ? symbol : symbol + '.NS';
    const modules = ['financialData','defaultKeyStatistics','summaryDetail','balanceSheetHistory'].join(',');
    const yfUrl = `/yf/v10/finance/quoteSummary/${sym}?modules=${modules}`;
    const res = await fetch(yfUrl, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const r = data?.quoteSummary?.result?.[0];
    if (!r) return null;

    const fd = r.financialData ?? {};
    const ks = r.defaultKeyStatistics ?? {};
    const bs = r.balanceSheetHistory?.balanceSheetStatements?.[0] ?? {};
    const sd = r.summaryDetail ?? {};

    const totalAssets = bs.totalAssets?.raw ?? 0;
    const currLiab    = bs.totalCurrentLiabilities?.raw ?? 0;
    const ebit        = fd.ebitda?.raw ?? 0;
    const ce          = totalAssets - currLiab;
    const roce        = ce > 0 ? parseFloat(((ebit / ce) * 100).toFixed(2)) : 0;

    return {
      name:  r.price?.longName ?? sym,
      price: fd.currentPrice?.raw ?? sd.regularMarketPrice?.raw ?? null,
      data: {
        roe:  parseFloat(((fd.returnOnEquity?.raw  ?? 0) * 100).toFixed(2)),
        roa:  parseFloat(((fd.returnOnAssets?.raw  ?? 0) * 100).toFixed(2)),
        de:   parseFloat((fd.debtToEquity?.raw     ?? 0).toFixed(2)),
        cr:   parseFloat((fd.currentRatio?.raw     ?? 0).toFixed(2)),
        pe:   parseFloat((sd.trailingPE?.raw ?? ks.forwardPE?.raw ?? 0).toFixed(2)),
        roce,
      }
    };
  } catch { return null; }
};

// ── SCORING ENGINE ────────────────────────────────────
const runEvaluate = (form) => {
  let score = 0;
  const notes = [];

  if (form.sales1 < 0 || form.sales5 < 0) return { red: 'Negative sales growth detected' };
  score += 0.5;
  if (form.sales1 > form.sales5) score += 0.5;
  notes.push({ text: 'Sales growth is healthy', pass: true });

  if (form.profit1 < 0 || form.profit5 < 0) return { red: 'Negative profit growth detected' };
  score += 0.5;
  if (form.profit1 > form.profit5) score += 0.5;
  notes.push({ text: 'Profit growth is positive', pass: true });

  const minOPM = opmMin[form.sector] || 10;
  if (form.opm1 >= minOPM && form.opm5 >= minOPM) score += 0.5;
  if (form.opm1 > form.opm5) score += 0.5;
  notes.push({ text: 'Operating margin is efficient', pass: form.opm1 >= minOPM });

  if (form.roe > 20) score += 0.5; else if (form.roe > 10) score += 0.25;
  if (form.roe1 > form.roe5) score += 0.5;
  notes.push({ text: 'Return on Equity is satisfactory', pass: form.roe > 15 });

  if (form.roce > 15) score += 0.5; else if (form.roce > 10) score += 0.25;
  if (form.roce1 > form.roce5) score += 0.25;
  if (form.roce >= form.roe) score += 0.25;
  notes.push({ text: 'Return on Capital Employed is efficient', pass: form.roce > 15 });

  if (form.de > 1.25) return { red: 'High debt — D/E ratio exceeds safe threshold' };
  if (form.de < 0.5) score += 1; else score += 0.5;

  if (form.cr < 1) return { red: 'Liquidity risk — Current ratio below 1' };
  if (form.cr > 2) score += 1; else score += 0.5;

  if (form.ic > 10) score += 1;
  else if (form.ic >= 5) score += 0.5;
  else if (form.ic >= 3) score += 0.25;

  const industryPE = peIndustry[form.sector] || 15;
  const x = form.pe / industryPE;
  if (x > 3) return { red: 'Stock appears significantly overvalued vs industry' };
  if (x >= 0.8 && x <= 2) score += 1;
  else if (x <= 2.5) score += 0.5;
  else if (x <= 3) score += 0.25;

  const minROA = roaMin[form.sector] || 5;
  if (form.roa >= minROA) score += 0.5;
  if (form.roa1 > form.roa5) score += 0.5;

  const verdict =
    score >= 8.5 ? 'Exceptional' :
    score >= 7.5 ? 'Excellent'   :
    score >= 6.5 ? 'Good'        : 'Avoid';

  const radarData = [
    { metric: 'Sales',  value: Math.min(((form.sales1 + form.sales5) / 2 / 30) * 10, 10) },
    { metric: 'Profit', value: Math.min(((form.profit1 + form.profit5) / 2 / 30) * 10, 10) },
    { metric: 'ROE',    value: Math.min((form.roe / 25) * 10, 10) },
    { metric: 'ROCE',   value: Math.min((form.roce / 25) * 10, 10) },
    { metric: 'D/E',    value: Math.max(10 - (form.de * 5), 0) },
    { metric: 'PE',     value: Math.max(10 - (x * 3), 0) },
  ];

  return { score: score.toFixed(2), verdict, notes, radarData };
};

// ── VERDICT CONFIG — using Stockify CSS vars ──────────
const VC = {
  Exceptional: { bg:'var(--green-lt)',  border:'rgba(0,183,134,0.3)',  text:'var(--green-d)',  bar:'var(--green)',   radarColor:'#00b386' },
  Excellent:   { bg:'var(--blue-lt)',   border:'rgba(83,103,255,0.3)', text:'var(--blue)',     bar:'var(--blue)',    radarColor:'#5367ff' },
  Good:        { bg:'var(--yellow-lt)', border:'rgba(244,161,0,0.3)',  text:'#92400e',         bar:'#f4a100',        radarColor:'#f4a100' },
  Avoid:       { bg:'var(--red-lt)',    border:'rgba(235,87,87,0.3)',  text:'var(--red)',      bar:'var(--red)',     radarColor:'#eb5757' },
};

// ── SUB-COMPONENTS ────────────────────────────────────
function MetricGroup({ icon: Icon, title, accent, children }) {
  return (
    <div style={{ border:`1px solid ${accent}33`, borderRadius:'var(--r-md)', padding:'16px', marginBottom:12, background:`${accent}08` }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, fontSize:13, fontWeight:600, color:accent }}>
        <Icon size={14}/> {title}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder='', hint='' }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:5, fontWeight:500 }}>{label}</label>
      <input
        name={name} value={value ?? ''} onChange={onChange}
        placeholder={placeholder} type="number"
        style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', background:'#fff', boxSizing:'border-box', outline:'none', transition:'border-color 0.15s, box-shadow 0.15s' }}
        onFocus={e => { e.target.style.borderColor='var(--green)'; e.target.style.boxShadow='0 0 0 3px var(--green-mid)'; }}
        onBlur={e  => { e.target.style.borderColor='var(--border2)'; e.target.style.boxShadow='none'; }}
      />
      {hint && <span style={{ fontSize:10, color:'var(--green-d)', marginTop:3, display:'block' }}>{hint}</span>}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────
export default function Analysis() {
  const [form,    setForm]    = useState({});
  const [result,  setResult]  = useState(null);
  const [symbol,  setSymbol]  = useState('');
  const [loading, setLoading] = useState(false);
  const [stockInfo, setInfo]  = useState(null);
  const [note,    setNote]    = useState('');
  const [showAdv, setShowAdv] = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  const handle = e => setForm({ ...form, [e.target.name]: Number(e.target.value) });

  const fetchData = async () => {
    if (!symbol.trim()) return;
    setLoading(true); setFetchErr(''); setInfo(null);
    const info = await fetchFundamentals(symbol.trim());
    if (info) {
      setInfo(info);
      setForm(prev => ({ ...prev, ...info.data }));
    } else {
      setFetchErr('Could not fetch data. You can still enter values manually.');
    }
    setLoading(false);
  };

  const analyze = () => setResult(runEvaluate(form));
  const reset   = () => { setForm({}); setResult(null); setSymbol(''); setInfo(null); setNote(''); setFetchErr(''); };

  const vc = result?.verdict ? VC[result.verdict] : null;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>

      {/* Page header */}
      <div style={{ background:'linear-gradient(135deg,#f0fff9,#f0f2ff)', borderBottom:'1px solid var(--border)', padding:'28px 24px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,var(--green),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BarChart2 size={18} color="#fff"/>
                </div>
                <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>Fundamental Analysis</h1>
              </div>
              <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
                Score stocks using key financial ratios. Auto-fills from Yahoo Finance.
              </p>
            </div>
            <button onClick={reset}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', border:'1.5px solid var(--border2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text2)', background:'#fff', cursor:'pointer' }}>
              <RefreshCw size={13}/> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <main style={{ maxWidth:1100, margin:'0 auto', padding:'24px 24px 80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

        {/* ══ LEFT — INPUTS ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Stock search */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-xs)' }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <Search size={14} color="var(--green)"/> Search Stock
            </h2>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && fetchData()}
                placeholder="e.g. TCS, RELIANCE, INFY..."
                style={{ flex:1, padding:'10px 14px', border:'1.5px solid var(--border2)', borderRadius:'var(--r)', fontSize:14, color:'var(--text)', background:'#fff', outline:'none' }}
                onFocus={e => { e.target.style.borderColor='var(--green)'; e.target.style.boxShadow='0 0 0 3px var(--green-mid)'; }}
                onBlur={e  => { e.target.style.borderColor='var(--border2)'; e.target.style.boxShadow='none'; }}
              />
              <button onClick={fetchData} disabled={loading}
                style={{ padding:'10px 18px', background:'var(--green)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:13, fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, display:'flex', alignItems:'center', gap:6, transition:'all 0.15s', flexShrink:0 }}>
                {loading
                  ? <><RefreshCw size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Loading</>
                  : <><Search size={13}/> Fetch</>
                }
              </button>
            </div>

            {/* Stock card */}
            {stockInfo && (
              <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--green-lt)', borderRadius:'var(--r)', border:'1px solid rgba(0,183,134,0.2)' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <TrendingUp size={18} color="#fff"/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stockInfo.name}</p>
                  <p style={{ fontSize:11, color:'var(--green-d)' }}>{symbol.includes('.')?symbol:symbol+'.NS'}</p>
                </div>
                {stockInfo.price && (
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:16, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>₹{stockInfo.price.toLocaleString('en-IN')}</p>
                    <p style={{ fontSize:11, color:'var(--muted)' }}>Current Price</p>
                  </div>
                )}
              </div>
            )}

            {fetchErr && (
              <div style={{ marginTop:10, padding:'9px 13px', background:'var(--yellow-lt)', borderRadius:'var(--r)', border:'1px solid rgba(244,161,0,0.25)', fontSize:12, color:'#92400e' }}>
                ⚠️ {fetchErr}
              </div>
            )}
            <p style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>Key ratios are auto-filled when you search a stock</p>
          </div>

          {/* Sector */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-xs)' }}>
            <label style={{ display:'block', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:10 }}>Sector</label>
            <select name="sector" value={form.sector ?? ''}
              onChange={e => setForm({ ...form, sector: e.target.value })}
              style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border2)', borderRadius:'var(--r)', fontSize:14, color:'var(--text)', background:'#fff', outline:'none' }}>
              <option value="">Select Sector</option>
              {['IT','FMCG','Pharma','Auto','Metals','Banks','Paints','Retail','Commodities'].map(s =>
                <option key={s} value={s}>{s}</option>
              )}
            </select>
          </div>

          {/* Financial metrics */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-xs)' }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Financial Metrics</h2>

            <MetricGroup icon={TrendingUp} title="Growth" accent="#5367ff">
              <Field label="Sales Growth 1Y (%)"  name="sales1"  value={form.sales1}  onChange={handle} placeholder="e.g. 15"/>
              <Field label="Sales Growth 5Y (%)"  name="sales5"  value={form.sales5}  onChange={handle} placeholder="e.g. 12"/>
              <Field label="Profit Growth 1Y (%)" name="profit1" value={form.profit1} onChange={handle} placeholder="e.g. 20"/>
              <Field label="Profit Growth 5Y (%)" name="profit5" value={form.profit5} onChange={handle} placeholder="e.g. 18"/>
            </MetricGroup>

            <MetricGroup icon={BarChart2} title="Profitability" accent="#7c3aed">
              <Field label="OPM 1Y (%)" name="opm1" value={form.opm1} onChange={handle} placeholder="e.g. 24"/>
              <Field label="OPM 5Y (%)" name="opm5" value={form.opm5} onChange={handle} placeholder="e.g. 22"/>
            </MetricGroup>

            <MetricGroup icon={Activity} title="Return Ratios" accent="#00b386">
              <Field label="ROE (%)"  name="roe"  value={form.roe}  onChange={handle} placeholder="e.g. 22" hint={form.roe  ? '✓ auto-filled' : ''}/>
              <Field label="ROCE (%)" name="roce" value={form.roce} onChange={handle} placeholder="e.g. 25" hint={form.roce ? '✓ auto-filled' : ''}/>
              <Field label="ROA (%)"  name="roa"  value={form.roa}  onChange={handle} placeholder="e.g. 18" hint={form.roa  ? '✓ auto-filled' : ''}/>
              <div/>
              <button onClick={() => setShowAdv(!showAdv)}
                style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--green-d)', background:'none', border:'none', cursor:'pointer', fontWeight:500, padding:'4px 0' }}>
                {showAdv ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                {showAdv ? 'Hide' : 'Show'} 1Y / 5Y trend fields
              </button>
              {showAdv && <>
                <Field label="ROE 1Y"  name="roe1"  value={form.roe1}  onChange={handle} placeholder="e.g. 22"/>
                <Field label="ROE 5Y"  name="roe5"  value={form.roe5}  onChange={handle} placeholder="e.g. 18"/>
                <Field label="ROCE 1Y" name="roce1" value={form.roce1} onChange={handle} placeholder="e.g. 25"/>
                <Field label="ROCE 5Y" name="roce5" value={form.roce5} onChange={handle} placeholder="e.g. 20"/>
                <Field label="ROA 1Y"  name="roa1"  value={form.roa1}  onChange={handle} placeholder="e.g. 18"/>
                <Field label="ROA 5Y"  name="roa5"  value={form.roa5}  onChange={handle} placeholder="e.g. 15"/>
              </>}
            </MetricGroup>

            <MetricGroup icon={Shield} title="Debt & Liquidity" accent="#ea580c">
              <Field label="Debt / Equity"    name="de" value={form.de} onChange={handle} placeholder="e.g. 0.3" hint={form.de ? '✓ auto-filled' : ''}/>
              <Field label="Current Ratio"    name="cr" value={form.cr} onChange={handle} placeholder="e.g. 2.5" hint={form.cr ? '✓ auto-filled' : ''}/>
              <Field label="Interest Coverage" name="ic" value={form.ic} onChange={handle} placeholder="e.g. 12"/>
            </MetricGroup>

            <MetricGroup icon={DollarSign} title="Valuation" accent="#f4a100">
              <Field label="PE Ratio" name="pe" value={form.pe} onChange={handle} placeholder="e.g. 22" hint={form.pe ? '✓ auto-filled' : ''}/>
            </MetricGroup>

            <button onClick={analyze}
              style={{ width:'100%', padding:'14px 0', background:'linear-gradient(135deg,var(--green),var(--blue))', color:'#fff', border:'none', borderRadius:'var(--r-md)', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 16px rgba(0,208,156,0.3)', marginTop:4, transition:'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              <Activity size={16}/> Run Fundamental Analysis
            </button>
          </div>
        </div>

        {/* ══ RIGHT — RESULTS ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Result card */}
          {result ? (
            <div style={{
              background: vc ? vc.bg : 'var(--red-lt)',
              border: `1px solid ${vc ? vc.border : 'rgba(235,87,87,0.3)'}`,
              borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-sm)'
            }}>
              {result.red ? (
                /* Red flag */
                <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                  <div style={{ width:48, height:48, background:'var(--red-lt)', border:'1px solid rgba(235,87,87,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <AlertTriangle size={22} color="var(--red)"/>
                  </div>
                  <div>
                    <p style={{ fontSize:16, fontWeight:700, color:'var(--red)', marginBottom:6 }}>🚩 Red Flag Detected</p>
                    <p style={{ fontSize:14, color:'var(--red)', marginBottom:8 }}>{result.red}</p>
                    <p style={{ fontSize:12, color:'#9b1c1c' }}>Analysis stopped. Please review this metric before proceeding.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Score header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                    <div>
                      <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Fundamental Score</p>
                      <p style={{ fontSize:48, fontWeight:800, fontFamily:'var(--mono)', color: vc?.text, letterSpacing:'-2px', lineHeight:1 }}>
                        {result.score}
                        <span style={{ fontSize:16, fontWeight:400, color:'var(--muted)', fontFamily:'var(--font)' }}> / 10</span>
                      </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', background: vc?.bar, color:'#fff', borderRadius:20, fontSize:13, fontWeight:700, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                        <Star size={12} fill="#fff"/> {result.verdict}
                      </span>
                      {stockInfo?.name && (
                        <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{stockInfo.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ height:6, background:'rgba(255,255,255,0.6)', borderRadius:4, overflow:'hidden', marginBottom:20 }}>
                    <div style={{ height:'100%', width:`${(parseFloat(result.score)/10)*100}%`, background: vc?.bar, borderRadius:4, transition:'width 0.7s ease' }}/>
                  </div>

                  {/* Radar chart */}
                  <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:'var(--r-md)', padding:'14px', marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Metric Overview</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={result.radarData}>
                        <PolarGrid stroke="var(--border2)"/>
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize:11, fill:'var(--text2)' }}/>
                        <Radar dataKey="value" stroke={vc?.radarColor} fill={vc?.radarColor} fillOpacity={0.2} strokeWidth={2}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Key metrics grid */}
                  <div style={{ background:'rgba(255,255,255,0.6)', borderRadius:'var(--r-md)', padding:'14px', marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Key Metrics</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {[
                        { label:'ROE',          value:form.roe,  suffix:'%' },
                        { label:'ROCE',         value:form.roce, suffix:'%' },
                        { label:'ROA',          value:form.roa,  suffix:'%' },
                        { label:'D/E',          value:form.de,   suffix:'x' },
                        { label:'Curr. Ratio',  value:form.cr,   suffix:'x' },
                        { label:'PE Ratio',     value:form.pe,   suffix:'x' },
                      ].map(({ label, value, suffix }) => (
                        <div key={label} style={{ background:'#fff', borderRadius:'var(--r-sm)', padding:'10px', textAlign:'center', border:'1px solid var(--border)' }}>
                          <p style={{ fontSize:10, color:'var(--muted)', marginBottom:4 }}>{label}</p>
                          <p style={{ fontSize:14, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                            {value ?? '—'}{value ? suffix : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Analysis notes */}
                  <div>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Analysis Summary</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {result.notes.map((n, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(255,255,255,0.5)', borderRadius:'var(--r)', fontSize:13 }}>
                          {n.pass
                            ? <CheckCircle size={15} color="var(--green-d)" style={{ flexShrink:0 }}/>
                            : <XCircle    size={15} color="var(--red)"     style={{ flexShrink:0 }}/>
                          }
                          <span style={{ color: n.pass ? 'var(--text)' : 'var(--red)' }}>{n.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Empty state */
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'56px 24px', textAlign:'center', boxShadow:'var(--shadow-xs)' }}>
              <div style={{ width:64, height:64, background:'var(--green-lt)', borderRadius:'var(--r-lg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <BarChart2 size={28} color="var(--green-d)"/>
              </div>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No Analysis Yet</p>
              <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>
                Search a stock to auto-fill financial data,<br/>then click Run Analysis to see results.
              </p>
            </div>
          )}

          {/* Analyst notes */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-xs)' }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <Activity size={14} color="var(--blue)"/> Analyst Notes
            </h2>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Write your investment thesis, concerns, or observations..."
              style={{ width:'100%', height:100, padding:'10px 14px', border:'1.5px solid var(--border2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', background:'#fff', resize:'none', outline:'none', fontFamily:'var(--font)', boxSizing:'border-box', lineHeight:1.6 }}
              onFocus={e => { e.target.style.borderColor='var(--green)'; e.target.style.boxShadow='0 0 0 3px var(--green-mid)'; }}
              onBlur={e  => { e.target.style.borderColor='var(--border2)'; e.target.style.boxShadow='none'; }}
            />
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center', lineHeight:1.6 }}>
            Stockify provides analysis based on user-entered data. This is not financial advice.
            Always consult a financial advisor before making investment decisions.
          </p>
        </div>
      </main>

      {/* Mobile responsive */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
