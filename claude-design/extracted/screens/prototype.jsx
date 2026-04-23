// Main prototype controller — wires onboarding + main flow into an Android frame
// with in-frame nav, scene jump, and a Tweaks panel.

const { K, Phone, Welcome, Consent, VerifyID, Skills, Mpesa,
  BottomNav, Home, ShiftDetail, ClockIn, Active, PaymentConfirmed,
  ShiftsTab, PayTab, MeTab, DEMO_SHIFTS, Logo, I, GradientBtn } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": "electric",
  "surfaceMood": "ink",
  "greeting": "Good morning, Akinyi",
  "cornerStyle": "rounded",
  "showAmbientGlow": true
}/*EDITMODE-END*/;

// Accent palette options
const HUES = {
  electric: { electric:'#00E5A0', volt:'#BCFF4E', grad:'linear-gradient(135deg,#00E5A0,#BCFF4E)' },
  sunrise:  { electric:'#FFB347', volt:'#FFDC5E', grad:'linear-gradient(135deg,#FFB347,#FFDC5E)' },
  cobalt:   { electric:'#60A5FA', volt:'#A78BFA', grad:'linear-gradient(135deg,#60A5FA,#A78BFA)' },
};
const MOODS = {
  ink:    { base:'#0A0A0F', tint:'#1A1A2E' },
  midnight:{ base:'#05070F', tint:'#12152B' },
  charcoal:{ base:'#14141A', tint:'#23232E' },
};

// Scenes — each returns a screen function
const SCENES = [
  { id:'welcome',     label:'01 · Welcome',         group:'Onboarding' },
  { id:'consent',     label:'02 · Consent',         group:'Onboarding' },
  { id:'verify',      label:'03 · Verify ID',       group:'Onboarding' },
  { id:'skills',      label:'04 · Skills',          group:'Onboarding' },
  { id:'mpesa',       label:'05 · M-Pesa',          group:'Onboarding' },
  { id:'home',        label:'06 · Home',            group:'Main' },
  { id:'shift',       label:'07 · Shift detail',    group:'Main' },
  { id:'clockin',     label:'08 · Clock in',        group:'Main' },
  { id:'active',      label:'09 · Active shift',    group:'Main' },
  { id:'paid',        label:'10 · Paid',            group:'Main' },
  { id:'shifts',      label:'11 · Shifts tab',      group:'Tabs' },
  { id:'pay',         label:'12 · Pay tab',         group:'Tabs' },
  { id:'me',          label:'13 · Me tab',          group:'Tabs' },
];

function PrototypeApp() {
  const [tweaks, setTweaks] = React.useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem('klokd-tweaks')||'{}') }; }
    catch { return TWEAK_DEFAULTS; }
  });
  const [scene, setScene] = React.useState(() => localStorage.getItem('klokd-scene') || 'welcome');
  const [shift, setShift] = React.useState(DEMO_SHIFTS[0]);
  const [tab, setTab] = React.useState('home');
  const [showTweaks, setShowTweaks] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);

  // Apply accent swap globally by patching window.K at mount
  React.useEffect(() => {
    const h = HUES[tweaks.accentHue] || HUES.electric;
    window.K.electric = h.electric;
    window.K.volt = h.volt;
    window.K.brandGrad = h.grad;
    window.K.mintGlow = `radial-gradient(circle, ${h.electric}26 0%, transparent 70%)`;
    const m = MOODS[tweaks.surfaceMood] || MOODS.ink;
    window.K.ink = m.base;
    window.K.slate = m.tint;
    window.K.darkGrad = `linear-gradient(135deg,${m.base},${m.tint})`;
  }, [tweaks.accentHue, tweaks.surfaceMood]);

  React.useEffect(() => { localStorage.setItem('klokd-scene', scene); }, [scene]);

  // Edit-mode host bridge
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setEditMode(true);
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setKey = (k, v) => {
    setTweaks(t => {
      const next = { ...t, [k]: v };
      localStorage.setItem('klokd-tweaks', JSON.stringify(next));
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  // Scene routing
  const go = (id) => setScene(id);
  const openShift = (s) => { setShift(s); setScene('shift'); };

  let screen;
  switch (scene) {
    case 'welcome': screen = <Welcome onNext={()=>go('consent')}/>; break;
    case 'consent': screen = <Consent onBack={()=>go('welcome')} onNext={()=>go('verify')}/>; break;
    case 'verify':  screen = <VerifyID onBack={()=>go('consent')} onNext={()=>go('skills')}/>; break;
    case 'skills':  screen = <Skills onBack={()=>go('verify')} onNext={()=>go('mpesa')}/>; break;
    case 'mpesa':   screen = <Mpesa onBack={()=>go('skills')} onDone={()=>{ setTab('home'); go('home'); }}/>; break;
    case 'shift':   screen = <ShiftDetail shift={shift} onBack={()=>go('home')} onAccept={()=>go('clockin')}/>; break;
    case 'clockin': screen = <ClockIn shift={shift} onBack={()=>go('shift')} onClockIn={()=>go('active')}/>; break;
    case 'active':  screen = <Active shift={shift} onBack={()=>go('home')} onClockOut={()=>go('paid')}/>; break;
    case 'paid':    screen = <PaymentConfirmed onHome={()=>{ setTab('home'); go('home'); }}/>; break;
    case 'shifts':  screen = null; break;
    case 'pay':     screen = null; break;
    case 'me':      screen = null; break;
    case 'home':
    default:        screen = null; break;
  }

  // Tabbed scenes
  const onTab = (t) => {
    setTab(t);
    if (t === 'home') go('home');
    if (t === 'shifts') go('shifts');
    if (t === 'pay') go('pay');
    if (t === 'me') go('me');
  };

  const showTabs = ['home','shifts','pay','me'].includes(scene);

  const greeting = tweaks.greeting || 'Good morning, Akinyi';
  // Override Home greeting by wrapping
  const HomeWithGreet = () => (
    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
      <PatchedHome greeting={greeting} onOpenShift={openShift}/>
    </div>
  );

  let tabBody = null;
  if (showTabs) {
    if (tab === 'home')   tabBody = <HomeWithGreet/>;
    if (tab === 'shifts') tabBody = <ShiftsTab/>;
    if (tab === 'pay')    tabBody = <PayTab/>;
    if (tab === 'me')     tabBody = <MeTab/>;
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'40px 20px', background:'#0F0F14', position:'relative', overflow:'auto',
      fontFamily: K.fontFamily,
    }}>
      <SceneNav scenes={SCENES} scene={scene} onPick={go}/>

      <Phone variant="dark" bg={window.K.ink}>
        <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:window.K.ink,color:'#fff'}} key={tweaks.accentHue+tweaks.surfaceMood}>
          {showTabs ? (
            <>
              {tabBody}
              <BottomNav tab={tab} onTab={onTab}/>
            </>
          ) : screen}
        </div>
      </Phone>

      {editMode && (
        <TweaksPanel tweaks={tweaks} setKey={setKey} onClose={()=>setShowTweaks(false)}/>
      )}

      <HintStrip scene={scene} editMode={editMode}/>
    </div>
  );
}

// Patched Home that accepts a greeting prop
function PatchedHome({ greeting, onOpenShift }) {
  const orig = window.Home;
  // Re-implement header inline so we can swap greeting without a full rewrite.
  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:window.K.ink}}>
      <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:2}}>Thursday · 3 Apr</div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em'}}>{greeting}</div>
        </div>
        <div style={{position:'relative'}}>
          <button style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            {I.bell('#fff',16)}
          </button>
          <div style={{position:'absolute',top:6,right:6,width:7,height:7,borderRadius:'50%',background:window.K.electric,border:'1.5px solid '+window.K.ink}}/>
        </div>
      </div>
      {/* Re-use the rest of Home by calling the original but hiding its header is messy — instead inline the pieces from main.jsx that aren't the greeting */}
      <HomeBody onOpenShift={onOpenShift}/>
    </div>
  );
}

// Simplified body: stats + shift feed (matches Home minus the header)
function HomeBody({ onOpenShift }) {
  const { Label, VLine } = window;
  const Stat = ({n,l,c,star})=>(
    <div style={{flex:1,textAlign:'center',padding:'0 4px'}}>
      <div style={{fontSize:18,fontWeight:900,color:c,letterSpacing:'-0.02em',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
        {n}{star && <span style={{fontSize:12}}>{I.star(c,11)}</span>}
      </div>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.08em',textTransform:'uppercase',marginTop:3}}>{l}</div>
    </div>
  );
  const ShiftCard = ({shift,dim=0,onClick})=>{
    const isHi = shift.highlighted;
    return (
      <div onClick={onClick} style={{
        borderRadius:16,padding:14,cursor:'pointer',
        background: isHi ? `linear-gradient(180deg,${window.K.electric}12,${window.K.electric}02)` : 'rgba(255,255,255,0.025)',
        border: isHi ? `1px solid ${window.K.electric}66` : '1px solid rgba(255,255,255,0.06)',
        opacity:1-dim,transition:'all .2s',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <span style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-0.02em'}}>{shift.role}</span>
              {isHi && <window.StatusPill tone="mint">New</window.StatusPill>}
            </div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.55)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shift.venue}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',display:'inline-flex',alignItems:'center',gap:3}}>{I.pin('rgba(255,255,255,0.4)',10)} {shift.dist}</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>·</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',display:'inline-flex',alignItems:'center',gap:3}}>{I.star(window.K.volt,10)} {shift.rating}</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>·</span>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{shift.shifts} shifts</span>
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:17,fontWeight:900,color:window.K.electric,letterSpacing:'-0.02em'}}>KES {shift.pay.toLocaleString()}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:2}}>{shift.date}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'4px 9px',borderRadius:999,fontSize:10.5,fontWeight:600,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.65)'}}>{shift.time}</span>
          <span style={{padding:'4px 9px',borderRadius:999,fontSize:10.5,fontWeight:600,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.65)'}}>{shift.area}</span>
          {isHi && <span style={{padding:'4px 9px',borderRadius:999,fontSize:10.5,fontWeight:600,background:`${window.K.volt}1a`,color:window.K.volt}}>Fills fast</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{padding:'14px 20px 0'}}>
        <div style={{borderRadius:18,padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-30,right:-40,width:120,height:120,borderRadius:'50%',background:window.K.mintGlow,pointerEvents:'none'}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10,position:'relative'}}>
            <Label color="rgba(255,255,255,0.4)">Your ledger · 47 shifts</Label>
            <span style={{fontSize:10,color:window.K.electric,fontWeight:700}}>VERIFIED</span>
          </div>
          <div style={{display:'flex',gap:0,position:'relative'}}>
            <Stat n="94%" l="show-up" c={window.K.electric}/>
            <VLine/>
            <Stat n="4.8" l="rating" c={window.K.volt} star/>
            <VLine/>
            <Stat n="KES 84k" l="this month" c="#fff"/>
          </div>
        </div>
      </div>
      <div style={{padding:'20px 20px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <Label>Shifts near you · 4</Label>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Sorted by distance</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {DEMO_SHIFTS.map((s,i)=>(
            <ShiftCard key={s.id} shift={s} dim={i>0?0.08*i:0} onClick={()=>onOpenShift(s)}/>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Scene nav (left rail) ───
function SceneNav({ scenes, scene, onPick }) {
  const grouped = {};
  scenes.forEach(s => { (grouped[s.group] = grouped[s.group] || []).push(s); });
  return (
    <div style={{
      position:'fixed', left:20, top:20, bottom:20, width:220,
      background:'#15151C', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:16, padding:'18px 14px', overflowY:'auto',
      fontFamily:K.fontFamily, zIndex:5,
      boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{padding:'0 6px 14px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',marginBottom:12}}>
        <Logo size={22}/>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:8,letterSpacing:'0.08em',textTransform:'uppercase'}}>Worker prototype · v1</div>
      </div>
      {Object.entries(grouped).map(([g,list])=>(
        <div key={g} style={{marginBottom:14}}>
          <div style={{fontSize:9.5,color:'rgba(255,255,255,0.35)',letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,padding:'0 6px 6px'}}>{g}</div>
          {list.map(s=>{
            const active = scene === s.id;
            return (
              <button key={s.id} onClick={()=>onPick(s.id)} style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'7px 10px', borderRadius:8, border:'none', cursor:'pointer',
                background: active ? `${window.K.electric}1a` : 'transparent',
                color: active ? window.K.electric : 'rgba(255,255,255,0.65)',
                fontFamily:K.fontFamily, fontSize:11.5, fontWeight: active?700:500,
                marginBottom:2, transition:'all .15s',
              }}>{s.label}</button>
            );
          })}
        </div>
      ))}
      <div style={{marginTop:8,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',lineHeight:1.5}}>
          Tap any scene to jump. Buttons inside the phone advance the flow.
        </div>
      </div>
    </div>
  );
}

// ─── Tweaks panel ───
function TweaksPanel({ tweaks, setKey }) {
  const Row = ({label,children}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
  const Swatch = ({active,onClick,colors,label}) => (
    <button onClick={onClick} style={{
      flex:1,padding:'8px 6px',borderRadius:10,border:active?`1.5px solid ${window.K.electric}`:'1px solid rgba(255,255,255,0.08)',
      background:active?`${window.K.electric}14`:'rgba(255,255,255,0.03)',cursor:'pointer',
      display:'flex',flexDirection:'column',alignItems:'center',gap:5,fontFamily:K.fontFamily,
    }}>
      <div style={{display:'flex',gap:3}}>
        {colors.map((c,i)=><div key={i} style={{width:14,height:14,borderRadius:4,background:c}}/>)}
      </div>
      <span style={{fontSize:10,color:active?window.K.electric:'rgba(255,255,255,0.6)',fontWeight:600}}>{label}</span>
    </button>
  );
  return (
    <div style={{
      position:'fixed', right:20, bottom:20, width:260,
      background:'#15151C', border:'1px solid rgba(255,255,255,0.08)',
      borderRadius:16, padding:16, fontFamily:K.fontFamily, zIndex:6,
      boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>Tweaks</span>
        <span style={{fontSize:9.5,color:'rgba(255,255,255,0.35)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>Klokd · worker</span>
      </div>

      <Row label="Accent">
        <div style={{display:'flex',gap:6}}>
          <Swatch active={tweaks.accentHue==='electric'} onClick={()=>setKey('accentHue','electric')} colors={['#00E5A0','#BCFF4E']} label="Electric"/>
          <Swatch active={tweaks.accentHue==='sunrise'}  onClick={()=>setKey('accentHue','sunrise')}  colors={['#FFB347','#FFDC5E']} label="Sunrise"/>
          <Swatch active={tweaks.accentHue==='cobalt'}   onClick={()=>setKey('accentHue','cobalt')}   colors={['#60A5FA','#A78BFA']} label="Cobalt"/>
        </div>
      </Row>

      <Row label="Surface mood">
        <div style={{display:'flex',gap:6}}>
          {['ink','midnight','charcoal'].map(m=>{
            const active = tweaks.surfaceMood===m;
            return (
              <button key={m} onClick={()=>setKey('surfaceMood',m)} style={{
                flex:1,padding:'8px 4px',borderRadius:10,border:active?`1.5px solid ${window.K.electric}`:'1px solid rgba(255,255,255,0.08)',
                background:MOODS[m].base,cursor:'pointer',color:active?window.K.electric:'rgba(255,255,255,0.6)',
                fontSize:10,fontWeight:600,fontFamily:K.fontFamily,textTransform:'capitalize',
              }}>{m}</button>
            );
          })}
        </div>
      </Row>

      <Row label="Greeting copy">
        <input value={tweaks.greeting} onChange={e=>setKey('greeting',e.target.value)} style={{
          width:'100%',padding:'9px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,255,255,0.04)',color:'#fff',fontSize:12,fontFamily:K.fontFamily,outline:'none',
          boxSizing:'border-box',
        }}/>
      </Row>

      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.3)',lineHeight:1.5,marginTop:6,paddingTop:10,borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
        Visible because Tweaks mode is on. Toggle off in the toolbar to preview the design clean.
      </div>
    </div>
  );
}

function HintStrip({ scene, editMode }) {
  if (editMode) return null;
  return (
    <div style={{
      position:'fixed', right:20, bottom:20, padding:'10px 14px',
      background:'rgba(21,21,28,0.95)', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:12, fontFamily:K.fontFamily, fontSize:11, color:'rgba(255,255,255,0.55)',
      backdropFilter:'blur(12px)', zIndex:5, maxWidth:240,
    }}>
      <span style={{color:window.K.electric,fontWeight:700}}>⚙︎ Tweaks off.</span> Toggle in the toolbar to change accent, mood, and copy.
    </div>
  );
}

Object.assign(window, { PrototypeApp });
