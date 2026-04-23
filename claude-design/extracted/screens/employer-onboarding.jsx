// Employer onboarding: Welcome → Business verify → Escrow setup (3 screens)

const { K, GradientBtn, GhostBtn, Eyebrow, Label, Chip, StatusPill, DarkCard,
  VLine, Logo, LogoMark, StepProgress, I, IE, EmpInput, Stepper, EscrowMeter } = window;

// ─── Onboarding header (3 steps) ───
function EmpOnbHeader({ step, total=3, onBack, onSkip }) {
  return (
    <div style={{padding:'12px 18px 0',display:'flex',alignItems:'center',gap:14,flexShrink:0}}>
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

// ═══ 01 · EMPLOYER WELCOME ═══
// Different metaphor from worker: a "command" feel — verified pool, hours to filled
function EmpWelcome({ onNext }) {
  const [slide, setSlide] = React.useState(0);
  const slides = [
    { kicker:'01 · VERIFIED POOL',  head:'The shift fills\nbefore you sleep.',    sub:'Average 11 minutes from post to confirmed. Every worker is National ID-verified.' },
    { kicker:'02 · SAFE ESCROW',    head:'Fund once.\nRelease on clock-out.',    sub:'Your M-Pesa holds the KES. It only releases when the shift is done — and you can approve.' },
    { kicker:'03 · YOUR TEAM',      head:'Build a trusted\npool of regulars.',   sub:'Workers who show up earn a spot. Invite back with one tap.' },
  ];
  React.useEffect(()=>{
    const t=setTimeout(()=>setSlide(s=>(s+1)%3), 3800);
    return()=>clearTimeout(t);
  }, [slide]);
  const s = slides[slide];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',position:'relative',overflow:'hidden'}}>
      {/* ambient glow — employer uses volt-forward */}
      <div style={{position:'absolute',top:-80,right:-60,width:360,height:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(188,255,78,0.13),transparent 70%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:240,left:-100,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,229,160,0.10),transparent 70%)',pointerEvents:'none'}}/>

      <div style={{padding:'28px 24px 0',position:'relative',zIndex:1,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <Logo size={30}/>
        <span style={{padding:'3px 9px',borderRadius:999,background:`${K.volt}1a`,color:K.volt,fontSize:9.5,fontWeight:800,letterSpacing:'0.12em'}}>FOR EMPLOYERS</span>
      </div>

      <div style={{flex:1,padding:'0 24px',display:'flex',flexDirection:'column',justifyContent:'flex-end',paddingBottom:32,position:'relative',zIndex:1}}>
        {/* hero metaphor: live "filling" tracker — ops flavoured */}
        <div style={{marginBottom:'auto',paddingTop:36}}>
          <div style={{padding:'14px',borderRadius:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
              <Label color="rgba(255,255,255,0.4)">Live · Nairobi · tonight</Label>
              <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:9.5,color:K.electric,fontWeight:700,letterSpacing:'0.1em'}}>
                <span style={{width:5,height:5,borderRadius:999,background:K.electric,boxShadow:`0 0 8px ${K.electric}`}}/> LIVE
              </span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {k:'11 min', l:'avg fill time', c:K.electric},
                {k:'284',    l:'shifts open now', c:K.volt},
                {k:'2,847',  l:'verified workers',c:'#fff'},
                {k:'96.1%',  l:'show-up rate',    c:K.electric},
              ].map((m,i)=>(
                <div key={i} style={{padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{fontSize:14,fontWeight:900,color:m.c,letterSpacing:'-0.02em'}}>{m.k}</div>
                  <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',letterSpacing:'0.04em',textTransform:'uppercase',marginTop:2}}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>
          <Label color="rgba(255,255,255,0.3)" style={{marginTop:10}}>2,431 businesses fill shifts with Klokd</Label>
        </div>

        <div style={{marginBottom:20}}>
          <Eyebrow style={{marginBottom:10,color:K.volt}}>{s.kicker}</Eyebrow>
          <h1 style={{fontSize:28,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1.05,margin:'0 0 10px',whiteSpace:'pre-line'}}>{s.head}</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.55,margin:0}}>{s.sub}</p>
        </div>

        <div style={{display:'flex',gap:4,marginBottom:14}}>
          {slides.map((_,i)=>(
            <div key={i} onClick={()=>setSlide(i)} style={{
              flex: i===slide?2:1, height:3, borderRadius:999,
              background: i===slide?K.electric:'rgba(255,255,255,0.12)',
              transition:'flex .4s, background .4s', cursor:'pointer',
            }}/>
          ))}
        </div>

        <GradientBtn onClick={onNext}>Set up my business</GradientBtn>
        <div style={{textAlign:'center',marginTop:12,fontSize:11.5,color:'rgba(255,255,255,0.5)'}}>
          Already have an account? <span style={{color:K.electric,fontWeight:700,cursor:'pointer'}}>Sign in</span>
        </div>
      </div>
    </div>
  );
}

// ═══ 02 · BUSINESS VERIFY ═══
function EmpVerify({ onBack, onNext }) {
  const [bizName, setBiz] = React.useState('The Brew Bistro');
  const [kra, setKra] = React.useState('A0045‑­2398X');
  const [industry, setIndustry] = React.useState('Hospitality');
  const [docUploaded, setDoc] = React.useState(false);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff'}}>
      <EmpOnbHeader step={0} onBack={onBack}/>
      <div style={{flex:1,overflowY:'auto',padding:'22px 22px 120px'}}>
        <Eyebrow color={K.volt} style={{marginBottom:10}}>STEP 01 · BUSINESS</Eyebrow>
        <h1 style={{fontSize:26,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1.1,margin:'0 0 8px'}}>Verify your business</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.5,margin:'0 0 22px'}}>
          We check KRA PIN against the Business Registration Service. Takes ~30 seconds.
        </p>

        <EmpInput
          label="Business name"
          value={bizName} onChange={setBiz}
          icon={IE.office('rgba(255,255,255,0.5)',16)}
        />

        <EmpInput
          label="KRA PIN"
          value={kra} onChange={setKra}
          prefix="KE"
          suffix={I.shield(K.electric,12)}
          hint="Encrypted & only used for verification. We never share it."
        />

        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:8}}>Industry</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['Hospitality','Retail','Events','Cleaning','Logistics','Other'].map(ind=>(
              <Chip key={ind} active={industry===ind} onClick={()=>setIndustry(ind)}>{ind}</Chip>
            ))}
          </div>
        </div>

        {/* Upload business cert */}
        <div style={{
          marginTop:18,padding:14,borderRadius:14,
          border: docUploaded ? `1px solid ${K.electric}55` : '1.5px dashed rgba(255,255,255,0.15)',
          background: docUploaded ? `${K.electric}08` : 'rgba(255,255,255,0.02)',
          cursor:'pointer',textAlign:'center',
        }} onClick={()=>setDoc(true)}>
          {!docUploaded ? (
            <>
              <div style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.04)',margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {I.upload('rgba(255,255,255,0.55)',16)}
              </div>
              <div style={{fontSize:12.5,fontWeight:700,color:'#fff',marginBottom:3}}>Upload business cert</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>PDF, JPG or PNG · up to 10 MB</div>
            </>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:`${K.electric}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {I.check(K.electric,14)}
              </div>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>BRS-cert-2024.pdf</div>
                <div style={{fontSize:10.5,color:K.electric,fontWeight:600}}>Uploaded · matching KRA…</div>
              </div>
            </div>
          )}
        </div>

        <div style={{marginTop:18,padding:'11px 13px',borderRadius:12,background:'rgba(188,255,78,0.05)',border:'1px solid rgba(188,255,78,0.18)',display:'flex',gap:9,alignItems:'flex-start'}}>
          {I.shield(K.volt,14)}
          <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',lineHeight:1.45}}>
            Once verified, your venue gets a <span style={{color:K.volt,fontWeight:700}}>green badge</span> — workers see this before accepting any shift.
          </div>
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'16px 22px 24px',background:'linear-gradient(180deg,transparent,#0A0A0F 40%)'}}>
        <GradientBtn onClick={onNext} disabled={!docUploaded}>{docUploaded?'Continue':'Upload your cert to continue'}</GradientBtn>
      </div>
    </div>
  );
}

// ═══ 03 · ESCROW SETUP ═══
function EmpEscrow({ onBack, onDone }) {
  const [amount, setAmount] = React.useState(50000);
  const [loading, setLoading] = React.useState(false);
  const [funded, setFunded] = React.useState(false);
  const presets = [20000, 50000, 100000, 200000];

  const handleFund = () => {
    setLoading(true);
    setTimeout(()=>{ setLoading(false); setFunded(true); setTimeout(onDone, 1400); }, 1600);
  };

  if (funded) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',alignItems:'center',justifyContent:'center',padding:'24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:`radial-gradient(circle at 50% 35%, ${K.electric}22, transparent 60%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:K.brandGrad,margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {I.check(K.ink,34)}
          </div>
          <h1 style={{fontSize:28,fontWeight:900,letterSpacing:'-0.03em',margin:'0 0 8px'}}>Escrow funded</h1>
          <div style={{fontSize:32,fontWeight:900,color:K.electric,letterSpacing:'-0.04em',fontFamily:K.mono,marginBottom:12}}>KES {amount.toLocaleString()}</div>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.5,maxWidth:260,margin:'0 auto 24px'}}>Your M-Pesa is holding this. It releases worker-by-worker only on clock-out.</p>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em'}}>Opening your dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff'}}>
      <EmpOnbHeader step={1} onBack={onBack}/>
      <div style={{flex:1,overflowY:'auto',padding:'22px 22px 120px'}}>
        <Eyebrow color={K.volt} style={{marginBottom:10}}>STEP 02 · ESCROW</Eyebrow>
        <h1 style={{fontSize:26,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1.1,margin:'0 0 8px'}}>Fund your M-Pesa escrow</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.5,margin:'0 0 20px'}}>
          Pre-fund an amount. Workers see you're ready to pay, which means faster fills.
        </p>

        {/* big amount entry */}
        <div style={{padding:'22px 20px',borderRadius:18,background:`linear-gradient(180deg,${K.electric}10,${K.electric}02 60%)`,border:`1px solid ${K.electric}40`,marginBottom:16,textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
          <Label color="rgba(255,255,255,0.5)">Fund amount</Label>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:6,marginTop:10,position:'relative'}}>
            <span style={{fontSize:16,color:'rgba(255,255,255,0.5)',fontWeight:700}}>KES</span>
            <span style={{fontSize:44,fontWeight:900,color:'#fff',letterSpacing:'-0.05em',fontFamily:K.mono}}>{amount.toLocaleString()}</span>
          </div>
          <div style={{fontSize:11,color:K.electric,fontWeight:700,marginTop:4,position:'relative'}}>≈ {Math.round(amount/1800)} shifts</div>
        </div>

        {/* presets */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:18}}>
          {presets.map(p=>(
            <button key={p} onClick={()=>setAmount(p)} style={{
              padding:'10px 4px',borderRadius:10,
              border: amount===p?`1.5px solid ${K.electric}`:'1px solid rgba(255,255,255,0.08)',
              background: amount===p?`${K.electric}14`:'rgba(255,255,255,0.03)',
              color: amount===p?K.electric:'rgba(255,255,255,0.7)',
              fontSize:11.5,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily,
            }}>{p/1000}k</button>
          ))}
        </div>

        {/* M-Pesa source */}
        <div style={{padding:'13px 14px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:11,marginBottom:14}}>
          <div style={{width:38,height:38,borderRadius:10,background:`${K.electric}1a`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {IE.mpesa2(K.electric,18)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:'#fff'}}>M-Pesa Business</div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',fontFamily:K.mono}}>Till 504‑­221 · Brew Bistro</div>
          </div>
          <div style={{padding:'4px 8px',borderRadius:999,background:`${K.electric}22`,color:K.electric,fontSize:9.5,fontWeight:800,letterSpacing:'0.08em'}}>DEFAULT</div>
        </div>

        {/* How escrow works — 3 steps */}
        <div style={{padding:'14px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <Label color="rgba(255,255,255,0.5)" style={{marginBottom:10}}>How escrow works</Label>
          {[
            {n:'1', t:'You fund', s:'M-Pesa holds the amount. Worker sees funded badge.'},
            {n:'2', t:'Worker clocks out', s:'Amount earmarks for that worker.'},
            {n:'3', t:'Auto-release in 5 min', s:'Unless you flag an issue. Average: 3 min.'},
          ].map(s=>(
            <div key={s.n} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:`${K.electric}22`,color:K.electric,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:K.mono}}>{s.n}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{s.t}</div>
                <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',lineHeight:1.4,marginTop:1}}>{s.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'16px 22px 24px',background:'linear-gradient(180deg,transparent,#0A0A0F 40%)'}}>
        <GradientBtn onClick={handleFund} disabled={loading}>
          {loading ? 'Waiting for M-Pesa prompt…' : `Fund KES ${amount.toLocaleString()} via STK push`}
        </GradientBtn>
        <div style={{textAlign:'center',marginTop:10,fontSize:10.5,color:'rgba(255,255,255,0.4)',display:'inline-flex',alignItems:'center',gap:4,width:'100%',justifyContent:'center'}}>
          {I.lock('rgba(255,255,255,0.4)',10)} Fully refundable anytime · M-Pesa trust score unaffected
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EmpWelcome, EmpVerify, EmpEscrow });
