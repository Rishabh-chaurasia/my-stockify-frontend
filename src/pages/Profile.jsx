import React, { useEffect, useState } from 'react';
import { Mail, Phone, CreditCard, MapPin, Briefcase, CheckCircle, AlertCircle, Edit2, X, Send, ChevronDown, ChevronUp, Shield, User, TrendingUp, Wallet } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, sendOtp, verifyEmail } from '../lib/api';

const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);
const OCCS = ['Salaried','Self Employed','Student','Business','Retired','Unemployed'];
const MRTS = ['Single','Married','Divorced','Widowed'];

function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--muted)', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, textAlign:'right', wordBreak:'break-all', maxWidth:'60%' }}>{value || '—'}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', marginBottom:12, overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
      <button onClick={() => setOpen(!open)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:'none', border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'var(--green-lt)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} color="var(--green-d)"/>
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={15} color="var(--muted)"/> : <ChevronDown size={15} color="var(--muted)"/>}
      </button>
      {open && <div style={{ padding:'0 20px 16px' }}>{children}</div>}
    </div>
  );
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
    getUserProfile(username).then(setProfile).catch(()=>{}).finally(()=>setLoading(false));
  }, [username]);

  const openEdit = () => {
    setEditForm({ phone:profile?.phone||'', email:profile?.email||'', fatherName:profile?.fatherName||'', occupation:profile?.occupation||'', maritalStatus:profile?.maritalStatus||'' });
    setMsg({text:'',ok:true}); setEditOpen(true);
  };
  const saveEdit = async () => {
    setSaving(true); setMsg({text:'',ok:true});
    try { const u = await updateUserProfile(username, editForm); setProfile(u); setMsg({text:'Profile updated!',ok:true}); setTimeout(()=>setEditOpen(false),800); }
    catch(e) { setMsg({text:e.message||'Update failed',ok:false}); }
    finally { setSaving(false); }
  };
  const handleSendOtp = async () => {
    setOtpLoading(true); setMsg({text:'',ok:true});
    try { await sendOtp(username); setOtpSent(true); setMsg({text:'OTP sent!',ok:true}); }
    catch(e) { setMsg({text:e.message||'Failed',ok:false}); }
    finally { setOtpLoading(false); }
  };
  const handleVerify = async () => {
    setSaving(true); setMsg({text:'',ok:true});
    try { await verifyEmail(username, otp); setProfile(p=>({...p,emailVerified:true})); setMsg({text:'Email verified!',ok:true}); setTimeout(()=>{setOtpOpen(false);setOtp('');},800); }
    catch(e) { setMsg({text:e.message||'Invalid OTP',ok:false}); }
    finally { setSaving(false); }
  };
  const fmtDob = d => { if(!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); } catch { return d; } };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:640 }}>
        <div className="skeleton" style={{ height:180, borderRadius:'var(--r-lg)', marginBottom:12 }}/>
        <div className="skeleton" style={{ height:200, borderRadius:'var(--r-lg)', marginBottom:12 }}/>
      </main>
    </div>
  );

  const initials  = profile?.name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || (username||'?')[0].toUpperCase();
  const walletAmt = profile?.wallet?.amount ?? 0;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:640 }}>

        {/* ── Hero card — light Groww style ── */}
        <div className="fade-up" style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', marginBottom:16, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
          {/* Top strip with green gradient */}
          <div style={{ background:'linear-gradient(135deg,#00d09c,#5367ff)', height:6 }}/>

          <div style={{ padding:'24px 24px 20px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:20 }}>
              {/* Avatar */}
              <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#00d09c,#5367ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff', flexShrink:0 }}>
                {initials}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:2 }}>
                  {profile?.name || '—'}
                </h2>
                {/* Username — fixed visibility */}
                <p style={{ fontSize:13, color:'var(--text2)', fontWeight:500, marginBottom:8 }}>
                  @{profile?.username || username}
                </p>
                {profile?.emailVerified ? (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'var(--green-d)', background:'var(--green-lt)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(0,179,134,0.25)' }}>
                    <CheckCircle size={11}/> Verified
                  </span>
                ) : (
                  <button onClick={()=>{setOtpOpen(true);setMsg({text:'',ok:true});setOtpSent(false);setOtp('');}}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#92400e', background:'#fffbeb', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(244,161,0,0.3)', cursor:'pointer' }}>
                    <AlertCircle size={11}/> Verify Email
                  </button>
                )}
              </div>
              <button onClick={openEdit} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:'var(--r)', color:'var(--text2)', fontSize:13, fontWeight:500, cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.color='var(--green-d)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';}}>
                <Edit2 size={13}/> Edit
              </button>
            </div>

            {/* Wallet card — inside profile */}
            <div style={{ background:'linear-gradient(135deg,#f0fff9,#eef0ff)', borderRadius:'var(--r-md)', padding:'16px 20px', border:'1px solid rgba(0,208,156,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:5 }}>Virtual Wallet Balance</p>
                <p style={{ fontSize:26, fontWeight:800, fontFamily:'var(--mono)', color:'var(--green-d)', letterSpacing:'-0.5px', lineHeight:1 }}>
                  {INR(walletAmt)}
                </p>
              </div>
              <div style={{ width:44, height:44, borderRadius:12, background:'var(--green-lt)', border:'1px solid rgba(0,179,134,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Wallet size={20} color="var(--green-d)"/>
              </div>
            </div>
          </div>
        </div>

        {/* ── Personal info ── */}
        <Section title="Personal Information" icon={User}>
          <InfoRow label="Full Name"      value={profile?.name}/>
          <InfoRow label="Email"          value={profile?.email}/>
          <InfoRow label="Phone"          value={profile?.phone}/>
          <InfoRow label="Date of Birth"  value={fmtDob(profile?.dob)}/>
          <InfoRow label="Gender"         value={profile?.gender}/>
          <InfoRow label="Father's Name"  value={profile?.fatherName}/>
          <InfoRow label="Occupation"     value={profile?.occupation}/>
          <InfoRow label="Marital Status" value={profile?.maritalStatus}/>
          <InfoRow label="Income Range"   value={profile?.incomeRange}/>
        </Section>

        {/* ── KYC ── */}
        <Section title="KYC Details" icon={Shield} defaultOpen={false}>
          <InfoRow label="Aadhaar" value={profile?.aadhaar ? profile.aadhaar.replace(/(\d{4})/g,'$1 ').trim() : '—'}/>
          <InfoRow label="PAN"     value={profile?.pan}/>
        </Section>

        {/* ── Addresses ── */}
        {profile?.addresses?.length > 0 && (
          <Section title="Addresses" icon={MapPin} defaultOpen={false}>
            {profile.addresses.map((addr,i) => (
              <div key={addr.id||i} style={{ marginBottom: i<profile.addresses.length-1?16:0, paddingBottom: i<profile.addresses.length-1?16:0, borderBottom: i<profile.addresses.length-1?'1px solid var(--border)':'none' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--green-d)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{addr.addressType}</p>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                  {addr.addressLine1}<br/>{addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            ))}
          </Section>
        )}
      </main>

      {/* ── Edit modal ── */}
      {editOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)' }}
          onClick={e=>e.target===e.currentTarget&&setEditOpen(false)}>
          <div className="slide-up" style={{ background:'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:500,border:'1px solid var(--border)',borderBottom:'none',maxHeight:'88vh',display:'flex',flexDirection:'column' }}>
            <div style={{ textAlign:'center',padding:'12px 0 4px',flexShrink:0 }}>
              <div style={{ width:40,height:4,background:'var(--border2)',borderRadius:2,display:'inline-block' }}/>
            </div>
            <div style={{ padding:'8px 22px 32px',overflowY:'auto',flex:1 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
                <h3 style={{ fontSize:18,fontWeight:700,color:'var(--text)' }}>Edit Profile</h3>
                <button onClick={()=>setEditOpen(false)} style={{ padding:6,borderRadius:8,color:'var(--muted)',background:'var(--bg)',border:'1px solid var(--border)',cursor:'pointer' }}><X size={16}/></button>
              </div>
              {msg.text && <div style={{ padding:'10px 14px',borderRadius:'var(--r)',marginBottom:14,fontSize:13,background:msg.ok?'var(--green-lt)':'var(--red-lt)',color:msg.ok?'var(--green-d)':'var(--red)',border:`1px solid ${msg.ok?'rgba(0,183,134,0.25)':'rgba(235,87,87,0.25)'}` }}>{msg.text}</div>}
              {[{k:'phone',l:'Phone Number'},{k:'email',l:'Email Address'},{k:'fatherName',l:"Father's Name"}].map(({k,l})=>(
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.3px' }}>{l}</label>
                  <input className="input" value={editForm[k]||''} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))}/>
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.3px' }}>Occupation</label>
                <select className="input" value={editForm.occupation||''} onChange={e=>setEditForm(p=>({...p,occupation:e.target.value}))}>
                  <option value="">Select</option>
                  {OCCS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:22 }}>
                <label style={{ fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.3px' }}>Marital Status</label>
                <select className="input" value={editForm.maritalStatus||''} onChange={e=>setEditForm(p=>({...p,maritalStatus:e.target.value}))}>
                  <option value="">Select</option>
                  {MRTS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <button onClick={saveEdit} disabled={saving} className="btn btn-green" style={{ width:'100%',padding:'14px 0',fontSize:15,fontWeight:700,opacity:saving?0.7:1 }}>
                {saving?'Saving…':'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OTP modal ── */}
      {otpOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(4px)' }}
          onClick={e=>e.target===e.currentTarget&&setOtpOpen(false)}>
          <div className="slide-up" style={{ background:'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:440,border:'1px solid var(--border)',borderBottom:'none' }}>
            <div style={{ textAlign:'center',padding:'12px 0 4px' }}>
              <div style={{ width:40,height:4,background:'var(--border2)',borderRadius:2,display:'inline-block' }}/>
            </div>
            <div style={{ padding:'8px 22px 32px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                <h3 style={{ fontSize:18,fontWeight:700,color:'var(--text)' }}>Verify Email</h3>
                <button onClick={()=>setOtpOpen(false)} style={{ padding:6,borderRadius:8,color:'var(--muted)',background:'var(--bg)',border:'1px solid var(--border)',cursor:'pointer' }}><X size={16}/></button>
              </div>
              <p style={{ fontSize:13,color:'var(--muted)',marginBottom:20,lineHeight:1.6 }}>
                We'll send a 6-digit code to <strong style={{ color:'var(--text)' }}>{profile?.email}</strong>
              </p>
              {msg.text && <div style={{ padding:'10px 14px',borderRadius:'var(--r)',marginBottom:14,fontSize:13,background:msg.ok?'var(--green-lt)':'var(--red-lt)',color:msg.ok?'var(--green-d)':'var(--red)' }}>{msg.text}</div>}
              <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000"
                style={{ width:'100%',padding:'16px',fontSize:28,textAlign:'center',fontFamily:'var(--mono)',fontWeight:700,letterSpacing:14,background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:'var(--r)',marginBottom:16,boxSizing:'border-box' }}/>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={handleVerify} disabled={saving||otp.length<6} className="btn btn-green" style={{ flex:1,padding:'13px 0',opacity:otp.length===6?1:0.5 }}>
                  {saving?'Verifying…':'Verify OTP'}
                </button>
                <button onClick={handleSendOtp} disabled={otpLoading} className="btn btn-outline" style={{ flex:1,padding:'13px 0',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  <Send size={13}/> {otpLoading?'Sending…':otpSent?'Resend':'Send OTP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .slide-up{animation:slideUp 0.32s cubic-bezier(0.16,1,0.3,1) both} @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
