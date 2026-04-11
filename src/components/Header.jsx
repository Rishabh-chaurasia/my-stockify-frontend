import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, LayoutDashboard, ArrowLeftRight, ClipboardList, User, LogOut, Compass, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_PUBLIC = [
  { to:'/explore', label:'Explore' },
  { to:'/stocks',  label:'Search'  },
];
const NAV_AUTH = [
  { to:'/portfolio', label:'Dashboard' },
  { to:'/trade',     label:'Stocks'    },
  { to:'/orders',    label:'Orders'    },
  { to:'/stocks',    label:'Search'    },
  { to:'/profile',   label:'Profile'   },
];
const BOT_AUTH = [
  { to:'/explore',   label:'Home',      Icon:Compass         },
  { to:'/portfolio', label:'Portfolio', Icon:LayoutDashboard },
  { to:'/trade',     label:'Stocks',    Icon:ArrowLeftRight  },
  { to:'/orders',    label:'Orders',    Icon:ClipboardList   },
  { to:'/profile',   label:'Profile',   Icon:User            },
];
const BOT_PUB = [
  { to:'/explore', label:'Home',   Icon:Compass  },
  { to:'/stocks',  label:'Search', Icon:Search   },
  { to:'/login',   label:'Login',  Icon:User     },
];

export default function Header() {
  const { username, logout, isLoggedIn } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const on = p => pathname === p || pathname.startsWith(p+'/');
  const NAV = isLoggedIn ? NAV_AUTH : NAV_PUBLIC;
  const BOT = isLoggedIn ? BOT_AUTH : BOT_PUB;

  return (
    <>
      <header style={{ position:'sticky',top:0,zIndex:200,background:'#fff',borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1280,margin:'0 auto',height:60,padding:'0 24px',display:'flex',alignItems:'center',gap:0 }}>

          {/* Logo — uses actual Stockify brand logo */}
          <Link to="/" style={{ display:'flex',alignItems:'center',gap:10,marginRight:40,flexShrink:0 }}>
            <img
              src="/logo.png"
              alt="Stockify"
              style={{ width:38,height:38,objectFit:'contain',borderRadius:8 }}
              onError={e => {
                // Fallback to gradient icon if logo fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ width:38,height:38,borderRadius:8,background:'linear-gradient(135deg,#00d09c,#5367ff)',display:'none',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,208,156,0.3)',flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div>
              <span style={{ fontWeight:800,fontSize:16,letterSpacing:'-0.4px',color:'#1d1d1d' }}>Stockify</span>
              <span style={{ fontSize:9,color:'var(--muted)',display:'block',letterSpacing:'0.2px',marginTop:-2 }}>VIRTUAL TRADING</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hd-nav" style={{ display:'flex',height:60,alignItems:'stretch' }}>
            {NAV.map(({ to, label }) => {
              const active = on(to);
              return (
                <Link key={to} to={to}
                  style={{ display:'flex',alignItems:'center',padding:'0 16px',fontSize:14,fontWeight:active?600:400,color:active?'var(--green)':'var(--text2)',position:'relative',transition:'color 0.15s',borderBottom:active?'2px solid var(--green)':'2px solid transparent',whiteSpace:'nowrap' }}
                  onMouseEnter={e=>{ if(!active){ e.currentTarget.style.color='var(--text)'; } }}
                  onMouseLeave={e=>{ if(!active){ e.currentTarget.style.color='var(--text2)'; } }}>
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
            {isLoggedIn ? (
              <>
                <div className="hd-user" style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:20,cursor:'default' }}>
                  <div style={{ width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#00d09c,#5367ff)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:10,fontWeight:700,color:'#fff' }}>{(username||'U')[0].toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize:13,fontWeight:500,color:'var(--text)',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{username}</span>
                </div>
                <button className="hd-logout btn btn-outline" onClick={logout} style={{ padding:'7px 14px',fontSize:13 }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text2)'; }}>
                  <LogOut size={13}/> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"    className="hd-logout btn btn-outline" style={{ padding:'7px 16px',fontSize:13 }}>Login</Link>
                <Link to="/register" className="hd-logout btn btn-green"   style={{ padding:'7px 16px',fontSize:13 }}>Sign Up</Link>
              </>
            )}
            <button className="hd-burger" onClick={()=>setOpen(!open)} style={{ padding:8,borderRadius:8,color:'var(--text2)' }}>
              {open ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="hd-mob scale-in" style={{ padding:'12px 16px 20px',borderTop:'1px solid var(--border)',background:'#fff' }}>
            {isLoggedIn && (
              <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:12,background:'var(--green-lt)',borderRadius:'var(--r)' }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#00d09c,#5367ff)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:12,fontWeight:700,color:'#fff' }}>{(username||'U')[0].toUpperCase()}</span>
                </div>
                <div>
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>{username}</p>
                  <p style={{ fontSize:11,color:'var(--muted)' }}>Virtual Account</p>
                </div>
              </div>
            )}
            {NAV.map(({ to, label }) => (
              <Link key={to} to={to} onClick={()=>setOpen(false)}
                style={{ display:'block',padding:'12px 14px',borderRadius:'var(--r)',fontSize:14,fontWeight:on(to)?600:400,color:on(to)?'var(--green)':'var(--text)',background:on(to)?'var(--green-lt)':'transparent',marginBottom:2,transition:'all 0.12s' }}>
                {label}
              </Link>
            ))}
            {isLoggedIn
              ? <button onClick={()=>{logout();setOpen(false);}} style={{ display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderRadius:'var(--r)',width:'100%',color:'var(--red)',fontSize:14,fontWeight:500,marginTop:8,background:'var(--red-lt)' }}><LogOut size={15}/> Logout</button>
              : <Link to="/login" onClick={()=>setOpen(false)} style={{ display:'block',padding:'12px 14px',borderRadius:'var(--r)',fontSize:14,fontWeight:600,color:'#fff',background:'var(--green)',marginTop:8,textAlign:'center' }}>Login</Link>
            }
          </div>
        )}
      </header>

      {/* Mobile bottom nav */}
      <nav className="hd-bot" style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:200,background:'#fff',borderTop:'1px solid var(--border)',padding:'4px 0 max(env(safe-area-inset-bottom),6px)',display:'none' }}>
        {BOT.map(({ to, label, Icon }) => {
          const active = on(to);
          return (
            <Link key={to} to={to} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'5px 0',color:active?'var(--green)':'var(--muted)',transition:'color 0.12s' }}>
              <Icon size={20} strokeWidth={active?2.5:1.8} color={active?'var(--green)':'var(--muted)'}/>
              <span style={{ fontSize:10,fontWeight:active?600:400 }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        .hd-nav{display:flex!important} .hd-logout{display:flex!important} .hd-user{display:flex!important} .hd-burger{display:none!important} .hd-bot{display:none!important}
        @media(max-width:860px){.hd-nav{display:none!important} .hd-logout{display:none!important} .hd-user{display:none!important} .hd-burger{display:flex!important} .hd-bot{display:flex!important}}
        @media(min-width:861px){.hd-mob{display:none!important}}
      `}</style>
    </>
  );
}
