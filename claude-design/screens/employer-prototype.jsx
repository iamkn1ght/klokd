// Employer prototype controller — wires all screens in a phone frame
// with left-rail scene nav + Tweaks panel.

const { K, Phone, Logo, I, IE, GradientBtn,
  EmpWelcome, EmpVerify, EmpEscrow,
  EmpDashboard, EmpPostShift, EmpMatched, EmpLiveShift, EmpPaidRate,
  EmpShiftsTab, EmpPayTab, EmpTeamTab, EmpBottomNav, EmpDesktop } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": "electric",
  "density": "comfortable",
  "activeShifts": 2,
  "greeting": "Habari, Wanjiku"
}/*EDITMODE-END*/;

const HUES = {
  electric: { electric:'#00E5A0', volt:'#BCFF4E', grad:'linear-gradient(135deg,#00E5A0,#BCFF4E)' },
  sunrise:  { electric:'#FFB347', volt:'#FFDC5E', grad:'linear-gradient(135deg,#FFB347,#FFDC5E)' },
  cobalt:   { electric:'#60A5FA', volt:'#A78BFA', grad:'linear-gradient(135deg,#60A5FA,#A78BFA)' },
};

const SCENES = [
  { id:'welcome',   label:'01 · Welcome',          group:'Onboarding' },
  { id:'verify',    label:'02 · Business verify',  group:'Onboarding' },
  { id:'escrow',    label:'03 · Fund escrow',      group:'Onboarding' },
  { id:'dashboard', label:'04 · Dashboard',        group:'Main flow' },
  { id:'post',      label:'05 · Post shift',       group:'Main flow' },
  { id:'matched',   label:'06 · Matched workers',  group:'Main flow' },
  { id:'live',      label:'07 · Live shift',       group:'Main flow' },
  { id:'paid',      label:'08 · Paid + rate',      group:'Main flow' },
  { id:'shifts',    label:'09 · Shifts tab',       group:'Tabs' },
  { id:'pay',       label:'10 · Pay tab',          group:'Tabs' },
  { id:'team',      label:'11 · Team tab',         group:'Tabs' },
  { id:'desktop',   label:'12 · Desktop view',     group:'Bonus' },
];

function EmployerApp() {
  const [tweaks, setTweaks] = React.useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem('klokd-emp-tweaks')||'{}') }; }
    catch { return TWEAK_DEFAULTS; }
  });
  const [scene, setScene] = React.useState(() => localStorage.getItem('klokd-emp-scene') || 'welcome');
  const [tab, setTab] = React.useState('home');
  const [editMode, setEditMode] = React.useState(false);

  React.useEffect(()=>{
    const h = HUES[tweaks.accentHue] || HUES.electric;
    window.K.electric = h.electric;
    window.K.volt = h.volt;
    window.K.brandGrad = h.grad;
    window.K.mintGlow = `radial-gradient(circle, ${h.electric}26 0%, transparent 70%)`;
  }, [tweaks.accentHue]);

  React.useEffect(()=>{ localStorage.setItem('klokd-emp-scene', scene); }, [scene]);

  React.useEffect(()=>{
    const onMsg=(e)=>{
      if (!e.data || typeof e.data!=='object') return;
      if (e.data.type==='__activate_edit_mode') setEditMode(true);
      if (e.data.type==='__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return ()=>window.removeEventListener('message', onMsg);
  }, []);

  const setKey = (k,v) => {
    setTweaks(t=>{
      const next = {...t,[k]:v};
      localStorage.setItem('klokd-emp-tweaks', JSON.stringify(next));
      window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*');
      return next;
    });
  };

  const go = (id) => setScene(id);

  const showTabs = ['dashboard','shifts','pay','team'].includes(scene);
  const onTab = (t) => {
    setTab(t);
    if (t==='home') go('dashboard');
    if (t==='shifts') go('shifts');
    if (t==='pay') go('pay');
    if (t==='team') go('team');
  };
  // Keep tab synced to scene
  React.useEffect(()=>{
    if (scene==='dashboard') setTab('home');
    else if (scene==='shifts') setTab('shifts');
    else if (scene==='pay') setTab('pay');
    else if (scene==='team') setTab('team');
  }, [scene]);

  let body;
  switch (scene) {
    case 'welcome':   body = <EmpWelcome onNext={()=>go('verify')}/>; break;
    case 'verify':    body = <EmpVerify onBack={()=>go('welcome')} onNext={()=>go('escrow')}/>; break;
    case 'escrow':    body = <EmpEscrow onBack={()=>go('verify')} onDone={()=>go('dashboard')}/>; break;
    case 'post':      body = <EmpPostShift onBack={()=>go('dashboard')} onPosted={()=>go('matched')}/>; break;
    case 'matched':   body = <EmpMatched onBack={()=>go('post')} onConfirm={()=>go('live')}/>; break;
    case 'live':      body = <EmpLiveShift onBack={()=>go('dashboard')} onRelease={()=>go('paid')}/>; break;
    case 'paid':      body = <EmpPaidRate onDone={()=>go('dashboard')}/>; break;
    case 'dashboard': body = <EmpDashboard greeting={tweaks.greeting} onPost={()=>go('post')} onOpenShift={()=>go('live')}/>; break;
    case 'shifts':    body = <EmpShiftsTab/>; break;
    case 'pay':       body = <EmpPayTab/>; break;
    case 'team':      body = <EmpTeamTab/>; break;
    default: body = null;
  }

  // Desktop scene uses a big surface instead of phone
  const isDesktop = scene === 'desktop';

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'40px 20px 40px 260px', background:'#0F0F14', position:'relative', overflow:'auto',
      fontFamily:K.fontFamily,
    }}>
      <SceneNav scenes={SCENES} scene={scene} onPick={go}/>

      {isDesktop ? (
        <div style={{width:'min(100%, 1180px)',height:720,borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 30px 80px rgba(0,0,0,0.4)'}} key={tweaks.accentHue}>
          <EmpDesktop/>
        </div>
      ) : (
        <Phone variant="dark" bg={K.ink}>
          <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:K.ink,color:'#fff'}} key={tweaks.accentHue}>
            {showTabs ? (
              <>
                {body}
                <EmpBottomNav tab={tab} onTab={onTab} badges={{shifts:String(tweaks.activeShifts||2)}}/>
              </>
            ) : body}
          </div>
        </Phone>
      )}

      {editMode && <TweaksPanel tweaks={tweaks} setKey={setKey}/>}
      <HintStrip editMode={editMode}/>
    </div>
  );
}

function SceneNav({ scenes, scene, onPick }) {
  const grouped = {};
  scenes.forEach(s=>{(grouped[s.group]=grouped[s.group]||[]).push(s);});
  return (
    <div style={{
      position:'fixed', left:20, top:20, bottom:20, width:220,
      background:'#15151C', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:16, padding:'18px 14px', overflowY:'auto',
      fontFamily:K.fontFamily, zIndex:5, boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
    }}>
      <div style={{padding:'0 6px 14px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',marginBottom:12}}>
        <Logo size={22}/>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:8,letterSpacing:'0.08em',textTransform:'uppercase'}}>Employer prototype · v1</div>
      </div>
      {Object.entries(grouped).map(([g,list])=>(
        <div key={g} style={{marginBottom:14}}>
          <div style={{fontSize:9.5,color:'rgba(255,255,255,0.35)',letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,padding:'0 6px 6px'}}>{g}</div>
          {list.map(s=>{
            const active = scene===s.id;
            return (
              <button key={s.id} onClick={()=>onPick(s.id)} style={{
                display:'block',width:'100%',textAlign:'left',padding:'7px 10px',borderRadius:8,
                border:'none',cursor:'pointer',
                background: active?`${window.K.electric}1a`:'transparent',
                color: active?window.K.electric:'rgba(255,255,255,0.65)',
                fontFamily:K.fontFamily,fontSize:11.5,fontWeight:active?700:500,marginBottom:2,transition:'all .15s',
              }}>{s.label}</button>
            );
          })}
        </div>
      ))}
      <div style={{marginTop:8,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',lineHeight:1.5}}>Jump to any scene. Buttons inside advance the flow.</div>
      </div>
    </div>
  );
}

function TweaksPanel({ tweaks, setKey }) {
  const Row = ({label,children}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
  const Swatch = ({active,onClick,colors,label}) => (
    <button onClick={onClick} style={{
      flex:1,padding:'8px 6px',borderRadius:10,
      border:active?`1.5px solid ${window.K.electric}`:'1px solid rgba(255,255,255,0.08)',
      background:active?`${window.K.electric}14`:'rgba(255,255,255,0.03)',
      cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,fontFamily:K.fontFamily,
    }}>
      <div style={{display:'flex',gap:3}}>
        {colors.map((c,i)=><div key={i} style={{width:14,height:14,borderRadius:4,background:c}}/>)}
      </div>
      <span style={{fontSize:10,color:active?window.K.electric:'rgba(255,255,255,0.6)',fontWeight:600}}>{label}</span>
    </button>
  );
  return (
    <div style={{position:'fixed',right:20,bottom:20,width:260,background:'#15151C',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:16,fontFamily:K.fontFamily,zIndex:6,boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>Tweaks</span>
        <span style={{fontSize:9.5,color:'rgba(255,255,255,0.35)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>Klokd · employer</span>
      </div>
      <Row label="Accent">
        <div style={{display:'flex',gap:6}}>
          <Swatch active={tweaks.accentHue==='electric'} onClick={()=>setKey('accentHue','electric')} colors={['#00E5A0','#BCFF4E']} label="Electric"/>
          <Swatch active={tweaks.accentHue==='sunrise'}  onClick={()=>setKey('accentHue','sunrise')}  colors={['#FFB347','#FFDC5E']} label="Sunrise"/>
          <Swatch active={tweaks.accentHue==='cobalt'}   onClick={()=>setKey('accentHue','cobalt')}   colors={['#60A5FA','#A78BFA']} label="Cobalt"/>
        </div>
      </Row>
      <Row label="Density">
        <div style={{display:'flex',gap:6}}>
          {['compact','comfortable'].map(d=>{
            const active = tweaks.density===d;
            return (
              <button key={d} onClick={()=>setKey('density',d)} style={{
                flex:1,padding:'9px 4px',borderRadius:10,
                border:active?`1.5px solid ${window.K.electric}`:'1px solid rgba(255,255,255,0.08)',
                background:active?`${window.K.electric}14`:'rgba(255,255,255,0.03)',
                color:active?window.K.electric:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:600,
                cursor:'pointer',fontFamily:K.fontFamily,textTransform:'capitalize',
              }}>{d}</button>
            );
          })}
        </div>
      </Row>
      <Row label="Active shifts badge">
        <input type="range" min={0} max={9} value={tweaks.activeShifts} onChange={e=>setKey('activeShifts', +e.target.value)} style={{width:'100%',accentColor:window.K.electric}}/>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.55)',fontFamily:K.mono,marginTop:2}}>{tweaks.activeShifts} shifts</div>
      </Row>
      <Row label="Greeting copy">
        <input value={tweaks.greeting} onChange={e=>setKey('greeting',e.target.value)} style={{
          width:'100%',padding:'9px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,255,255,0.04)',color:'#fff',fontSize:12,fontFamily:K.fontFamily,outline:'none',boxSizing:'border-box',
        }}/>
      </Row>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.3)',lineHeight:1.5,marginTop:6,paddingTop:10,borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
        Visible because Tweaks mode is on. Toggle off in the toolbar to preview clean.
      </div>
    </div>
  );
}

function HintStrip({editMode}) {
  if (editMode) return null;
  return (
    <div style={{position:'fixed',right:20,bottom:20,padding:'10px 14px',background:'rgba(21,21,28,0.95)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,fontFamily:K.fontFamily,fontSize:11,color:'rgba(255,255,255,0.55)',backdropFilter:'blur(12px)',zIndex:5,maxWidth:240}}>
      <span style={{color:window.K.electric,fontWeight:700}}>⚙︎ Tweaks off.</span> Toggle in the toolbar to change accent, density & copy.
    </div>
  );
}

Object.assign(window, { EmployerApp });
