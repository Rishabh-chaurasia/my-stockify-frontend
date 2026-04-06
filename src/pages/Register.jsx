import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, ChevronRight, ChevronLeft, MapPin, Check, User, FileText, Shield, Lock } from 'lucide-react';
import { register } from '../lib/api';

const INCOME_RANGES = ['Upto 1L','1-5L','5-10L','10-25L','25-50L','50L-1Cr'];
const OCCUPATIONS   = ['Salaried','Self Employed','Student','Business','Retired','Unemployed'];
const MARITAL       = ['Single','Married','Divorced','Widowed'];
const GENDERS       = ['Male','Female','Other'];
const STATES        = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','U.P.','Uttarakhand','West Bengal'];

const F = { width:'100%', padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, boxSizing:'border-box' };
const L = { fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase' };

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={L}>{label}</label>
      {children}
      {error && <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>{error}</p>}
    </div>
  );
}

function AddressBlock({ prefix, title, form, onChange }) {
  return (
    <div style={{ background:'var(--bg)', borderRadius:12, padding:'14px 16px', marginBottom:14, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
        <div style={{ width:26, height:26, borderRadius:7, background:'var(--blue-dim)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MapPin size={12} color="var(--blue)"/>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{title}</span>
      </div>
      <Field label="Address Line 1">
        <input style={F} placeholder="House/Flat No., Street, Area"
          value={form[`${prefix}Address`]||''} onChange={e => onChange(`${prefix}Address`, e.target.value)}/>
      </Field>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Field label="City">
          <input style={F} placeholder="City"
            value={form[`${prefix}City`]||''} onChange={e => onChange(`${prefix}City`, e.target.value)}/>
        </Field>
        <Field label="Pincode">
          <input style={F} placeholder="110001" maxLength={6}
            value={form[`${prefix}Pincode`]||''} onChange={e => onChange(`${prefix}Pincode`, e.target.value)}/>
        </Field>
      </div>
      <Field label="State">
        <select style={F} value={form[`${prefix}State`]||''} onChange={e => onChange(`${prefix}State`, e.target.value)}>
          <option value="">Select state</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
    </div>
  );
}

const STEPS = [
  { label:'Account',  icon:User     },
  { label:'Personal', icon:FileText },
  { label:'KYC',      icon:Shield   },
  { label:'Security', icon:Lock     },
];

export default function Register() {
  const navigate  = useNavigate();
  const [step,     setStep]    = useState(1);
  const [form,     setForm]    = useState({});
  const [showP,    setShowP]   = useState(false);
  const [showC,    setShowC]   = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [sameAddr, setSameAddr]= useState(false);

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const bind = e => set(e.target.name, e.target.value);

  const handleSameAddr = checked => {
    setSameAddr(checked);
    if (checked) setForm(p => ({ ...p,
      currentAddress: p.permanentAddress, currentCity: p.permanentCity,
      currentState: p.permanentState, currentPincode: p.permanentPincode,
    }));
  };

  const validate = () => {
    if (step === 1) {
      if (!form.username?.trim())                              return 'Username is required';
      if (!form.name?.trim())                                  return 'Full name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))    return 'Enter a valid email';
      if (!/^\d{10}$/.test(form.phone))                       return 'Phone must be 10 digits';
    }
    if (step === 2) {
      if (!form.dob)           return 'Date of birth is required';
      if (!form.gender)        return 'Gender is required';
      if (!form.fatherName?.trim()) return 'Father\'s name is required';
      if (!form.occupation)    return 'Occupation is required';
      if (!form.maritalStatus) return 'Marital status is required';
      if (!form.incomeRange)   return 'Income range is required';
    }
    if (step === 3) {
      if (!/^\d{12}$/.test(form.aadhaar))                               return 'Aadhaar must be 12 digits';
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan?.toUpperCase()))    return 'Invalid PAN (e.g. ABCDE1234F)';
      if (!form.permanentAddress || !form.permanentCity || !form.permanentState || !form.permanentPincode)
        return 'Complete permanent address is required';
      if (!/^\d{6}$/.test(form.permanentPincode)) return 'Pincode must be 6 digits';
      if (!sameAddr) {
        if (!form.currentAddress || !form.currentCity || !form.currentState || !form.currentPincode)
          return 'Complete current address is required';
        if (!/^\d{6}$/.test(form.currentPincode)) return 'Current pincode must be 6 digits';
      }
    }
    if (step === 4) {
      if (!form.password || form.password.length < 8)   return 'Password must be at least 8 characters';
      if (!/[A-Z]/.test(form.password))                  return 'Password needs an uppercase letter';
      if (!/[a-z]/.test(form.password))                  return 'Password needs a lowercase letter';
      if (!/[0-9]/.test(form.password))                  return 'Password needs a number';
      if (!/[^A-Za-z0-9]/.test(form.password))           return 'Password needs a special character';
      if (form.password !== form.confirmPassword)         return 'Passwords do not match';
    }
    return null;
  };

  const next = () => {
    const err = validate(); if (err) { setError(err); return; }
    setError(''); setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      await register(form);
      navigate('/login', { state: { message: '🎉 Account created! Sign in to start trading.' } });
    } catch (e) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  // Password strength
  const pw = form.password || '';
  const strength = [pw.length>=8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const strengthLabel = ['','Weak','Fair','Good','Strong','Very strong'][strength];
  const strengthColor = ['','var(--red)','var(--yellow)','#fb923c','var(--green)','var(--green)'][strength];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px 60px' }}>
      
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrendingUp size={17} color="white" strokeWidth={2.5}/>
        </div>
        <span style={{ fontSize:19, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px' }}>Stockify</span>
      </div>

      <div style={{ width:'100%', maxWidth:520 }}>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
          {STEPS.map((s, i) => {
            const done   = step > i + 1;
            const active = step === i + 1;
            const Icon   = s.icon;
            return (
              <React.Fragment key={i}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:5 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface)',
                    border: active ? '2px solid rgba(59,130,246,0.5)' : done ? 'none' : '1px solid var(--border)',
                    transition:'all 0.2s',
                  }}>
                    {done
                      ? <Check size={15} color="white" strokeWidth={3}/>
                      : <Icon size={14} color={active ? 'white' : 'var(--muted)'}/>
                    }
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.3px', color: active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--muted)' }}>
                    {s.label.toUpperCase()}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex:1, height:2, background: step > i + 1 ? 'var(--green)' : 'var(--border)', borderRadius:1, margin:'0 4px', marginBottom:20, transition:'background 0.3s' }}/>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div style={{ background:'var(--surface)', borderRadius:18, border:'1px solid var(--border)', overflow:'hidden' }}>
          
          {/* Card header */}
          <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)' }}>
            <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:3 }}>
              {['Account Information','Personal Details','KYC & Address','Set Password'][step-1]}
            </h2>
            <p style={{ fontSize:12, color:'var(--muted)' }}>
              {['Enter your basic account details','Tell us about yourself','Verify your identity and address','Secure your account'][step-1]}
            </p>
          </div>

          <div style={{ padding:'20px 24px 24px' }}>
            {/* Error */}
            {error && (
              <div style={{ background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'11px 14px', marginBottom:16, fontSize:13, color:'var(--red)' }}>
                {error}
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                <Field label="Username *">
                  <input name="username" style={F} placeholder="e.g. rishabh123" autoCapitalize="none" autoCorrect="off"
                    value={form.username||''} onChange={bind}/>
                </Field>
                <Field label="Full Name *">
                  <input name="name" style={F} placeholder="Rishabh Chaurasia"
                    value={form.name||''} onChange={bind}/>
                </Field>
                <Field label="Email Address *">
                  <input name="email" type="email" style={F} placeholder="you@email.com"
                    value={form.email||''} onChange={bind}/>
                </Field>
                <Field label="Phone Number *">
                  <input name="phone" style={F} placeholder="10-digit mobile number" maxLength={10}
                    value={form.phone||''} onChange={bind}/>
                </Field>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="Date of Birth *">
                    <input name="dob" type="date" style={F} value={form.dob||''} onChange={bind}/>
                  </Field>
                  <Field label="Gender *">
                    <select name="gender" style={F} value={form.gender||''} onChange={bind}>
                      <option value="">Select</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Father's Name *">
                  <input name="fatherName" style={F} placeholder="Father's full name" value={form.fatherName||''} onChange={bind}/>
                </Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="Occupation *">
                    <select name="occupation" style={F} value={form.occupation||''} onChange={bind}>
                      <option value="">Select</option>
                      {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Marital Status *">
                    <select name="maritalStatus" style={F} value={form.maritalStatus||''} onChange={bind}>
                      <option value="">Select</option>
                      {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Annual Income Range *">
                  <select name="incomeRange" style={F} value={form.incomeRange||''} onChange={bind}>
                    <option value="">Select range</option>
                    {INCOME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="Aadhaar Number *">
                    <input name="aadhaar" style={F} placeholder="12-digit number" maxLength={12}
                      value={form.aadhaar||''} onChange={bind}/>
                  </Field>
                  <Field label="PAN Number *">
                    <input name="pan" style={F} placeholder="ABCDE1234F" maxLength={10}
                      value={form.pan||''} onChange={e => set('pan', e.target.value.toUpperCase())}/>
                  </Field>
                </div>
                <AddressBlock prefix="permanent" title="Permanent Address" form={form} onChange={set}/>
                <label style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14, cursor:'pointer' }}>
                  <div onClick={() => handleSameAddr(!sameAddr)} style={{
                    width:18, height:18, borderRadius:5, border:`2px solid ${sameAddr ? 'var(--blue)' : 'var(--border)'}`,
                    background: sameAddr ? 'var(--blue)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s',
                  }}>
                    {sameAddr && <Check size={11} color="white" strokeWidth={3}/>}
                  </div>
                  <span style={{ fontSize:13, color:'var(--muted)' }}>Current address same as permanent</span>
                </label>
                {!sameAddr && <AddressBlock prefix="current" title="Current Address" form={form} onChange={set}/>}
              </>
            )}

            {/* ── STEP 4 ── */}
            {step === 4 && (
              <>
                <Field label="Password *">
                  <div style={{ position:'relative' }}>
                    <input name="password" type={showP?'text':'password'} style={{ ...F, paddingRight:46 }}
                      placeholder="Min 8 chars with A-Z a-z 0-9 !@#"
                      value={form.password||''} onChange={bind}/>
                    <button type="button" onClick={() => setShowP(!showP)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4 }}>
                      {showP ? <EyeOff size={17}/> : <Eye size={17}/>}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {pw.length > 0 && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ flex:1, height:3, borderRadius:2, background: strength>=n ? strengthColor : 'var(--border)', transition:'background 0.2s' }}/>
                        ))}
                      </div>
                      <p style={{ fontSize:11, color:strengthColor, fontWeight:600 }}>{strengthLabel}</p>
                    </div>
                  )}
                </Field>
                <Field label="Confirm Password *">
                  <div style={{ position:'relative' }}>
                    <input name="confirmPassword" type={showC?'text':'password'} style={{ ...F, paddingRight:46 }}
                      placeholder="Repeat your password"
                      value={form.confirmPassword||''} onChange={bind}/>
                    <button type="button" onClick={() => setShowC(!showC)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4 }}>
                      {showC ? <EyeOff size={17}/> : <Eye size={17}/>}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>Passwords do not match</p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p style={{ fontSize:11, color:'var(--green)', marginTop:4, display:'flex', alignItems:'center', gap:4 }}>
                      <Check size={11}/> Passwords match
                    </p>
                  )}
                </Field>

                {/* Virtual balance teaser */}
                <div style={{ background:'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(59,130,246,0.08))', border:'1px solid rgba(34,197,94,0.2)', borderRadius:12, padding:'14px 16px', marginTop:4 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--green)', marginBottom:4 }}>🎉 Welcome bonus</p>
                  <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>
                    You'll receive <strong style={{ color:'var(--text)' }}>₹10,000 virtual balance</strong> after registration to start practising trades immediately.
                  </p>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div style={{ display:'flex', gap:10, marginTop:22 }}>
              {step > 1 && (
                <button onClick={() => { setStep(s => s-1); setError(''); }}
                  style={{ flex:1, padding:'13px 0', background:'transparent', border:'1px solid var(--border)', borderRadius:11, color:'var(--muted)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <ChevronLeft size={15}/> Back
                </button>
              )}
              {step < 4 ? (
                <button onClick={next}
                  style={{ flex:2, padding:'13px 0', background:'linear-gradient(135deg,#2563eb,#4f46e5)', border:'none', borderRadius:11, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  Continue <ChevronRight size={16}/>
                </button>
              ) : (
                <button onClick={submit} disabled={loading}
                  style={{ flex:2, padding:'13px 0', background: loading ? 'var(--muted2)' : 'linear-gradient(135deg,#15803d,#16a34a)', border:'none', borderRadius:11, color:'white', fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              )}
            </div>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--blue)', fontWeight:700 }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
