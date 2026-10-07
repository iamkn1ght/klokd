// Klokd-styled phone frame — dark shell by default (worker app)
// Usage: <Phone variant="dark|light" statusTime="9:07">children</Phone>

const PHONE_W = 340;
const SCREEN_H = 680;

function KlokdStatusBar({ dark = true }) {
  const fg = dark ? '#fff' : '#0A0A0F';
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px 0 22px', position: 'relative', flexShrink: 0,
      background: dark ? '#0A0A0F' : '#F4F6F3',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: fg, letterSpacing: '-0.01em' }}>9:07</span>
      {/* camera punch-hole */}
      <div style={{
        position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)',
        width: 8, height: 8, borderRadius: 100, background: '#000',
        boxShadow: '0 0 0 2px ' + (dark ? '#1a1a1f' : '#e0e3e0'),
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* signal */}
        <svg width="13" height="10" viewBox="0 0 13 10">
          <rect x="0" y="6" width="2" height="4" rx="0.5" fill={fg}/>
          <rect x="3.5" y="4" width="2" height="6" rx="0.5" fill={fg}/>
          <rect x="7" y="2" width="2" height="8" rx="0.5" fill={fg}/>
          <rect x="10.5" y="0" width="2" height="10" rx="0.5" fill={fg}/>
        </svg>
        {/* wifi */}
        <svg width="13" height="10" viewBox="0 0 13 10">
          <path d="M6.5 9.5 L9 7 A3.5 3.5 0 0 0 4 7 Z" fill={fg}/>
          <path d="M11.5 4.5 A7 7 0 0 0 1.5 4.5" stroke={fg} strokeWidth="1.3" fill="none"/>
        </svg>
        {/* battery */}
        <div style={{ width: 22, height: 10, border: `1.2px solid ${fg}`, borderRadius: 2.5, padding: 1.5, position: 'relative' }}>
          <div style={{ width: '78%', height: '100%', background: fg, borderRadius: 1 }}/>
          <div style={{ position: 'absolute', right: -2.5, top: 2.5, width: 1.5, height: 4, background: fg, borderRadius: 1 }}/>
        </div>
      </div>
    </div>
  );
}

function KlokdHomeBar({ dark = true }) {
  return (
    <div style={{
      height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: dark ? '#0A0A0F' : '#F4F6F3', flexShrink: 0,
    }}>
      <div style={{ width: 110, height: 4, borderRadius: 999, background: dark ? 'rgba(255,255,255,.35)' : 'rgba(10,10,15,.35)' }}/>
    </div>
  );
}

function Phone({ variant = 'dark', children, showChrome = true, bg }) {
  const dark = variant === 'dark';
  const shell = dark ? '#0A0A0F' : '#F4F6F3';
  const bezel = dark ? '#1a1a22' : '#111';
  return (
    <div style={{
      width: PHONE_W,
      borderRadius: 48,
      background: bezel,
      padding: 4,
      boxShadow: dark
        ? '0 0 0 1.5px #2a2a32, 0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(0,229,160,0.06)'
        : '0 0 0 1.5px #1a1a1a, 0 40px 100px rgba(0,0,0,0.25)',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        borderRadius: 44,
        background: bg || shell,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {showChrome && <KlokdStatusBar dark={dark}/>}
        <div style={{
          height: SCREEN_H,
          position: 'relative',
          overflow: 'hidden',
          background: bg || shell,
        }}>
          {children}
        </div>
        {showChrome && <KlokdHomeBar dark={dark}/>}
      </div>
    </div>
  );
}

Object.assign(window, { Phone, PHONE_W, SCREEN_H });
