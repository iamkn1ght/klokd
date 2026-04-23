// Klokd employer app — shared UI
// Dark shell (matches worker identity) but with volt-forward gradient,
// calmer density, operational chrome. Greys are warmer/more neutral.

const { K, I, Label, Eyebrow, VLine, StatusPill } = window;

// Employer-specific visual differentiation:
// Worker grad = mint → volt (go-get-paid)
// Employer grad = volt → mint (authority / command)
const EMP_GRAD_FWD = 'linear-gradient(135deg,#BCFF4E,#00E5A0)';
const EMP_GRAD_BG  = 'radial-gradient(circle, rgba(188,255,78,0.14) 0%, transparent 70%)';

// ── HEADER (used across employer screens) ──
function EmpHeader({ greeting, venue, badge, onBell, notif=2, onVenue }) {
  return (
    <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexShrink:0}}>
      <div style={{minWidth:0,flex:1}}>
        <button onClick={onVenue} style={{
          display:'inline-flex',alignItems:'center',gap:6,padding:'3px 9px 3px 10px',borderRadius:999,
          background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',
          color:'rgba(255,255,255,0.7)',fontSize:10.5,fontWeight:600,fontFamily:K.fontFamily,cursor:'pointer',
          marginBottom:6,
        }}>
          <span style={{width:6,height:6,borderRadius:999,background:window.K.electric}}/>
          {venue || 'The Brew Bistro · Westlands'}
          {I.chevron('rgba(255,255,255,0.4)',10,'down')}
        </button>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:'-0.03em',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{greeting}</div>
      </div>
      <div style={{display:'flex',gap:6,flexShrink:0}}>
        <button onClick={onBell} style={{position:'relative',width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          {I.bell('#fff',15)}
          {notif > 0 && <span style={{position:'absolute',top:5,right:5,minWidth:13,height:13,padding:'0 3px',borderRadius:999,background:window.K.electric,color:window.K.ink,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid '+window.K.ink,lineHeight:1}}>{notif}</span>}
        </button>
      </div>
    </div>
  );
}

// ── STAT TILE (KPI card, used in dashboards) ──
function StatTile({ label, value, sub, tone='neutral', icon, compact }) {
  const tones = {
    mint:    { c: window.K.electric, bg:'rgba(0,229,160,0.07)',  bd:'rgba(0,229,160,0.25)' },
    volt:    { c: window.K.volt,     bg:'rgba(188,255,78,0.07)', bd:'rgba(188,255,78,0.25)' },
    warn:    { c:'#FFB347',          bg:'rgba(255,179,71,0.07)', bd:'rgba(255,179,71,0.22)' },
    neutral: { c:'#fff',              bg:'rgba(255,255,255,0.03)',bd:'rgba(255,255,255,0.06)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius:14, background:t.bg, border:`1px solid ${t.bd}`,
      display:'flex',flexDirection:'column',gap:4,position:'relative',overflow:'hidden',minWidth:0,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        {icon}
        <span style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>{label}</span>
      </div>
      <div style={{fontSize: compact?18:22,fontWeight:900,color:t.c,letterSpacing:'-0.03em',lineHeight:1.05}}>{value}</div>
      {sub && <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',lineHeight:1.35}}>{sub}</div>}
    </div>
  );
}

// ── WORKER CARD (used in Matched, Team, Shifts) ──
function WorkerCard({ worker, match, accepted, onAccept, onDetails, compact }) {
  const w = worker;
  return (
    <div style={{
      padding: compact ? '11px 12px' : '13px 14px',
      borderRadius:14,
      background: accepted ? `linear-gradient(180deg,${window.K.electric}14,${window.K.electric}03)` : 'rgba(255,255,255,0.03)',
      border: accepted ? `1px solid ${window.K.electric}55` : '1px solid rgba(255,255,255,0.06)',
      display:'flex',gap:11,alignItems:'center',
    }}>
      {/* Avatar */}
      <div style={{
        width:40,height:40,borderRadius:'50%',flexShrink:0,
        background: w.avatarBg || 'linear-gradient(135deg,#3b3b48,#24242e)',
        display:'flex',alignItems:'center',justifyContent:'center',position:'relative',
        color:'#fff',fontWeight:800,fontSize:13,letterSpacing:'-0.02em',
        border:'1px solid rgba(255,255,255,0.08)',
      }}>
        {w.initials || (w.name||'').split(' ').map(x=>x[0]).slice(0,2).join('')}
        {w.verified && (
          <div style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:'50%',background:window.K.electric,border:`1.5px solid ${window.K.ink}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {I.check(window.K.ink,9)}
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>{w.name}</span>
          {typeof match === 'number' && (
            <span style={{padding:'1px 6px',borderRadius:999,background:`${window.K.volt}22`,color:window.K.volt,fontSize:9.5,fontWeight:800,letterSpacing:'0.04em'}}>{match}% MATCH</span>
          )}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:10.5,color:'rgba(255,255,255,0.55)',display:'inline-flex',alignItems:'center',gap:3}}>{I.star(window.K.volt,10)} {w.rating}</span>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>·</span>
          <span style={{fontSize:10.5,color:'rgba(255,255,255,0.55)'}}>{w.shifts} shifts</span>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>·</span>
          <span style={{fontSize:10.5,color:window.K.electric,fontWeight:700}}>{w.showUp}% show-up</span>
        </div>
        {!compact && w.badge && (
          <div style={{marginTop:4,fontSize:10,color:'rgba(255,255,255,0.4)'}}>{w.badge}</div>
        )}
      </div>
      {/* Action */}
      {onAccept && !accepted && (
        <button onClick={onAccept} style={{
          padding:'7px 12px',borderRadius:10,border:'none',background:window.K.brandGrad,color:window.K.ink,
          fontSize:11.5,fontWeight:800,cursor:'pointer',fontFamily:K.fontFamily,letterSpacing:'-0.01em',
        }}>Accept</button>
      )}
      {accepted && (
        <div style={{padding:'6px 10px',borderRadius:999,background:'rgba(0,229,160,0.14)',color:window.K.electric,fontSize:10.5,fontWeight:800,display:'inline-flex',alignItems:'center',gap:4}}>
          {I.check(window.K.electric,11)} Confirmed
        </div>
      )}
    </div>
  );
}

// ── MONEY LINE (label + value, with optional icon) ──
function MoneyLine({ label, value, muted, bold, big, tone }) {
  const c = tone==='mint' ? window.K.electric : tone==='warn' ? '#FFB347' : (bold?'#fff':'rgba(255,255,255,0.7)');
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'7px 0', fontFamily: muted?K.mono:K.fontFamily}}>
      <span style={{fontSize:12, color: muted?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.6)', fontWeight: muted?500:500}}>{label}</span>
      <span style={{fontSize: big?16:13, fontWeight: bold||big?800:600, color:c, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums'}}>{value}</span>
    </div>
  );
}

// ── INPUT (dark, for employer forms) ──
function EmpInput({ label, value, onChange, placeholder, prefix, suffix, type='text', disabled, hint, icon }) {
  return (
    <div style={{marginBottom:12}}>
      {label && <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:6}}>{label}</div>}
      <div style={{
        display:'flex',alignItems:'center',gap:8,padding:'11px 13px',borderRadius:12,
        background: disabled?'rgba(255,255,255,0.015)':'rgba(255,255,255,0.04)',
        border:'1px solid rgba(255,255,255,0.08)',
      }}>
        {icon}
        {prefix && <span style={{fontSize:13,color:'rgba(255,255,255,0.45)',fontWeight:600}}>{prefix}</span>}
        <input type={type} value={value||''} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{
          flex:1,background:'none',border:'none',outline:'none',color:'#fff',fontSize:13.5,fontWeight:600,fontFamily:K.fontFamily,minWidth:0,
        }}/>
        {suffix && <span style={{fontSize:12,color:'rgba(255,255,255,0.45)',fontWeight:600}}>{suffix}</span>}
      </div>
      {hint && <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',marginTop:5,lineHeight:1.4}}>{hint}</div>}
    </div>
  );
}

// ── STEPPER (for quantity like # workers needed) ──
function Stepper({ value, onChange, min=1, max=99, label, suffix }) {
  const dec = () => onChange(Math.max(min, value-1));
  const inc = () => onChange(Math.min(max, value+1));
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <button onClick={dec} disabled={value<=min} style={{
        width:36,height:36,borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',
        background:'rgba(255,255,255,0.04)',color:value<=min?'rgba(255,255,255,0.2)':'#fff',
        fontSize:18,fontWeight:700,cursor:value<=min?'default':'pointer',fontFamily:K.fontFamily,
      }}>−</button>
      <div style={{flex:1,textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>{value}{suffix?<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginLeft:4}}>{suffix}</span>:null}</div>
        {label && <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:3,letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</div>}
      </div>
      <button onClick={inc} disabled={value>=max} style={{
        width:36,height:36,borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',
        background:'rgba(255,255,255,0.04)',color:value>=max?'rgba(255,255,255,0.2)':'#fff',
        fontSize:18,fontWeight:700,cursor:value>=max?'default':'pointer',fontFamily:K.fontFamily,
      }}>+</button>
    </div>
  );
}

// ── ESCROW METER (shows funded / held / committed) ──
function EscrowMeter({ funded, held, committed, showLabels=true }) {
  const total = funded;
  const heldPct = total > 0 ? (held/total)*100 : 0;
  const commPct = total > 0 ? (committed/total)*100 : 0;
  return (
    <div>
      <div style={{height:8,borderRadius:999,background:'rgba(255,255,255,0.06)',overflow:'hidden',display:'flex'}}>
        <div style={{width:`${commPct}%`,background:window.K.electric}}/>
        <div style={{width:`${heldPct-commPct}%`,background:`${window.K.electric}55`}}/>
      </div>
      {showLabels && (
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:10.5}}>
          <span style={{color:window.K.electric,fontWeight:700}}>KES {committed.toLocaleString()} committed</span>
          <span style={{color:'rgba(255,255,255,0.45)'}}>of KES {total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── BOTTOM NAV (employer tabs) ──
function EmpBottomNav({ tab, onTab, badges={} }) {
  const items = [
    { k:'home',   icon:I.home,     label:'Dashboard' },
    { k:'shifts', icon:I.calendar, label:'Shifts' },
    { k:'pay',    icon:I.wallet,   label:'Pay' },
    { k:'team',   icon:I.user,     label:'Team' },
  ];
  return (
    <div style={{
      height:64,borderTop:'0.5px solid rgba(255,255,255,0.06)',background:'rgba(10,10,15,0.95)',
      backdropFilter:'blur(12px)',display:'flex',flexShrink:0,
    }}>
      {items.map(it=>{
        const active = tab===it.k;
        const badge = badges[it.k];
        return (
          <button key={it.k} onClick={()=>onTab(it.k)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            background:'none',border:'none',cursor:'pointer',fontFamily:K.fontFamily,paddingTop:6,position:'relative',
          }}>
            <div style={{position:'relative'}}>
              {it.icon(active?window.K.electric:'rgba(255,255,255,0.4)', 20)}
              {badge && <span style={{position:'absolute',top:-4,right:-8,minWidth:14,height:14,padding:'0 3px',borderRadius:999,background:window.K.electric,color:window.K.ink,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{badge}</span>}
            </div>
            <span style={{fontSize:10,fontWeight:active?700:500,color:active?window.K.electric:'rgba(255,255,255,0.4)',letterSpacing:'0.02em'}}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── TIMELINE DOT (for shift tracking) ──
function TimelineDot({ state='future', label, sub, time, last }) {
  // state: past | active | future
  const isActive = state==='active';
  const isPast = state==='past';
  const dotColor = isActive ? window.K.electric : isPast ? window.K.electric : 'rgba(255,255,255,0.2)';
  const lineColor = isPast ? window.K.electric : 'rgba(255,255,255,0.08)';
  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:14,flexShrink:0}}>
        <div style={{
          width:12,height:12,borderRadius:'50%',
          background: isActive ? window.K.electric : isPast ? window.K.electric : 'transparent',
          border: isActive ? `3px solid ${window.K.electric}44` : isPast ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
          boxShadow: isActive ? `0 0 0 4px ${window.K.electric}22` : 'none',
        }}/>
        {!last && <div style={{width:1.5,flex:1,minHeight:22,background:lineColor,marginTop:3}}/>}
      </div>
      <div style={{flex:1,paddingBottom:last?0:14,paddingTop:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}}>
          <span style={{fontSize:12.5,fontWeight:isActive?800:700,color:isPast||isActive?'#fff':'rgba(255,255,255,0.5)',letterSpacing:'-0.01em'}}>{label}</span>
          {time && <span style={{fontSize:10.5,color:isActive?window.K.electric:'rgba(255,255,255,0.4)',fontWeight:700,fontFamily:K.mono}}>{time}</span>}
        </div>
        {sub && <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',marginTop:2,lineHeight:1.4}}>{sub}</div>}
      </div>
    </div>
  );
}

// ── EMPLOYER ICONS ──
const IE = {
  chef: (c='#fff',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M3 6a2.5 2.5 0 1 1 1.8-4.2A2.5 2.5 0 0 1 9.2 1.8 2.5 2.5 0 1 1 11 6v2H3V6z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 8h6v3H4z" stroke={c} strokeWidth="1.3"/></svg>
  ),
  trend: (c='#00E5A0',s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M1.5 8.5L4 6l2 2 4.5-4.5M7 3.5h3.5V7" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  calendar2: (c='#fff',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9.5" rx="1.5" stroke={c} strokeWidth="1.3"/><path d="M2 6h10M5 2v2M9 2v2" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>
  ),
  mpesa2: (c='#00E5A0',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.3"/><path d="M4.5 7.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5M5 5.5c0 .6.4 1 1 1s1-.4 1-1M8 5.5c0 .6.4 1 1 1s1-.4 1-1" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
  plus: (c='#0A0A0F',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  users: (c='#fff',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="5" r="2" stroke={c} strokeWidth="1.2"/><circle cx="10.5" cy="5.5" r="1.5" stroke={c} strokeWidth="1.2"/><path d="M2 12c0-1.9 1.6-3 3.5-3s3.5 1.1 3.5 3M9.5 9c1.7 0 2.5 1 2.5 2.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
  flash: (c='#BCFF4E',s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><path d="M6.5 1L2 7h3l-.5 4L9 5H6L6.5 1z" fill={c}/></svg>
  ),
  search: (c='rgba(255,255,255,0.5)',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke={c} strokeWidth="1.3"/><path d="M9 9l3 3" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>
  ),
  office: (c='#fff',s=18) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none"><path d="M3 15V5l6-2 6 2v10" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><path d="M3 15h12M6 8h2M10 8h2M6 11h2M10 11h2" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>
  ),
  receipt: (c='#fff',s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M3 1v12l1.5-1 1.5 1 1.5-1 1.5 1 1.5-1 1.5 1V1l-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1L3 1z" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/><path d="M5.5 5.5h3M5.5 8h3" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg>
  ),
};

Object.assign(window, {
  EmpHeader, StatTile, WorkerCard, MoneyLine, EmpInput, Stepper, EscrowMeter,
  EmpBottomNav, TimelineDot, IE, EMP_GRAD_FWD, EMP_GRAD_BG,
});
