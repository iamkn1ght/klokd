// Klokd shared UI primitives — worker app (dark shell default)

const K = window.K;

// ── BUTTONS ──
function GradientBtn({ children, disabled, onClick, style={}, size='lg' }) {
  const pad = size === 'lg' ? '16px 24px' : size === 'md' ? '12px 20px' : '9px 16px';
  const fs = size === 'lg' ? 15 : size === 'md' ? 14 : 13;
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled} style={{
      width: '100%', padding: pad, border: 'none',
      borderRadius: 14,
      background: disabled ? 'rgba(255,255,255,0.06)' : K.brandGrad,
      color: disabled ? 'rgba(255,255,255,0.25)' : K.ink,
      fontFamily: K.fontFamily, fontSize: fs, fontWeight: 800, letterSpacing: '-0.01em',
      cursor: disabled ? 'default' : 'pointer', transition: 'opacity .15s, transform .15s',
      ...style,
    }}>{children}</button>
  );
}

function GhostBtn({ children, onClick, dark = true, style={} }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'14px 20px', borderRadius:14,
      background:'transparent',
      border: dark?'1px solid rgba(255,255,255,0.1)':'1px solid #E8EDE8',
      color: dark?'rgba(255,255,255,0.7)':'#6B7280',
      fontFamily:K.fontFamily, fontSize:14, fontWeight:600, cursor:'pointer',
      ...style,
    }}>{children}</button>
  );
}

function IconBtn({ children, onClick, dark=true }) {
  return (
    <button onClick={onClick} style={{
      width:38, height:38, borderRadius:'50%',
      background: dark?'rgba(255,255,255,0.06)':'#fff',
      border: dark?'0.5px solid rgba(255,255,255,0.1)':'0.5px solid #E8EDE8',
      display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
      color: dark?'#fff':'#0A0A0F', fontFamily:K.fontFamily,
    }}>{children}</button>
  );
}

// ── TYPE ──
const Eyebrow = ({ children, color, style={} }) => (
  <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase',
    color: color || K.electric, ...style }}>{children}</div>
);

const Label = ({ children, color='rgba(255,255,255,0.4)', style={} }) => (
  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color, ...style }}>{children}</div>
);

// ── CHIPS ──
function Chip({ children, active, onClick, color, variant='dark' }) {
  const dark = variant === 'dark';
  const base = {
    padding:'9px 16px', borderRadius:999, fontSize:12.5, fontWeight:600,
    fontFamily:K.fontFamily, cursor:'pointer', transition:'all .15s',
    border:'1.5px solid transparent', whiteSpace:'nowrap',
  };
  if (active) return (
    <button onClick={onClick} style={{
      ...base, border:`1.5px solid ${color||K.electric}`,
      background: `${color||K.electric}1a`, color: color||K.electric, fontWeight:700,
    }}>{children}</button>
  );
  return (
    <button onClick={onClick} style={{
      ...base,
      border: dark?'1.5px solid rgba(255,255,255,0.08)':'1.5px solid #E8EDE8',
      background: dark?'rgba(255,255,255,0.03)':'#fff',
      color: dark?'rgba(255,255,255,0.55)':'#6B7280',
    }}>{children}</button>
  );
}

function StatusPill({ children, tone='mint' }) {
  const map = {
    mint:   { bg:'rgba(0,229,160,0.12)',  c:'#00E5A0' },
    volt:   { bg:'rgba(188,255,78,0.12)', c:'#BCFF4E' },
    warn:   { bg:'rgba(255,179,71,0.14)', c:'#FFB347' },
    err:    { bg:'rgba(255,107,107,0.14)',c:'#FF6B6B' },
    info:   { bg:'rgba(96,165,250,0.14)', c:'#60A5FA' },
    neutral:{ bg:'rgba(255,255,255,0.06)',c:'rgba(255,255,255,0.55)' },
  };
  const t = map[tone]||map.mint;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:999,
      background:t.bg, color:t.c, fontSize:10.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
    }}>{children}</span>
  );
}

// ── CARDS ──
function DarkCard({ children, style={}, glow=false, accent=false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: glow
        ? 'linear-gradient(180deg,rgba(0,229,160,0.06),rgba(0,229,160,0) 50%), rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.03)',
      border: accent?'1px solid rgba(0,229,160,0.35)':'1px solid rgba(255,255,255,0.06)',
      borderRadius:18, padding:16,
      cursor: onClick?'pointer':'default',
      ...style,
    }}>{children}</div>
  );
}

// ── DIVIDERS ──
const VLine = ({ dark=true }) => (
  <div style={{ width:0.5, alignSelf:'stretch', background: dark?'rgba(255,255,255,0.08)':'#E8EDE8' }}/>
);

// ── LOGO ──
function Logo({ size=28, light=true }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{ width:size, height:size, background:K.brandGrad, borderRadius:size*0.28,
        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <span style={{color:K.ink,fontWeight:900,fontSize:size*0.48, letterSpacing:'-0.04em', lineHeight:1}}>K</span>
      </div>
      <span style={{fontWeight:900,fontSize:size*0.55,letterSpacing:'-0.05em',color:light?'#fff':K.ink, lineHeight:1}}>klokd</span>
    </div>
  );
}

function LogoMark({ size=40 }) {
  return (
    <div style={{ width:size, height:size, background:K.brandGrad, borderRadius:size*0.28,
      display:'flex',alignItems:'center',justifyContent:'center' }}>
      <span style={{color:K.ink,fontWeight:900,fontSize:size*0.48,letterSpacing:'-0.04em',lineHeight:1}}>K</span>
    </div>
  );
}

// ── PROGRESS ──
function StepProgress({ step, total, dark=true }) {
  return (
    <div style={{ display:'flex', gap:6, width:'100%' }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{
          flex:1, height:3, borderRadius:999,
          background: i<=step ? K.electric : (dark?'rgba(255,255,255,0.08)':'#E8EDE8'),
          transition:'background .35s',
        }}/>
      ))}
    </div>
  );
}

// ── ICONS (hand-drawn minimal SVG, monoline) ──
const I = {
  check: (c='#0A0A0F', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3L13 5" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  arrowRight: (c='#0A0A0F', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  back: (c='#fff', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M13 8H3m4-4L3 8l4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  close: (c='#fff', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  home: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 9l7-5 7 5v7a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>
  ),
  calendar: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="13" rx="2" stroke={c} strokeWidth="1.6"/><path d="M3 8h14M7 3v3M13 3v3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  wallet: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2.5" y="5.5" width="15" height="11" rx="2" stroke={c} strokeWidth="1.6"/><path d="M2.5 9h15M14 13h1" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  user: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.2" stroke={c} strokeWidth="1.6"/><path d="M3.5 17c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  pin: (c='#fff', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1.5c2.5 0 4.5 2 4.5 4.5 0 3.3-4.5 6.5-4.5 6.5S2.5 9.3 2.5 6 4.5 1.5 7 1.5z" stroke={c} strokeWidth="1.3"/><circle cx="7" cy="6" r="1.5" stroke={c} strokeWidth="1.3"/></svg>
  ),
  clock: (c='#fff', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={c} strokeWidth="1.3"/><path d="M7 4v3l2 1.5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>
  ),
  shield: (c='#00E5A0', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1l5 2v4c0 3-2.1 5.5-5 6.5C4.1 12.5 2 10 2 7V3l5-2z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><path d="M4.5 7l2 2 3-3.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  star: (c='#BCFF4E', s=12, filled=true) => (
    <svg width={s} height={s} viewBox="0 0 12 12"><path d="M6 1l1.5 3.2L11 4.7 8.5 7.2l.7 3.5L6 9l-3.2 1.7.7-3.5L1 4.7l3.5-.5L6 1z" fill={filled?c:'none'} stroke={c} strokeWidth="1"/></svg>
  ),
  mpesa: (c='#00E5A0', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke={c} strokeWidth="1.2"/><path d="M4 7h6M4 5h4M4 9h3" stroke={c} strokeWidth="1.1" strokeLinecap="round"/></svg>
  ),
  bell: (c='#fff', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 12V7a4 4 0 1 1 8 0v5l1 1.5H3L4 12z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M6.5 14.5a1.5 1.5 0 0 0 3 0" stroke={c} strokeWidth="1.5"/></svg>
  ),
  chevron: (c='rgba(255,255,255,0.4)', s=14, dir='right') => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" style={{transform:dir==='down'?'rotate(90deg)':dir==='left'?'rotate(180deg)':'none'}}>
      <path d="M5 3l4 4-4 4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (c='#0A0A0F', s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  id: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="12" rx="2" stroke={c} strokeWidth="1.4"/><circle cx="7" cy="10" r="2" stroke={c} strokeWidth="1.4"/><path d="M11 8.5h4M11 11.5h3" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>
  ),
  camera: (c='#fff', s=20) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 7V6a1 1 0 0 1 1-1h2l1-1.5h4L13 5h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" stroke={c} strokeWidth="1.4"/><circle cx="10" cy="11" r="3" stroke={c} strokeWidth="1.4"/></svg>
  ),
  upload: (c='#fff', s=18) => (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 6l4-4 4 4" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  dispute: (c='#FFB347', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 1.5 L12.5 12 L1.5 12 Z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3" stroke={c} strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="10.5" r="0.6" fill={c}/></svg>
  ),
  download: (c='#fff', s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6l3 3 3-3" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>
  ),
  lock: (c='rgba(255,255,255,0.4)', s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none"><rect x="2" y="5" width="8" height="6" rx="1" stroke={c} strokeWidth="1.2"/><path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke={c} strokeWidth="1.2"/></svg>
  ),
};

Object.assign(window, { GradientBtn, GhostBtn, IconBtn, Eyebrow, Label, Chip, StatusPill, DarkCard, VLine, Logo, LogoMark, StepProgress, I });
