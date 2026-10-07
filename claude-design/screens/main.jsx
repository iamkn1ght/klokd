// Worker main flow + tabs
// Home, ShiftDetail, Contract, ClockIn, Active, PaymentConfirmed, ShiftsTab, PayTab, MeTab

const { K, GradientBtn, GhostBtn, IconBtn, Eyebrow, Label, Chip, StatusPill, DarkCard, VLine, Logo, LogoMark, I } = window;

// ═══ Bottom nav ═══
function BottomNav({ tab, onTab }) {
  const items = [
    { k:'home',   icon:I.home,     label:'Home' },
    { k:'shifts', icon:I.calendar, label:'Shifts' },
    { k:'pay',    icon:I.wallet,   label:'Pay' },
    { k:'me',     icon:I.user,     label:'Me' },
  ];
  return (
    <div style={{
      height:64, borderTop:'0.5px solid rgba(255,255,255,0.06)', background:'rgba(10,10,15,0.95)',
      backdropFilter:'blur(12px)', display:'flex', flexShrink:0,
    }}>
      {items.map(it=>{
        const active = tab===it.k;
        return (
          <button key={it.k} onClick={()=>onTab(it.k)} style={{
            flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,
            background:'none',border:'none',cursor:'pointer',fontFamily:K.fontFamily,paddingTop:6,
          }}>
            {it.icon(active?K.electric:'rgba(255,255,255,0.4)', 20)}
            <span style={{fontSize:10,fontWeight:active?700:500,color:active?K.electric:'rgba(255,255,255,0.4)',letterSpacing:'0.02em'}}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══ HOME ═══
const DEMO_SHIFTS = [
  { id:'s1', role:'Waiter',    venue:'The Brew Bistro',    area:'Westlands',   date:'Tonight', time:'5:00 – 10:00 PM', pay:1800, dist:'0.8 km', rating:4.8, shifts:23, highlighted:true },
  { id:'s2', role:'Barista',   venue:'Java House · Sarit', area:'Sarit Centre',date:'Tomorrow',time:'7:00 AM – 2:00 PM',pay:2100, dist:'1.6 km', rating:4.6, shifts:41 },
  { id:'s3', role:'Bartender', venue:'Brew Bistro · Kilimani', area:'Kilimani',date:'Fri',     time:'6:00 – 11:00 PM', pay:2200, dist:'3.1 km', rating:4.7, shifts:12 },
  { id:'s4', role:'Cashier',   venue:'Artcaffe · Westgate', area:'Westlands',  date:'Sat',     time:'9:00 AM – 5:00 PM',pay:1600, dist:'1.2 km', rating:4.5, shifts:67 },
];

function Home({ onOpenShift }) {
  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:K.ink}}>
      {/* Header */}
      <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:2}}>Thursday · 3 Apr</div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em'}}>Good morning, Akinyi</div>
        </div>
        <div style={{position:'relative'}}>
          <button style={{width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            {I.bell('#fff',16)}
          </button>
          <div style={{position:'absolute',top:6,right:6,width:7,height:7,borderRadius:'50%',background:K.electric,border:'1.5px solid #0A0A0F'}}/>
        </div>
      </div>

      {/* Stats card — bank-grade ledger */}
      <div style={{padding:'14px 20px 0'}}>
        <div style={{
          borderRadius:18,padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:-30,right:-40,width:120,height:120,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10,position:'relative'}}>
            <Label color="rgba(255,255,255,0.4)">Your ledger · 47 shifts</Label>
            <span style={{fontSize:10,color:K.electric,fontWeight:700}}>VERIFIED</span>
          </div>
          <div style={{display:'flex',gap:0,position:'relative'}}>
            <Stat n="94%"     l="show-up"    c={K.electric}/>
            <VLine/>
            <Stat n="4.8"     l="rating"     c={K.volt} star/>
            <VLine/>
            <Stat n="KES 84k" l="this month" c="#fff"/>
          </div>
        </div>
      </div>

      {/* Shift feed */}
      <div style={{padding:'20px 20px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <Label>Shifts near you · 4</Label>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Sorted by distance</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {DEMO_SHIFTS.map((s, i) => (
            <ShiftCard key={s.id} shift={s} dim={i>0?0.08*i:0} onClick={()=>onOpenShift(s)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, c, star }) {
  return (
    <div style={{flex:1,textAlign:'center',padding:'0 4px'}}>
      <div style={{fontSize:18,fontWeight:900,color:c,letterSpacing:'-0.02em',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
        {n}{star && <span style={{fontSize:12}}>{I.star(c,11)}</span>}
      </div>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.08em',textTransform:'uppercase',marginTop:3}}>{l}</div>
    </div>
  );
}

function ShiftCard({ shift, dim=0, onClick, highlight }) {
  const isHi = shift.highlighted || highlight;
  return (
    <div onClick={onClick} style={{
      borderRadius:16,padding:14,cursor:'pointer',
      background: isHi ? 'linear-gradient(180deg,rgba(0,229,160,0.07),rgba(0,229,160,0.01))' : 'rgba(255,255,255,0.025)',
      border: isHi ? '1px solid rgba(0,229,160,0.4)' : '1px solid rgba(255,255,255,0.06)',
      opacity: 1 - dim,
      transition:'all .2s',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
            <span style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-0.02em'}}>{shift.role}</span>
            {isHi && <StatusPill tone="mint">New</StatusPill>}
          </div>
          <div style={{fontSize:11.5,color:'rgba(255,255,255,0.55)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{shift.venue}</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',display:'inline-flex',alignItems:'center',gap:3}}>{I.pin('rgba(255,255,255,0.4)',10)} {shift.dist}</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>·</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',display:'inline-flex',alignItems:'center',gap:3}}>{I.star(K.volt,10)} {shift.rating}</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>·</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{shift.shifts} shifts</span>
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:900,color:K.electric,letterSpacing:'-0.02em'}}>KES {shift.pay.toLocaleString()}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:2}}>{shift.date}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        <TimePill label={shift.time}/>
        <TimePill label={shift.area}/>
        {isHi && <TimePill label="Fills fast" tone="volt"/>}
      </div>
    </div>
  );
}

function TimePill({ label, tone='neutral' }) {
  const map = {
    neutral:{bg:'rgba(255,255,255,0.05)',c:'rgba(255,255,255,0.65)'},
    volt:{bg:'rgba(188,255,78,0.1)',c:K.volt},
  };
  const t = map[tone];
  return (
    <span style={{
      padding:'4px 9px',borderRadius:999,fontSize:10.5,fontWeight:600,
      background:t.bg,color:t.c,letterSpacing:'0.02em',
    }}>{label}</span>
  );
}

// ═══ SHIFT DETAIL ═══
function ShiftDetail({ shift, onBack, onAccept }) {
  if(!shift) return null;
  const gross = shift.pay;
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <IconBtn onClick={onBack}>{I.back('#fff',14)}</IconBtn>
        <Label>Shift details</Label>
        <div style={{width:38}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 20px 0'}}>
        {/* Hero */}
        <div style={{marginBottom:16}}>
          <StatusPill tone="mint">Open · matches you</StatusPill>
          <h1 style={{fontSize:26,fontWeight:900,letterSpacing:'-0.03em',margin:'10px 0 4px'}}>{shift.role}</h1>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{shift.venue} · {shift.area}</div>
        </div>

        {/* Earnings block */}
        <div style={{
          padding:'16px',borderRadius:18,border:'1px solid rgba(0,229,160,0.3)',
          background:'linear-gradient(180deg,rgba(0,229,160,0.08),rgba(0,229,160,0.01))', marginBottom:14,
        }}>
          <Label color="rgba(255,255,255,0.5)" style={{marginBottom:6}}>You'll earn</Label>
          <div style={{fontSize:34,fontWeight:900,color:K.electric,letterSpacing:'-0.04em',fontFamily:K.mono}}>KES {gross.toLocaleString()}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:4,lineHeight:1.5}}>
            After statutory deductions (PAYE, NSSF, SHIF) · paid to M-Pesa within 30 min of clock-out
          </div>
        </div>

        {/* Details grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <DetailTile label="When" v={shift.date} sub={shift.time}/>
          <DetailTile label="Where" v={shift.area} sub={shift.dist + ' away'}/>
          <DetailTile label="Duration" v="5 hours" sub="5 PM – 10 PM"/>
          <DetailTile label="Rate" v={`KES ${Math.round(gross/5)}/hr`} sub="Above minimum"/>
        </div>

        {/* Employer */}
        <Label style={{marginBottom:8}}>Employer</Label>
        <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:11,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#fff'}}>TB</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>{shift.venue}</div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',display:'flex',gap:8}}>
              <span style={{display:'inline-flex',gap:3,alignItems:'center'}}>{I.star(K.volt,10)} {shift.rating}</span>
              <span>·</span>
              <span>{shift.shifts} shifts posted</span>
            </div>
          </div>
          <StatusPill tone="mint">WIBA ✓</StatusPill>
        </div>

        {/* Payment guarantee */}
        <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(0,229,160,0.04)',border:'1px solid rgba(0,229,160,0.18)',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            {I.mpesa('#00E5A0',14)}
            <Label color={K.electric}>Payment guarantee</Label>
          </div>
          <div style={{fontSize:11.5,color:'#fff',fontWeight:600,marginBottom:2}}>KES {gross.toLocaleString()} is held in escrow before your shift starts.</div>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.55)',lineHeight:1.5}}>If Brew Bistro doesn't confirm within 4 hours of clock-out, Klokd releases your pay automatically.</div>
        </div>

        <button style={{
          width:'100%',padding:'11px',borderRadius:11,border:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(255,255,255,0.02)',color:'rgba(255,255,255,0.65)',
          fontSize:11.5,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,
          display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,
        }}>
          <span>Preview employment contract</span>
          {I.chevron('rgba(255,255,255,0.4)',12)}
        </button>
      </div>

      <div style={{padding:'14px 20px 18px',borderTop:'0.5px solid rgba(255,255,255,0.06)',display:'flex',gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{
          padding:'14px 18px',borderRadius:14,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',
          color:'rgba(255,255,255,0.55)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,
        }}>Decline</button>
        <div style={{flex:1}}><GradientBtn onClick={onAccept}>Accept shift</GradientBtn></div>
      </div>
    </div>
  );
}

function DetailTile({ label, v, sub }) {
  return (
    <div style={{padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>{label}</div>
      <div style={{fontSize:13,fontWeight:700,color:'#fff',letterSpacing:'-0.01em'}}>{v}</div>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>{sub}</div>
    </div>
  );
}

// ═══ CLOCK IN ═══
function ClockIn({ shift, onBack, onClockIn }) {
  const [phase, setPhase] = React.useState('locating'); // locating, inRange, outRange
  React.useEffect(()=>{
    const t1=setTimeout(()=>setPhase('inRange'),1400);
    return ()=>clearTimeout(t1);
  },[]);
  const withinRange = phase==='inRange';

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <IconBtn onClick={onBack}>{I.back('#fff',14)}</IconBtn>
        <div style={{textAlign:'center'}}>
          <Label color="rgba(255,255,255,0.35)">Shift starts in</Label>
          <div style={{fontSize:12,fontWeight:700,color:K.electric,fontFamily:K.mono,marginTop:2}}>00:04:32</div>
        </div>
        <div style={{width:38}}/>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:'0 24px',gap:20,position:'relative',overflow:'hidden'}}>
        {/* GPS ring */}
        <div style={{position:'relative',width:240,height:240,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {/* Pulsing ring */}
          {[0,1,2].map(i=>(
            <div key={i} style={{
              position:'absolute',width:'100%',height:'100%',borderRadius:'50%',
              border:`1.5px solid ${withinRange?K.electric:'rgba(255,255,255,0.15)'}`,
              animation:`klokd-pulse 2.4s ${i*0.8}s infinite ease-out`,opacity:withinRange?1:0.3,
            }}/>
          ))}
          <style>{`@keyframes klokd-pulse { 0% { transform:scale(0.7); opacity:.6 } 100% { transform:scale(1.25); opacity:0 } }`}</style>
          {/* Inner dot */}
          <div style={{
            width:112,height:112,borderRadius:'50%',
            background: withinRange ? 'radial-gradient(circle,rgba(0,229,160,0.22),rgba(0,229,160,0.03) 70%)' : 'radial-gradient(circle,rgba(255,255,255,0.06),transparent 70%)',
            border: withinRange ? `2px solid ${K.electric}` : '1.5px dashed rgba(255,255,255,0.25)',
            display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',
            transition:'all .3s',
          }}>
            {I.pin(withinRange?K.electric:'rgba(255,255,255,0.55)', 22)}
            <div style={{fontSize:10,color:withinRange?K.electric:'rgba(255,255,255,0.55)',fontWeight:700,marginTop:6,letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {phase==='locating'?'Locating…':'At venue'}
            </div>
          </div>
        </div>

        <div style={{textAlign:'center'}}>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',marginBottom:6}}>
            {phase==='locating'?'Finding you…':'You\'re in range.'}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.55}}>
            {phase==='locating'
              ? 'Hold on — checking you\'re within 500 m of The Brew Bistro, Westlands.'
              : '0.04 km from The Brew Bistro · Westlands. WIBA cover confirmed.'}
          </div>
        </div>

        {/* WIBA card */}
        <div style={{width:'100%',padding:'10px 12px',borderRadius:12,background:'rgba(0,229,160,0.04)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',gap:10}}>
          {I.shield(K.electric,14)}
          <div style={{flex:1}}>
            <div style={{fontSize:11.5,color:'#fff',fontWeight:600}}>WIBA insurance · active</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>You're covered for the duration of this shift.</div>
          </div>
        </div>
      </div>

      <div style={{padding:'16px 22px 20px',flexShrink:0}}>
        <GradientBtn disabled={!withinRange} onClick={onClockIn} size="lg">
          {withinRange?'Clock in · Brew Bistro':'Move closer to clock in'}
        </GradientBtn>
      </div>
    </div>
  );
}

// ═══ ACTIVE SHIFT ═══
function Active({ shift, onBack, onClockOut }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(()=>{ const t=setInterval(()=>setElapsed(e=>e+1),1000); return()=>clearInterval(t); },[]);
  const hrs = String(Math.floor(elapsed/3600)).padStart(2,'0');
  const mns = String(Math.floor((elapsed%3600)/60)).padStart(2,'0');
  const scs = String(elapsed%60).padStart(2,'0');

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:K.ink,color:'#fff',overflow:'hidden'}}>
      <div style={{padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <IconBtn onClick={onBack}>{I.back('#fff',14)}</IconBtn>
        <StatusPill tone="mint">● LIVE</StatusPill>
        <div style={{width:38}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 20px 0'}}>
        {/* Timer */}
        <div style={{textAlign:'center',padding:'18px 0 20px'}}>
          <Label color="rgba(255,255,255,0.4)" style={{marginBottom:10}}>You clocked in at 4:58 PM</Label>
          <div style={{fontSize:56,fontWeight:900,fontFamily:K.mono,color:'#fff',letterSpacing:'-0.03em',lineHeight:1}}>
            <span style={{color:K.electric}}>{hrs}</span>:{mns}:<span style={{color:'rgba(255,255,255,0.5)'}}>{scs}</span>
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:6}}>Waiter · The Brew Bistro</div>
        </div>

        {/* Progress bar */}
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10,color:'rgba(255,255,255,0.45)'}}>
            <span>5:00 PM · in</span>
            <span>10:00 PM · out</span>
          </div>
          <div style={{height:5,borderRadius:999,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{width:'38%',height:'100%',background:K.brandGrad,borderRadius:999}}/>
          </div>
        </div>

        {/* Earnings accumulating */}
        <div style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <Label>Earning now</Label>
            <span style={{fontSize:10,color:K.electric}}>● Accruing</span>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:28,fontWeight:900,color:'#fff',fontFamily:K.mono,letterSpacing:'-0.03em'}}>KES 684</span>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>of 1,800</span>
          </div>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.45)',marginTop:6}}>Released to M-Pesa at clock-out</div>
        </div>

        {/* Employer contact */}
        <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
          <div style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff'}}>TB</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12.5,fontWeight:700,color:'#fff'}}>On-site contact</div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)'}}>David M. · Floor manager</div>
          </div>
          <button style={{padding:'7px 12px',borderRadius:10,background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.25)',color:K.electric,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily}}>WhatsApp</button>
        </div>

        <button style={{
          width:'100%',padding:'10px',borderRadius:11,background:'transparent',
          border:'1px solid rgba(255,179,71,0.25)',color:K.warning,
          fontSize:11.5,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,
          display:'flex',alignItems:'center',justifyContent:'center',gap:7,
        }}>{I.dispute(K.warning,13)} Something's wrong with this shift</button>
      </div>

      <div style={{padding:'14px 20px 18px',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <GradientBtn onClick={onClockOut}>Clock out</GradientBtn>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',textAlign:'center',marginTop:8}}>You'll confirm before payment is triggered.</div>
      </div>
    </div>
  );
}

// ═══ PAYMENT CONFIRMED ═══
function PaymentConfirmed({ onHome }) {
  const [rated, setRated] = React.useState(0);
  const gross = 1800, paye = 0, nssf = 108, shif = 49.5, net = Math.round(gross-nssf-shif);

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:K.ink,color:'#fff',overflow:'hidden'}}>
      {/* Glow */}
      <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:360,height:360,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>

      <div style={{flex:1,overflowY:'auto',padding:'20px 20px 0',position:'relative'}}>
        {/* Success */}
        <div style={{textAlign:'center',padding:'24px 0 8px'}}>
          <div style={{
            width:64,height:64,borderRadius:'50%',background:K.brandGrad,
            display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',
            boxShadow:'0 0 40px rgba(0,229,160,0.25)',
          }}>{I.check('#0A0A0F',30)}</div>
          <Label color={K.electric} style={{marginBottom:8}}>PAID · 18 MIN AFTER CLOCK-OUT</Label>
          <div style={{fontSize:38,fontWeight:900,color:K.electric,letterSpacing:'-0.04em',fontFamily:K.mono,lineHeight:1}}>KES 1,642.50</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginTop:8}}>Sent to M-Pesa · 0722 ••• 500</div>
        </div>

        {/* Receipt */}
        <div style={{margin:'20px 0 16px',padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
            <Label>Pay statement · 3 Apr</Label>
            <button style={{background:'none',border:'none',color:K.electric,fontSize:10.5,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily,display:'inline-flex',alignItems:'center',gap:4}}>{I.download(K.electric,11)} PDF</button>
          </div>
          <ReceiptRow label="Gross · 5h @ KES 360" v={`KES ${gross.toLocaleString()}`}/>
          <ReceiptRow label="PAYE (below threshold)" v="KES 0" dim/>
          <ReceiptRow label="NSSF (6%)" v={`− KES ${nssf}`} dim/>
          <ReceiptRow label="SHIF (2.75%)" v={`− KES ${shif}`} dim/>
          <ReceiptRow label="AHL (suspended)" v="KES 0" dim/>
          <div style={{height:0.5,background:'rgba(255,255,255,0.08)',margin:'8px 0'}}/>
          <ReceiptRow label="Net to M-Pesa" v={`KES ${net.toLocaleString()}`} bold/>
          <div style={{marginTop:10,fontSize:9.5,color:'rgba(255,255,255,0.35)',fontFamily:K.mono}}>M-Pesa ref: QAB7X2K1P9</div>
        </div>

        {/* Rate */}
        <div style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:2}}>How was Brew Bistro tonight?</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:12}}>Your rating stays anonymous to the venue.</div>
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} onClick={()=>setRated(s)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}>
                {I.star(s<=rated?K.volt:'rgba(255,255,255,0.15)', 28, s<=rated)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:'14px 20px 18px',flexShrink:0,position:'relative'}}>
        <GradientBtn onClick={onHome}>See open shifts</GradientBtn>
      </div>
    </div>
  );
}

function ReceiptRow({ label, v, dim, bold }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
      <span style={{fontSize:11.5,color:dim?'rgba(255,255,255,0.4)':'rgba(255,255,255,0.65)'}}>{label}</span>
      <span style={{fontSize:12,fontWeight:bold?900:600,color:bold?K.electric:(dim?'rgba(255,255,255,0.55)':'#fff'),fontFamily:K.mono}}>{v}</span>
    </div>
  );
}

// ═══ SHIFTS TAB ═══
function ShiftsTab() {
  const [section, setSection] = React.useState('upcoming');
  return (
    <div style={{flex:1,overflowY:'auto',background:K.ink,color:'#fff'}}>
      <div style={{padding:'16px 20px 0'}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',marginBottom:12}}>Your shifts</div>
        <div style={{display:'flex',gap:6,background:'rgba(255,255,255,0.04)',padding:3,borderRadius:12,marginBottom:16}}>
          {['upcoming','active','history'].map(s=>(
            <button key={s} onClick={()=>setSection(s)} style={{
              flex:1,padding:'8px 0',borderRadius:10,border:'none',
              background:section===s?K.ink:'transparent',
              color:section===s?K.electric:'rgba(255,255,255,0.5)',
              fontSize:11.5,fontWeight:700,letterSpacing:'0.02em',textTransform:'capitalize',
              cursor:'pointer',fontFamily:K.fontFamily,transition:'all .18s',
              border:section===s?'1px solid rgba(0,229,160,0.25)':'1px solid transparent',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 20px 20px'}}>
        {section==='upcoming' && <>
          <HistRow role="Waiter" venue="Brew Bistro · Westlands" when="Tonight · 5 PM" amount="1,800" status="confirmed"/>
          <HistRow role="Barista" venue="Java House · Sarit" when="Tomorrow · 7 AM" amount="2,100" status="confirmed"/>
        </>}
        {section==='active' && <>
          <HistRow role="Waiter" venue="Brew Bistro · Westlands" when="In progress · 02:23" amount="684" status="live"/>
        </>}
        {section==='history' && <>
          <HistRow role="Barista" venue="Java House · Sarit" when="2 Apr · 7 AM – 2 PM" amount="1,915" status="paid"/>
          <HistRow role="Waiter" venue="Artcaffe · Westgate" when="31 Mar · 5 – 10 PM" amount="1,642" status="paid"/>
          <HistRow role="Cashier" venue="Naivas · Kilimani" when="28 Mar · 9 AM – 5 PM" amount="1,460" status="paid"/>
          <HistRow role="Waiter" venue="Brew Bistro · Kilimani" when="25 Mar · 6 – 11 PM" amount="2,006" status="paid"/>
          <HistRow role="Dishwasher" venue="Pronto · CBD" when="22 Mar · 4 – 10 PM" amount="1,368" status="disputed"/>

          <div style={{marginTop:16,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:8}}>
            {I.lock('rgba(255,255,255,0.35)',11)}
            <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',lineHeight:1.45}}>Records kept 7 years per Kenyan law.</span>
          </div>
        </>}
      </div>
    </div>
  );
}

function HistRow({ role, venue, when, amount, status }) {
  const toneMap = { paid:'mint', confirmed:'volt', live:'mint', disputed:'warn' };
  const labelMap = { paid:'Paid', confirmed:'Confirmed', live:'Live', disputed:'Disputed' };
  return (
    <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{role}</span>
          <StatusPill tone={toneMap[status]}>{labelMap[status]}</StatusPill>
        </div>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{venue}</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{when}</div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontSize:14,fontWeight:900,color:'#fff',fontFamily:K.mono,letterSpacing:'-0.02em'}}>{amount}</div>
        <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:'0.05em'}}>KES</div>
      </div>
    </div>
  );
}

// ═══ PAY TAB ═══
function PayTab() {
  const [ahl, setAhl] = React.useState(false);
  const gross = 84210, paye=2340, nssf=5050, shif=2315, ahlD= ahl?Math.round(gross*0.015):0;
  const net = gross - paye - nssf - shif - ahlD;
  return (
    <div style={{flex:1,overflowY:'auto',background:K.ink,color:'#fff'}}>
      <div style={{padding:'16px 20px 0'}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:'-0.03em',marginBottom:2}}>Your pay</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>April · 12 shifts completed</div>
      </div>

      {/* Hero ledger */}
      <div style={{padding:'14px 20px 0'}}>
        <div style={{padding:'16px 16px 14px',borderRadius:18,background:'linear-gradient(180deg,rgba(0,229,160,0.07),rgba(0,229,160,0.01) 60%)',border:'1px solid rgba(0,229,160,0.25)'}}>
          <Label color="rgba(255,255,255,0.55)" style={{marginBottom:6}}>Net this month</Label>
          <div style={{fontSize:34,fontWeight:900,color:K.electric,letterSpacing:'-0.04em',fontFamily:K.mono,lineHeight:1}}>KES {net.toLocaleString()}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:6}}>Gross KES {gross.toLocaleString()} · − KES {(gross-net).toLocaleString()} deducted</div>
        </div>
      </div>

      {/* Statutory breakdown */}
      <div style={{padding:'20px 20px 0'}}>
        <Label style={{marginBottom:10}}>Statutory deductions</Label>
        <div style={{padding:'10px 14px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <DeductRow label="PAYE · tax" v={paye} note="2025/26 bands"/>
          <DeductRow label="NSSF · Tier I + II" v={nssf} note="6% · employer matches"/>
          <DeductRow label="SHIF · health" v={shif} note="2.75% of gross"/>
          <DeductRow label={<>AHL · housing <span style={{fontSize:9.5,color:ahl?K.warning:'rgba(255,255,255,0.4)',fontWeight:700,marginLeft:4,padding:'1px 5px',borderRadius:4,background:ahl?'rgba(255,179,71,0.12)':'rgba(255,255,255,0.05)'}}>{ahl?'ON':'SUSPENDED'}</span></>} v={ahlD} note="1.5% · toggle above"/>
          <div style={{height:0.5,background:'rgba(255,255,255,0.08)',margin:'6px 0'}}/>
          <DeductRow label="Total deducted" v={gross-net} bold/>
        </div>
      </div>

      {/* Recent payouts */}
      <div style={{padding:'20px 20px 24px'}}>
        <Label style={{marginBottom:10}}>Recent payouts</Label>
        {[
          { d:'3 Apr', r:'Waiter', n:'1,642', ref:'QAB7X2K1P9'},
          { d:'2 Apr', r:'Barista',n:'1,915', ref:'QAB6R8L2M4'},
          { d:'31 Mar',r:'Waiter', n:'1,642', ref:'QAB5K3N8C2'},
          { d:'28 Mar',r:'Cashier',n:'1,460', ref:'QAB4F9X1Y7'},
        ].map((p,i)=>(
          <div key={i} style={{padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{p.r} · {p.d}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:K.mono,marginTop:1}}>M-Pesa · {p.ref}</div>
            </div>
            <div style={{fontSize:13,fontWeight:900,color:K.electric,fontFamily:K.mono}}>KES {p.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeductRow({ label, v, note, bold }) {
  return (
    <div style={{display:'flex',alignItems:'center',padding:'6px 0'}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:bold?800:600,color:bold?'#fff':'rgba(255,255,255,0.75)'}}>{label}</div>
        {note && <div style={{fontSize:9.5,color:'rgba(255,255,255,0.35)',marginTop:1}}>{note}</div>}
      </div>
      <div style={{fontSize:12.5,fontWeight:700,color:bold?'#fff':'rgba(255,255,255,0.85)',fontFamily:K.mono}}>− KES {v.toLocaleString()}</div>
    </div>
  );
}

// ═══ ME TAB ═══
function MeTab() {
  const rows = [
    { g:'Account',     items:[
      { k:'Skills on file', v:'Waiter, Barista, Bartender' },
      { k:'Certificates',    v:'Food handlers (2025)' },
      { k:'Phone & M-Pesa',  v:'0722 ••• 500' },
    ]},
    { g:'Privacy & Data',   items:[
      { k:'Manage consent',        v:'ID · GPS' },
      { k:'Download my data',      v:'ZIP within 24 hrs' },
      { k:'Correct my information',v:'7-day review' },
      { k:'Delete my account',     v:'Payment records kept 7 yrs (law)', warn:true },
    ]},
    { g:'Support',        items:[
      { k:'Help centre',   v:'' },
      { k:'Contact Klokd', v:'WhatsApp · 9 AM – 9 PM' },
      { k:'Sign out',      v:'', warn:true },
    ]},
  ];

  return (
    <div style={{flex:1,overflowY:'auto',background:K.ink,color:'#fff'}}>
      {/* Profile hero */}
      <div style={{padding:'20px 20px 14px',textAlign:'center'}}>
        <div style={{
          width:80,height:80,margin:'0 auto 12px',borderRadius:'50%',
          background:K.brandGrad,display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:26,fontWeight:900,color:K.ink,letterSpacing:'-0.03em',
          boxShadow:'0 0 30px rgba(0,229,160,0.15)',
        }}>AK</div>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:'-0.02em'}}>Akinyi Koech</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>Verified · ID ✓ · M-Pesa ✓</div>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:999,
          background:'rgba(0,229,160,0.08)',border:'1px solid rgba(0,229,160,0.22)',
          marginTop:10,
        }}>
          {I.shield(K.electric,11)}
          <span style={{fontSize:10.5,fontWeight:700,color:K.electric,letterSpacing:'0.04em',textTransform:'uppercase'}}>Verified worker</span>
        </div>
      </div>

      {/* Portable reputation */}
      <div style={{padding:'0 20px 0'}}>
        <div style={{padding:'14px 16px',borderRadius:18,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:14}}>
          <Label style={{marginBottom:10}}>Your reputation · portable</Label>
          <div style={{display:'flex'}}>
            <Stat n="94%" l="show-up" c={K.electric}/>
            <VLine/>
            <Stat n="4.8" l="rating" c={K.volt} star/>
            <VLine/>
            <Stat n="47" l="shifts" c="#fff"/>
          </div>
          <div style={{marginTop:10,fontSize:10.5,color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>
            This record belongs to you. It stays with you across every employer on Klokd.
          </div>
        </div>
      </div>

      {/* Rows */}
      <div style={{padding:'0 20px 30px'}}>
        {rows.map((g,gi)=>(
          <div key={gi} style={{marginBottom:18}}>
            <Label style={{marginBottom:8}}>{g.g}</Label>
            <div style={{borderRadius:14,overflow:'hidden',border:'1px solid rgba(255,255,255,0.06)'}}>
              {g.items.map((it,i)=>(
                <div key={i} style={{
                  padding:'12px 14px',background:'rgba(255,255,255,0.025)',
                  display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                  borderTop:i===0?'none':'0.5px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:it.warn?K.warning:'#fff'}}>{it.k}</div>
                    {it.v && <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.v}</div>}
                  </div>
                  {I.chevron('rgba(255,255,255,0.3)',12)}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{textAlign:'center',fontSize:9.5,color:'rgba(255,255,255,0.25)',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:10}}>klokd · v1.0 · beta</div>
      </div>
    </div>
  );
}

Object.assign(window, { BottomNav, Home, ShiftDetail, ClockIn, Active, PaymentConfirmed, ShiftsTab, PayTab, MeTab, DEMO_SHIFTS, HistRow });
