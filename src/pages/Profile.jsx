import React, { useEffect, useState } from 'react';
import { Mail, Phone, CreditCard, MapPin, Briefcase, CheckCircle, AlertCircle, Edit2, X, Send, ChevronDown, ChevronUp, Shield, User } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, sendOtp, verifyEmail } from '../lib/api';

const inp = { width:'100%', padding:'12px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, boxSizing:'border-box' };
const lbl = { fontSize:11, color:'var(--muted)', display:'block', marginBottom:7, fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase' };
const OCCS = ['Salaried','Self Employed','Student','Business','Retired','Unemployed'];
const MRTS = ['Single','Married','Divorced','Widowed'];

function InfoRow({ label, value, icon:Icon }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {Icon && <Icon size={13} color="var(--muted2)"/>}
        <span style={{ fontSize:12, color:'var(--muted)' }}>{label}</span>
      </div>
      <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, textAlign:'right', wordBreak:'break-all', maxWidth:'60%' }}>{value || '—'}</span>
    </div>
  );
}

function Card({ title, icon:Icon, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', marginBottom:12, overflow:'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 18px', background:'none', border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          {Icon && <div style={{ width:28, height:28, borderRadius:8, background:'var(--blue-dim)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={13} color="var(--blue)"/></div>}
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'-0.2px' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={14} color="var(--muted)"/> : <ChevronDown size={14} color="var(--muted)"/>}
      </button>
      {open && <div style={{ padding:'0 18px 16px' }}>{children}</div>}
    </div>
  );
}

function Spinner() {
  return <div style={{ width:22, height:22, border:'2px solid var(--border)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>;
}

export default function Profile() {
  const { username } = useAuth();
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [editOpen,   setEditOpen]   = useState(false);
  const [otpOpen,    setOtpOpen]    = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [otp,        setOtp]        = useState('');
  const [saving,     setSaving]     = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent,    setOtpSent]    = useState(false);
  const [msg,        setMsg]        = useState({ text:'', ok:true });

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getUserProfile(username).then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  const openEdit = () => {
    setEditForm({ phone:profile?.phone||'', email:profile?.email||'', fatherName:profile?.fatherName||'', occupation:profile?.occupation||'', maritalStatus:profile?.maritalStatus||'' });
    setMsg({ text:'', ok:true }); setEditOpen(true);
  };
  const saveEdit = async () => {
    setSaving(true); setMsg({ text:'', ok:true });
    try { const u = await updateUserProfile(username, editForm); setProfile(u); setMsg({ text:'Profile updated!', ok:true }); setTimeout(() => setEditOpen(false), 900); }
    catch (e) { setMsg({ text:e.message||'Update failed', ok:false }); }
    finally { setSaving(false); }
  };
  const handleSendOtp = async () => {
    setOtpLoading(true); setMsg({ text:'', ok:true });
    try { await sendOtp(username); setOtpSent(true); setMsg({ text:'OTP sent to your email!', ok:true }); }
    catch (e) { setMsg({ text:e.message||'Failed to send OTP', ok:false }); }
    finally { setOtpLoading(false); }
  };
  const handleVerify = async () => {
    setSaving(true); setMsg({ text:'', ok:true });
    try { await verifyEmail(username, otp); setProfile(p => ({ ...p, emailVerified:true })); setMsg({ text:'Email verified!', ok:true }); setTimeout(() => { setOtpOpen(false); setOtp(''); }, 900); }
    catch (e) { setMsg({ text:e.message||'Invalid OTP', ok:false }); }
    finally { setSaving(false); }
  };
  const fmtDob = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }); } catch { return d; } };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spinner/></div>
    </div>
  );

  const initials  = profile?.name?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || '??';
  const walletAmt = profile?.wallet?.amount ?? 0;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', paddingBottom:88 }}>
      <Header/>
      <main style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>

        {/* Hero card */}
        <div style={{ background:'linear-gradient(135deg,#111827,#1a2744)', border:'1px solid var(--border2)', borderRadius:18, padding:'22px 20px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
            {/* Avatar */}
            <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'white', flexShrink:0, letterSpacing:'-0.5px' }}>
              {initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <h2 style={{ fontSize:19, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:2 }}>{profile?.name || '—'}</h2>
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>@{profile?.username}</p>
              {profile?.emailVerified ? (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--green)', background:'var(--green-dim)', padding:'3px 9px', borderRadius:20, fontWeight:600 }}>
                  <CheckCircle size={10}/> Verified
                </span>
              ) : (
                <button onClick={() => { setOtpOpen(true); setMsg({ text:'', ok:true }); setOtpSent(false); setOtp(''); }}
                  style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--yellow)', background:'rgba(245,158,11,0.12)', padding:'3px 10px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600 }}>
                  <AlertCircle size={10}/> Verify Email
                </button>
              )}
            </div>
            <button onClick={openEdit} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid var(--border)', borderRadius:9, color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0, fontWeight:600 }}>
              <Edit2 size={12}/> Edit
            </button>
          </div>

          {/* Wallet strip */}
          <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:12, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ fontSize:10, color:'var(--muted)', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:4 }}>Virtual Wallet</p>
              <p style={{ fontSize:26, fontWeight:800, color:'var(--green)', fontFamily:'var(--mono)', letterSpacing:'-0.5px', lineHeight:1 }}>
                ₹{walletAmt.toLocaleString('en-IN', { maximumFractionDigits:2 })}
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:11, color:'var(--muted2)' }}>Available balance</p>
              <p style={{ fontSize:11, color:'var(--muted2)', marginTop:2 }}>Virtual funds only</p>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <Card title="Personal Information" icon={User}>
          <InfoRow label="Email"          value={profile?.email}         icon={Mail}/>
          <InfoRow label="Phone"          value={profile?.phone}         icon={Phone}/>
          <InfoRow label="Date of Birth"  value={fmtDob(profile?.dob)}/>
          <InfoRow label="Gender"         value={profile?.gender}/>
          <InfoRow label="Father's Name"  value={profile?.fatherName}/>
          <InfoRow label="Occupation"     value={profile?.occupation}    icon={Briefcase}/>
          <InfoRow label="Marital Status" value={profile?.maritalStatus}/>
          <InfoRow label="Income Range"   value={profile?.incomeRange}/>
        </Card>

        <Card title="KYC Details" icon={Shield}>
          <InfoRow label="Aadhaar" value={profile?.aadhaar ? profile.aadhaar.replace(/(\d{4})/g,'$1 ').trim() : '—'} icon={CreditCard}/>
          <InfoRow label="PAN"     value={profile?.pan} icon={CreditCard}/>
        </Card>

        {profile?.addresses?.length > 0 && (
          <Card title="Addresses" icon={MapPin}>
            {profile.addresses.map((addr, i) => (
              <div key={addr.id || i} style={{ marginBottom: i < profile.addresses.length-1 ? 14 : 0 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--blue)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>
                  {addr.addressType}
                </span>
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>
                  {addr.addressLine1}<br/>{addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            ))}
          </Card>
        )}
      </main>

      {/* Edit Modal */}
      {editOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(6px)' }}
          onClick={e => e.target===e.currentTarget && setEditOpen(false)}>
          <div className="slide-up" style={{ background:'var(--card)', borderRadius:'20px 20px 0 0', padding:'0 0 env(safe-area-inset-bottom)', width:'100%', maxWidth:480, border:'1px solid var(--border2)', borderBottom:'none' }}>
            <div style={{ display:'flex', justifyContent:'center', paddingTop:12 }}><div style={{ width:40, height:4, background:'var(--border2)', borderRadius:2 }}/></div>
            <div style={{ padding:'16px 22px 32px', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>Edit Profile</h3>
                <button onClick={() => setEditOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4 }}><X size={18}/></button>
              </div>
              {msg.text && <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:16, fontSize:13, background: msg.ok ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.ok ? 'var(--green)' : 'var(--red)', border:`1px solid ${msg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{msg.text}</div>}
              {[{k:'phone',l:'Phone Number'},{k:'email',l:'Email Address'},{k:'fatherName',l:"Father's Name"}].map(({k,l}) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={lbl}>{l}</label>
                  <input style={inp} value={editForm[k]||''} onChange={e => setEditForm(p => ({...p,[k]:e.target.value}))}/>
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Occupation</label>
                <select style={inp} value={editForm.occupation||''} onChange={e => setEditForm(p => ({...p,occupation:e.target.value}))}>
                  <option value="">Select</option>
                  {OCCS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:22 }}>
                <label style={lbl}>Marital Status</label>
                <select style={inp} value={editForm.maritalStatus||''} onChange={e => setEditForm(p => ({...p,maritalStatus:e.target.value}))}>
                  <option value="">Select</option>
                  {MRTS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <button onClick={saveEdit} disabled={saving} style={{ width:'100%', padding:'14px 0', background: saving ? 'var(--muted2)' : 'linear-gradient(135deg,#2563eb,#4f46e5)', border:'none', borderRadius:12, color:'white', fontSize:15, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(6px)' }}
          onClick={e => e.target===e.currentTarget && setOtpOpen(false)}>
          <div className="slide-up" style={{ background:'var(--card)', borderRadius:'20px 20px 0 0', padding:'0 0 env(safe-area-inset-bottom)', width:'100%', maxWidth:440, border:'1px solid var(--border2)', borderBottom:'none' }}>
            <div style={{ display:'flex', justifyContent:'center', paddingTop:12 }}><div style={{ width:40, height:4, background:'var(--border2)', borderRadius:2 }}/></div>
            <div style={{ padding:'16px 22px 32px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>Verify Email</h3>
                <button onClick={() => setOtpOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><X size={18}/></button>
              </div>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:20, lineHeight:1.6 }}>
                We'll send a 6-digit code to <strong style={{ color:'var(--text)' }}>{profile?.email}</strong>
              </p>
              {msg.text && <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:16, fontSize:13, background: msg.ok ? 'var(--green-dim)' : 'var(--red-dim)', color: msg.ok ? 'var(--green)' : 'var(--red)', border:`1px solid ${msg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>{msg.text}</div>}
              <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000"
                style={{ ...inp, letterSpacing:12, fontSize:26, textAlign:'center', fontFamily:'var(--mono)', fontWeight:700, marginBottom:16 }}/>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleVerify} disabled={saving||otp.length<6}
                  style={{ flex:1, padding:'13px 0', background: otp.length===6 ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : 'var(--muted2)', border:'none', borderRadius:11, color:'white', fontSize:14, fontWeight:700, cursor: otp.length===6 ? 'pointer' : 'not-allowed' }}>
                  {saving ? 'Verifying…' : 'Verify'}
                </button>
                <button onClick={handleSendOtp} disabled={otpLoading}
                  style={{ flex:1, padding:'13px 0', background:'transparent', border:'1px solid var(--border)', borderRadius:11, color:'var(--muted)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Send size={13}/> {otpLoading ? 'Sending…' : otpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
