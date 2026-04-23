// Worker onboarding: 5 screens
// Welcome → Consent → Verify ID → Skills → M-Pesa

const { K, GradientBtn, GhostBtn, IconBtn, Eyebrow, Label, Chip, StatusPill, DarkCard, VLine, Logo, LogoMark, StepProgress, I, Phone } = window;

// ─── Shared header ───
function OnbHeader({ step, total=5, onBack, onSkip }) {
  return (
    <div style={{ padding: '12px 18px 0', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width:34,height:34,borderRadius:'50%',border:'0.5px solid rgba(255,255,255,0.12)',
          background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
        }}>{I.back('#fff',14)}</button>
      ) : <div style={{width:34}}/>}
      <StepProgress step={step} total={total}/>
      <div style={{width:34,display:'flex',justifyContent:'flex-end'}}>
        {onSkip && <button onClick={onSkip} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily}}>Skip</button>}
      </div>
    </div>
  );
}

// ═══ 01 WELCOME ═══
function Welcome({ onNext, staticSlide }) {
  const [slide, setSlide] = React.useState(staticSlide ?? 0);
  const slides = [
    { kicker:'01 · VERIFIED', head:'Verified once.\nWork everywhere.', sub:'One National ID check. Every employer sees the same trusted badge.' },
    { kicker:'02 · INSTANT',  head:'Shifts near you.\nApply in seconds.', sub:'Real shifts. Real rates. Sorted by distance, always.' },
    { kicker:'03 · PAID',     head:'Clock out.\nM-Pesa pays you.', sub:'Average 18 minutes from clock-out to cash. No chasing, no WhatsApp.' },
  ];
  React.useEffect(()=>{
    if (staticSlide != null) return;
    const t=setTimeout(()=>setSlide(s=>(s+1)%3), 3800);
    return()=>clearTimeout(t);
  }, [slide, staticSlide]);
  const s = slides[slide];
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink, color:'#fff', position:'relative', overflow:'hidden'}}>
      {/* ambient glow */}
      <div style={{position:'absolute',top:-60,left:'50%',transform:'translateX(-50%)',width:380,height:380,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:220,right:-80,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(188,255,78,0.08),transparent 70%)',pointerEvents:'none'}}/>
      {/* logo */}
      <div style={{padding:'28px 24px 0',position:'relative',zIndex:1}}>
        <Logo size={30}/>
      </div>
      {/* content */}
      <div style={{flex:1,padding:'0 24px',display:'flex',flexDirection:'column',justifyContent:'flex-end',paddingBottom:32,position:'relative',zIndex:1}}>
        <div style={{marginBottom:'auto',paddingTop:36}}>
          {/* surprise metaphor: a large, growing ledger of verified stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[
              {k:'16,412',l:'shifts paid'},
              {k:'94.2%',l:'show-up rate'},
              {k:'KES 1,823',l:'avg pay/shift'},
              {k:'18 min',l:'clock-out → M-Pesa'},
            ].map((m,i)=>(
              <div key={i} style={{padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:14,fontWeight:900,color:i%2?K.volt:K.electric, letterSpacing:'-0.02em'}}>{m.k}</div>
                <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',letterSpacing:'0.04em',textTransform:'uppercase',marginTop:2}}>{m.l}</div>
              </div>
            ))}
          </div>
          <Label color="rgba(255,255,255,0.3)" style={{marginTop:4}}>Live, last 30 days · Nairobi</Label>
        </div>

        <div style={{marginBottom:20}}>
          <Eyebrow style={{marginBottom:10,color:K.electric}}>{s.kicker}</Eyebrow>
          <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1.03,margin:'0 0 12px',whiteSpace:'pre-line'}}>{s.head}</h1>
          <p style={{fontSize:13.5,color:'rgba(255,255,255,0.55)',lineHeight:1.55,margin:0}}>{s.sub}</p>
        </div>

        <div style={{display:'flex',gap:4,marginBottom:16}}>
          {slides.map((_,i)=>(
            <div key={i} onClick={()=>setSlide(i)} style={{
              flex: i===slide?2:1, height:3, borderRadius:999,
              background: i===slide?K.electric:'rgba(255,255,255,0.12)',
              transition:'flex .4s, background .4s', cursor:'pointer',
            }}/>
          ))}
        </div>

        <GradientBtn onClick={onNext}>Get started</GradientBtn>
        <button style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:500,marginTop:14,cursor:'pointer',fontFamily:K.fontFamily,width:'100%'}}>
          I already have an account
        </button>
      </div>
    </div>
  );
}

// ═══ 02 CONSENT ═══
function Consent({ onBack, onNext }) {
  const [idOK, setIdOK] = React.useState(false);
  const [gpsOK, setGpsOK] = React.useState(false);
  const ready = idOK && gpsOK;

  const items = [
    { icon:I.id('#00E5A0',18), name:'National ID',      meta:'Front, back, selfie',  use:'Verify it\'s you. Stored encrypted for 3 years.', who:'Employers see: verified badge only.' },
    { icon:I.pin('#00E5A0',18), name:'Location (GPS)',   meta:'Clock-in only',         use:'Proves you\'re at the venue. Never tracked off-shift.', who:'Employers see: clock-in confirmed only.' },
    { icon:I.mpesa('#00E5A0',18),name:'M-Pesa number',   meta:'For payment',           use:'Receive earnings after every shift.', who:'Employers see: never.' },
    { icon:I.clock('#00E5A0',12),name:'Shift history',   meta:'Your reputation',       use:'Builds your rating, show-up rate, portable record.', who:'Employers see: rating & show-up rate.' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <OnbHeader step={1} onBack={onBack}/>
      <div style={{padding:'20px 22px 0',flexShrink:0}}>
        <Eyebrow style={{color:'rgba(255,255,255,0.4)',marginBottom:8}}>Step 2 of 5 · Your data</Eyebrow>
        <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 8px'}}>Before we start — here's exactly what we collect.</h2>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55,margin:0}}>No surprises. No selling your data. DPA 2019 compliant.</p>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 22px 0'}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {items.map((it,i)=>(
            <div key={i} style={{
              padding:'12px 13px',borderRadius:14,
              background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{display:'flex',gap:11,alignItems:'flex-start',marginBottom:8}}>
                <div style={{width:34,height:34,borderRadius:10,background:'rgba(0,229,160,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{it.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{it.name}</span>
                    <span style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.04em',textTransform:'uppercase',flexShrink:0}}>{it.meta}</span>
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',lineHeight:1.5,marginBottom:4}}>{it.use}</div>
                  <div style={{fontSize:10,color:K.electric,fontWeight:600}}>{it.who}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:14,padding:14,borderRadius:14,background:'rgba(0,229,160,0.04)',border:'1px solid rgba(0,229,160,0.2)'}}>
          <Eyebrow style={{marginBottom:10}}>I agree to share</Eyebrow>
          <ConsentToggle label="My identity documents" on={idOK} onChange={setIdOK}/>
          <div style={{height:8}}/>
          <ConsentToggle label="My GPS at clock-in" on={gpsOK} onChange={setGpsOK}/>
        </div>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.35)',lineHeight:1.55,marginTop:10,marginBottom:14}}>
          By continuing, you agree to our <span style={{color:K.electric,textDecoration:'underline'}}>Privacy Policy</span> and <span style={{color:K.electric,textDecoration:'underline'}}>Terms</span>. You can change your consent any time in Me → Privacy.
        </div>
      </div>

      <div style={{padding:'14px 22px 20px',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <GradientBtn disabled={!ready} onClick={onNext}>{ready?'Continue':'Agree to both to continue'}</GradientBtn>
      </div>
    </div>
  );
}

function ConsentToggle({ label, on, onChange }) {
  return (
    <div onClick={()=>onChange(!on)} style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',
      padding:'8px 10px',borderRadius:10,background:on?'rgba(0,229,160,0.08)':'rgba(255,255,255,0.02)',
      border:on?'1px solid rgba(0,229,160,0.3)':'1px solid rgba(255,255,255,0.06)',
      transition:'all .2s',
    }}>
      <span style={{fontSize:12.5,fontWeight:600,color:on?'#fff':'rgba(255,255,255,0.65)'}}>{label}</span>
      <div style={{
        width:36,height:20,borderRadius:999,padding:2,
        background:on?K.electric:'rgba(255,255,255,0.1)',
        transition:'background .2s',
      }}>
        <div style={{
          width:16,height:16,borderRadius:'50%',background:'#fff',
          transform:on?'translateX(16px)':'translateX(0)',transition:'transform .22s',
        }}/>
      </div>
    </div>
  );
}

// ═══ 03 VERIFY ID ═══
function VerifyID({ onBack, onNext }) {
  const [state, setState] = React.useState({ front:false, back:false, selfie:false });
  const ready = state.front && state.back && state.selfie;
  const zones = [
    { key:'front',  label:'National ID · front', meta:'Serial, DOB, photo visible', icon:I.id },
    { key:'back',   label:'National ID · back',  meta:'All text legible',          icon:I.id },
    { key:'selfie', label:'Selfie · liveness',   meta:'Look at camera, no filter', icon:I.camera },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <OnbHeader step={2} onBack={onBack}/>
      <div style={{padding:'20px 22px 0',flexShrink:0}}>
        <Eyebrow style={{color:'rgba(255,255,255,0.4)',marginBottom:8}}>Step 3 of 5 · ID verification</Eyebrow>
        <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 8px'}}>Get your Verified badge.</h2>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55,margin:0}}>Every worker on Klokd is verified. That's why employers trust you — and why you always work somewhere safe.</p>
      </div>

      {/* Badge preview */}
      <div style={{padding:'16px 22px 12px',display:'flex',justifyContent:'center',flexShrink:0}}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:10,padding:'8px 14px 8px 10px',
          borderRadius:999,background:'linear-gradient(90deg,rgba(0,229,160,0.15),rgba(188,255,78,0.1))',
          border:'1px solid rgba(0,229,160,0.35)',
        }}>
          <div style={{width:22,height:22,borderRadius:'50%',background:K.brandGrad,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {I.shield('#0A0A0F',12)}
          </div>
          <span style={{fontSize:11.5,fontWeight:700,color:K.electric,letterSpacing:'0.02em'}}>VERIFIED WORKER · unlocks all shifts</span>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 22px 0'}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {zones.map(z => (
            <UploadZone key={z.key} label={z.label} meta={z.meta} Icon={z.icon} done={state[z.key]}
              onClick={()=>setState(s=>({ ...s, [z.key]:!s[z.key] }))}/>
          ))}
        </div>

        <div style={{marginTop:14,display:'flex',gap:8,padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
          {I.lock('rgba(255,255,255,0.45)',12)}
          <span style={{fontSize:10.5,color:'rgba(255,255,255,0.45)',lineHeight:1.55}}>
            Encrypted in transit. Stored in Kenya (AWS Cape Town). Your ID number is hashed, never visible to employers.
          </span>
        </div>
      </div>

      <div style={{padding:'14px 22px 20px',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <GradientBtn disabled={!ready} onClick={onNext}>
          {ready?'Submit for verification':`${Object.values(state).filter(Boolean).length} of 3 uploaded`}
        </GradientBtn>
      </div>
    </div>
  );
}

function UploadZone({ label, meta, Icon, done, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding:'13px 14px',borderRadius:14,display:'flex',alignItems:'center',gap:12,cursor:'pointer',
      transition:'all .25s',
      border: done?`1.5px solid ${K.electric}`:'1.5px dashed rgba(255,255,255,0.12)',
      background: done?'rgba(0,229,160,0.06)':'rgba(255,255,255,0.02)',
    }}>
      <div style={{
        width:40,height:40,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
        background: done?'rgba(0,229,160,0.18)':'rgba(255,255,255,0.04)',
      }}>
        {done ? I.check('#00E5A0',18) : Icon('rgba(255,255,255,0.75)',18)}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:done?K.electric:'#fff',marginBottom:2}}>{label}</div>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)'}}>{done?'Tap to re-upload':meta}</div>
      </div>
      {!done && <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>Tap</div>}
    </div>
  );
}

// ═══ 04 SKILLS ═══
function Skills({ onBack, onNext }) {
  const roles = ['Waiter','Barista','Chef','Cashier','Security','Cleaner','Receptionist','Bartender','Dishwasher','Kitchen Porter','Host/Hostess','Housekeeper'];
  const [picked, setPicked] = React.useState(new Set(['Waiter']));
  const toggle = r => setPicked(p => { const n=new Set(p); n.has(r)?n.delete(r):n.add(r); return n; });
  const ready = picked.size > 0;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <OnbHeader step={3} onBack={onBack}/>
      <div style={{padding:'20px 22px 0',flexShrink:0}}>
        <Eyebrow style={{color:'rgba(255,255,255,0.4)',marginBottom:8}}>Step 4 of 5 · Your skills</Eyebrow>
        <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 8px'}}>What work do you do?</h2>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55,margin:0}}>Pick everything you can do. You'll only see shifts that match.</p>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 22px 0'}}>
        <Label style={{marginBottom:10}}>Hospitality roles · pick any</Label>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {roles.map(r => (
            <Chip key={r} active={picked.has(r)} onClick={()=>toggle(r)}>{r}</Chip>
          ))}
          <Chip onClick={()=>{}}>+ Other</Chip>
        </div>

        <div style={{marginTop:22,padding:13,borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <Label color="rgba(255,255,255,0.55)">Certificates · optional</Label>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>PDF or photo · 5MB max</span>
          </div>
          <p style={{fontSize:11.5,color:'rgba(255,255,255,0.5)',lineHeight:1.5,margin:'0 0 10px'}}>Food handlers cert, bartending course, first aid — employers pay more for certified workers.</p>
          <button style={{
            width:'100%',padding:'11px',borderRadius:11,border:'1.5px dashed rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.02)',color:'rgba(255,255,255,0.55)',
            fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>{I.upload('rgba(255,255,255,0.55)',14)} Upload a certificate</button>
        </div>

        <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,background:'rgba(188,255,78,0.04)',border:'1px solid rgba(188,255,78,0.18)'}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(188,255,78,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {I.star(K.volt,12)}
          </div>
          <span style={{fontSize:10.5,color:K.volt,fontWeight:600,lineHeight:1.45}}>
            Certified workers earn ~KES 300 more per shift, on average.
          </span>
        </div>
      </div>

      <div style={{padding:'14px 22px 20px',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <GradientBtn disabled={!ready} onClick={onNext}>
          {ready ? `Continue · ${picked.size} skill${picked.size>1?'s':''}` : 'Pick at least one'}
        </GradientBtn>
      </div>
    </div>
  );
}

// ═══ 05 M-PESA ═══
function Mpesa({ onBack, onDone }) {
  const [num, setNum] = React.useState('');
  const add = d => setNum(n => n.length<10 ? n+d : n);
  const del = () => setNum(n => n.slice(0,-1));
  const ready = num.length === 10;
  const formatted = num.length ? num.replace(/(\d{4})(\d{0,3})(\d{0,3})/, (_,a,b,c)=>[a,b,c].filter(Boolean).join(' ')).trim() : '';

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <OnbHeader step={4} onBack={onBack}/>
      <div style={{padding:'20px 22px 0',flexShrink:0}}>
        <Eyebrow style={{color:'rgba(255,255,255,0.4)',marginBottom:8}}>Step 5 of 5 · Get paid</Eyebrow>
        <h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1.1,margin:'0 0 8px'}}>Where should we send your money?</h2>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55,margin:0}}>Your M-Pesa number. Money lands within 30 minutes of every clock-out.</p>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',padding:'20px 22px 0',overflow:'hidden'}}>
        {/* Number display */}
        <div style={{textAlign:'center',padding:'18px 16px',borderRadius:16,background:'rgba(0,229,160,0.04)',border:'1px solid rgba(0,229,160,0.18)',marginBottom:12}}>
          <Label style={{marginBottom:6,color:K.electric,letterSpacing:'0.14em'}}>Safaricom M-Pesa</Label>
          <div style={{fontSize:26,fontFamily:K.mono,fontWeight:700,letterSpacing:'0.02em',color:'#fff',minHeight:34}}>
            {formatted || <span style={{color:'rgba(255,255,255,0.2)'}}>0722 000 000</span>}
          </div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4}}>{num.length}/10 digits</div>
        </div>

        {/* Guarantee strip */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:11,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:14}}>
          {I.mpesa('#00E5A0',14)}
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#fff',fontWeight:600}}>30-minute guarantee</div>
            <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)'}}>KES lands here after every clock-out.</div>
          </div>
        </div>

        {/* Numpad */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7}}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,i)=>{
            if(k==='') return <div key={i}/>;
            const isDel = k==='⌫';
            return (
              <button key={i} onClick={()=>isDel?del():add(k)} style={{
                padding:'13px 0',borderRadius:12,
                border: isDel?'0.5px solid rgba(255,107,107,0.2)':'0.5px solid rgba(255,255,255,0.07)',
                background: isDel?'rgba(255,107,107,0.06)':'rgba(255,255,255,0.04)',
                color: isDel?K.error:'#fff',
                fontSize:17,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,
              }}>{k}</button>
            );
          })}
        </div>
      </div>

      <div style={{padding:'14px 22px 20px',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <GradientBtn disabled={!ready} onClick={onDone}>
          {ready ? "I'm ready to work" : 'Enter 10 digits to finish'}
        </GradientBtn>
      </div>
    </div>
  );
}

Object.assign(window, { Welcome, Consent, VerifyID, Skills, Mpesa, OnbHeader });
