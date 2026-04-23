// Employer main flow: Dashboard, Post Shift, Matched Workers, Live Shift, Paid+Rate

const { K, GradientBtn, GhostBtn, IconBtn, Eyebrow, Label, Chip, StatusPill, DarkCard,
  VLine, Logo, LogoMark, I, IE,
  EmpHeader, StatTile, WorkerCard, MoneyLine, EmpInput, Stepper, EscrowMeter, TimelineDot } = window;

// ═══ DEMO DATA ═══
const EMP_WORKERS = [
  { id:'w1', name:'Akinyi O.',   initials:'AO', rating:4.8, shifts:47, showUp:94, verified:true, badge:'Worked here 3× · last Fri', avatarBg:'linear-gradient(135deg,#5B4A8A,#2B1F52)', match:98 },
  { id:'w2', name:'Kevin M.',    initials:'KM', rating:4.7, shifts:62, showUp:96, verified:true, badge:'Top 5% in Westlands',           avatarBg:'linear-gradient(135deg,#3B6E5E,#1B3E34)', match:94 },
  { id:'w3', name:'Njeri W.',    initials:'NW', rating:4.9, shifts:31, showUp:97, verified:true, badge:'Worked similar venues',         avatarBg:'linear-gradient(135deg,#8A5B3B,#4E2E1B)', match:91 },
  { id:'w4', name:'Brian K.',    initials:'BK', rating:4.6, shifts:88, showUp:93, verified:true, badge:'Available now · 0.9 km',        avatarBg:'linear-gradient(135deg,#4B4B68,#24243A)', match:89 },
  { id:'w5', name:'Faith C.',    initials:'FC', rating:4.8, shifts:24, showUp:100,verified:true, badge:'Perfect show-up record',        avatarBg:'linear-gradient(135deg,#6B3B5E,#3B1E36)', match:87 },
];

const EMP_SHIFTS = [
  { id:'es1', role:'Waiter',  date:'Tonight', time:'5:00 – 10:00 PM', pay:1800, needed:3, filled:2, status:'filling' },
  { id:'es2', role:'Barista', date:'Tomorrow',time:'7:00 AM – 2:00 PM', pay:2100, needed:2, filled:2, status:'filled' },
  { id:'es3', role:'Waiter',  date:'Fri',     time:'6:00 – 11:00 PM', pay:2200, needed:4, filled:1, status:'filling' },
];

// ═══ 01 · DASHBOARD ═══
function EmpDashboard({ greeting='Habari, Wanjiku', onPost, onOpenShift, onOpenWorker }) {
  const pending = EMP_WORKERS.filter(w=>w.match > 90).slice(0,3);
  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:K.ink}}>
      <EmpHeader greeting={greeting}/>

      {/* Escrow card — hero moment */}
      <div style={{padding:'14px 20px 0'}}>
        <div style={{padding:'14px 16px',borderRadius:18,background:`linear-gradient(180deg,${K.electric}0d,${K.electric}02 60%), rgba(255,255,255,0.02)`,border:`1px solid ${K.electric}33`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,position:'relative'}}>
            <Label color="rgba(255,255,255,0.5)">Escrow balance</Label>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:9.5,color:K.electric,fontWeight:700,letterSpacing:'0.1em'}}>{I.shield(K.electric,11)} M-PESA HELD</span>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4,position:'relative'}}>
            <span style={{fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-0.04em',fontFamily:K.mono}}>KES 42,300</span>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>of 50,000</span>
          </div>
          <div style={{position:'relative',marginTop:10}}>
            <EscrowMeter funded={50000} held={42300} committed={12600}/>
          </div>
          <div style={{display:'flex',gap:8,marginTop:12,position:'relative'}}>
            <button style={{flex:1,padding:'9px',borderRadius:10,background:K.brandGrad,color:K.ink,fontSize:11.5,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Top up</button>
            <button style={{flex:1,padding:'9px',borderRadius:10,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.8)',fontSize:11.5,fontWeight:600,border:'0.5px solid rgba(255,255,255,0.1)',cursor:'pointer',fontFamily:K.fontFamily}}>Ledger</button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{padding:'14px 20px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <StatTile label="Today" value="7 workers" sub="4 clocked in · 3 expected" tone="mint" compact icon={IE.users(K.electric,11)}/>
        <StatTile label="This week" value="KES 58.2k" sub="paid to 14 workers" tone="volt" compact icon={IE.trend(K.volt,11)}/>
      </div>

      {/* Open shifts */}
      <div style={{padding:'20px 20px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <Label>Open shifts · {EMP_SHIFTS.length}</Label>
          <button onClick={onPost} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'6px 10px 6px 8px',borderRadius:999,background:K.brandGrad,color:K.ink,fontSize:11,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily,letterSpacing:'-0.01em'}}>
            {IE.plus(K.ink,12)} New shift
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {EMP_SHIFTS.map(s=>(
            <EmpShiftRow key={s.id} shift={s} onClick={()=>onOpenShift&&onOpenShift(s)}/>
          ))}
        </div>
      </div>

      {/* Matched workers preview */}
      <div style={{padding:'22px 20px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <Label>Top matches · tonight's Waiter</Label>
          <span style={{fontSize:10.5,color:K.electric,fontWeight:700,cursor:'pointer'}}>View all</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {pending.map(w=>(
            <WorkerCard key={w.id} worker={w} match={w.match} compact onDetails={()=>onOpenWorker&&onOpenWorker(w)} onAccept={()=>{}}/>
          ))}
        </div>
      </div>

      {/* Recent activity ticker */}
      <div style={{padding:'22px 20px 24px'}}>
        <Label style={{marginBottom:10}}>Recent activity</Label>
        <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          {[
            {t:'Akinyi O. clocked out',     s:'KES 1,800 released · 2m ago', d:K.electric},
            {t:'Kevin M. confirmed shift',  s:'Tonight · Waiter · 11m ago',  d:K.volt},
            {t:'Escrow topped up',          s:'KES 20,000 · this morning',   d:'#fff'},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:i<2?'0.5px solid rgba(255,255,255,0.05)':'none'}}>
              <div style={{width:6,height:6,borderRadius:999,background:a.d,marginTop:6,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{a.t}</div>
                <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)'}}>{a.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmpShiftRow({ shift, onClick }) {
  const filled = shift.filled;
  const need = shift.needed;
  const done = filled >= need;
  return (
    <div onClick={onClick} style={{
      padding:'12px 14px',borderRadius:14,
      background: done ? 'rgba(0,229,160,0.04)' : 'rgba(255,255,255,0.025)',
      border: done ? `1px solid ${K.electric}33` : '1px solid rgba(255,255,255,0.06)',
      cursor:'pointer',display:'flex',alignItems:'center',gap:12,
    }}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>{shift.role}</span>
          {done ? <StatusPill tone="mint">Filled</StatusPill> : <StatusPill tone="volt">Filling</StatusPill>}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>{shift.date} · {shift.time}</div>
      </div>
      {/* Filled pips */}
      <div style={{display:'flex',gap:3,flexShrink:0}}>
        {Array.from({length:need}).map((_,i)=>(
          <div key={i} style={{
            width:7,height:16,borderRadius:2,
            background: i<filled?K.electric:'rgba(255,255,255,0.08)',
          }}/>
        ))}
      </div>
      <div style={{textAlign:'right',minWidth:68,flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:900,color:K.electric,letterSpacing:'-0.02em',fontFamily:K.mono}}>{filled}/{need}</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontFamily:K.mono}}>KES {shift.pay}</div>
      </div>
    </div>
  );
}

// ═══ 02 · POST SHIFT ═══
function EmpPostShift({ onBack, onPosted }) {
  const [role, setRole] = React.useState('Waiter');
  const [date, setDate] = React.useState('Tonight');
  const [start, setStart] = React.useState('17:00');
  const [end, setEnd] = React.useState('22:00');
  const [workers, setWorkers] = React.useState(3);
  const [pay, setPay] = React.useState(1800);
  const [urgent, setUrgent] = React.useState(false);

  const hours = 5;
  const subtotal = pay * workers;
  const fee = Math.round(subtotal * 0.04);
  const total = subtotal + fee;

  // Rate intelligence band (Westlands Waiter, 5h)
  const rateMin = 1500, rateMax = 2200, rateSweet = 1800;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff'}}>
      {/* Header */}
      <div style={{padding:'14px 20px 0',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{width:34,height:34,borderRadius:'50%',border:'0.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{I.back('#fff',14)}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>New shift</div>
          <div style={{fontSize:16,fontWeight:900,letterSpacing:'-0.02em'}}>Post a shift</div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 20px 180px'}}>
        {/* Role */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:8}}>Role</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['Waiter','Barista','Bartender','Cashier','Kitchen','Cleaner'].map(r=>(
              <Chip key={r} active={role===r} onClick={()=>setRole(r)}>{r}</Chip>
            ))}
          </div>
        </div>

        {/* When */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:8}}>When</div>
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {['Tonight','Tomorrow','Fri','Sat','Sun','Pick'].map(d=>(
              <Chip key={d} active={date===d} onClick={()=>setDate(d)}>{d}</Chip>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1,padding:'11px 13px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700}}>Start</div>
              <div style={{fontSize:16,fontWeight:800,color:'#fff',fontFamily:K.mono,marginTop:2}}>{start}</div>
            </div>
            <div style={{flex:1,padding:'11px 13px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700}}>End</div>
              <div style={{fontSize:16,fontWeight:800,color:'#fff',fontFamily:K.mono,marginTop:2}}>{end}</div>
            </div>
            <div style={{padding:'11px 13px',borderRadius:12,background:'rgba(188,255,78,0.08)',border:'1px solid rgba(188,255,78,0.2)',display:'flex',alignItems:'center'}}>
              <div style={{fontSize:13,fontWeight:900,color:K.volt,fontFamily:K.mono}}>{hours}h</div>
            </div>
          </div>
        </div>

        {/* Workers needed */}
        <div style={{marginBottom:18,padding:'14px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:10}}>Workers needed</div>
          <Stepper value={workers} onChange={setWorkers} min={1} max={20} suffix={workers===1?'worker':'workers'}/>
        </div>

        {/* Pay — rate intelligence */}
        <div style={{marginBottom:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>Pay per worker</div>
            <span style={{fontSize:10,color:K.electric,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>{IE.trend(K.electric,10)} Market band</span>
          </div>
          <div style={{padding:'14px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:14}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.5)',fontWeight:700}}>KES</span>
              <span style={{fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-0.04em',fontFamily:K.mono}}>{pay.toLocaleString()}</span>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginLeft:'auto'}}>{Math.round(pay/hours)}/h</span>
            </div>
            {/* Rate band */}
            <div style={{position:'relative',height:32,marginBottom:6}}>
              <div style={{position:'absolute',left:0,right:0,top:14,height:4,borderRadius:999,background:'rgba(255,255,255,0.06)'}}/>
              <div style={{position:'absolute',left:'20%',right:'15%',top:14,height:4,borderRadius:999,background:`${K.electric}55`}}/>
              <div style={{position:'absolute',left:`${((pay-rateMin)/(rateMax-rateMin))*100}%`,top:9,transform:'translateX(-50%)',width:14,height:14,borderRadius:999,background:K.electric,border:`3px solid ${K.ink}`,boxShadow:`0 0 0 2px ${K.electric}44`}}/>
              <div style={{position:'absolute',left:0,top:0,fontSize:9.5,color:'rgba(255,255,255,0.4)',fontFamily:K.mono}}>KES {rateMin}</div>
              <div style={{position:'absolute',right:0,top:0,fontSize:9.5,color:'rgba(255,255,255,0.4)',fontFamily:K.mono}}>KES {rateMax}</div>
            </div>
            <div style={{display:'flex',gap:6,marginTop:10}}>
              {[1600, 1800, 2000, 2200].map(p=>(
                <button key={p} onClick={()=>setPay(p)} style={{
                  flex:1,padding:'7px 4px',borderRadius:8,
                  border: pay===p?`1.5px solid ${K.electric}`:'1px solid rgba(255,255,255,0.08)',
                  background: pay===p?`${K.electric}14`:'transparent',
                  color: pay===p?K.electric:'rgba(255,255,255,0.65)',
                  fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily,
                }}>{p}</button>
              ))}
            </div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',marginTop:10,lineHeight:1.45,display:'flex',gap:6,alignItems:'flex-start'}}>
              {I.shield(K.volt,11)} <span>At <span style={{color:K.electric,fontWeight:700}}>KES {pay}</span>, expect ~<span style={{color:'#fff',fontWeight:700}}>11 min</span> to fill with verified workers.</span>
            </div>
          </div>
        </div>

        {/* Urgent toggle */}
        <button onClick={()=>setUrgent(!urgent)} style={{
          width:'100%',padding:'12px 14px',borderRadius:12,cursor:'pointer',fontFamily:K.fontFamily,
          border: urgent?`1.5px solid ${K.volt}`:'1px solid rgba(255,255,255,0.08)',
          background: urgent?`${K.volt}14`:'rgba(255,255,255,0.02)',
          display:'flex',alignItems:'center',gap:10,textAlign:'left',
        }}>
          <div style={{width:32,height:32,borderRadius:9,background:urgent?`${K.volt}22`:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {IE.flash(urgent?K.volt:'rgba(255,255,255,0.5)',14)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12.5,fontWeight:800,color:'#fff'}}>Flash-fill · push to top workers first</div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,0.55)'}}>+KES 40/worker · fills 3× faster</div>
          </div>
          <div style={{width:32,height:18,borderRadius:999,background:urgent?K.volt:'rgba(255,255,255,0.1)',padding:2,transition:'background .2s'}}>
            <div style={{width:14,height:14,borderRadius:'50%',background:urgent?K.ink:'#fff',transform:`translateX(${urgent?14:0}px)`,transition:'transform .2s'}}/>
          </div>
        </button>
      </div>

      {/* Sticky cost summary + CTA */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 22px',background:'linear-gradient(180deg,transparent,#0A0A0F 25%)'}}>
        <div style={{padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',backdropFilter:'blur(12px)',marginBottom:10}}>
          <MoneyLine label={`${workers} × KES ${pay}`} value={`KES ${subtotal.toLocaleString()}`}/>
          <MoneyLine label="Klokd service fee · 4%" value={`KES ${fee.toLocaleString()}`} muted/>
          <div style={{height:0.5,background:'rgba(255,255,255,0.08)',margin:'4px 0'}}/>
          <MoneyLine label="Held in escrow" value={`KES ${total.toLocaleString()}`} bold big tone="mint"/>
        </div>
        <GradientBtn onClick={onPosted}>Post shift · hold KES {total.toLocaleString()}</GradientBtn>
      </div>
    </div>
  );
}

// ═══ 03 · MATCHED WORKERS ═══
function EmpMatched({ onBack, onConfirm }) {
  const [accepted, setAccepted] = React.useState([]);
  const need = 3;
  const left = need - accepted.length;
  const accept = (id) => setAccepted(a => a.includes(id)?a:[...a,id]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff'}}>
      <div style={{padding:'14px 20px 0',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{width:34,height:34,borderRadius:'50%',border:'0.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{I.back('#fff',14)}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700}}>Matched workers</div>
          <div style={{fontSize:16,fontWeight:900,letterSpacing:'-0.02em'}}>Waiter · tonight</div>
        </div>
      </div>

      {/* Fill meter */}
      <div style={{padding:'14px 20px 0'}}>
        <div style={{padding:'12px 14px',borderRadius:14,background:accepted.length>=need?`linear-gradient(180deg,${K.electric}18,${K.electric}04)`:'rgba(255,255,255,0.03)',border:accepted.length>=need?`1px solid ${K.electric}66`:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <Label color="rgba(255,255,255,0.5)">Filling · {accepted.length}/{need}</Label>
            {accepted.length < need ? (
              <span style={{fontSize:10.5,color:K.volt,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>{IE.flash(K.volt,10)} ~{left===need?11:left*4} min est.</span>
            ) : (
              <span style={{fontSize:10.5,color:K.electric,fontWeight:800,letterSpacing:'0.08em'}}>ALL FILLED</span>
            )}
          </div>
          <div style={{height:5,borderRadius:999,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
            <div style={{width:`${(accepted.length/need)*100}%`,height:'100%',background:K.brandGrad,transition:'width .3s'}}/>
          </div>
        </div>
      </div>

      {/* Sort/filter */}
      <div style={{padding:'14px 20px 0',display:'flex',gap:6}}>
        <Chip active>Top match</Chip>
        <Chip>Nearest</Chip>
        <Chip>Worked here</Chip>
        <Chip>4.8+★</Chip>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 20px 140px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {EMP_WORKERS.map(w=>(
            <WorkerCard key={w.id} worker={w} match={w.match}
              accepted={accepted.includes(w.id)}
              onAccept={()=>accept(w.id)}
            />
          ))}
        </div>

        {/* No-show insurance note */}
        <div style={{marginTop:14,padding:'11px 13px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',display:'flex',gap:9,alignItems:'flex-start'}}>
          {I.shield('rgba(255,255,255,0.55)',14)}
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',lineHeight:1.45}}>
            Every accept is backed by <span style={{color:K.electric,fontWeight:700}}>No-Show Insurance</span>. If a worker doesn't arrive, we auto-replace within 20 min or refund.
          </div>
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 20px 22px',background:'linear-gradient(180deg,transparent,#0A0A0F 25%)'}}>
        <GradientBtn disabled={accepted.length===0} onClick={onConfirm}>
          {accepted.length>=need ? 'All filled · close shift' : accepted.length===0 ? 'Accept workers to continue' : `Close with ${accepted.length} · keep finding ${left}`}
        </GradientBtn>
      </div>
    </div>
  );
}

// ═══ 04 · LIVE SHIFT (tracking + release pay) ═══
function EmpLiveShift({ onBack, onRelease }) {
  const [released, setReleased] = React.useState({});
  const clockedOut = EMP_WORKERS.slice(0,2);
  const clockedIn = EMP_WORKERS.slice(2,3);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff'}}>
      <div style={{padding:'14px 20px 0',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{width:34,height:34,borderRadius:'50%',border:'0.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{I.back('#fff',14)}</button>
        <div style={{flex:1}}>
          <div style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:999,background:K.electric,boxShadow:`0 0 8px ${K.electric}`}}/> LIVE</div>
          <div style={{fontSize:16,fontWeight:900,letterSpacing:'-0.02em'}}>Waiter · tonight</div>
        </div>
        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.45)',fontFamily:K.mono}}>8:47 PM</div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 20px 30px'}}>
        {/* Shift progress */}
        <div style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
            <Label color="rgba(255,255,255,0.5)">Shift time</Label>
            <span style={{fontSize:10.5,color:K.electric,fontWeight:700,fontFamily:K.mono}}>3h 47m / 5h</span>
          </div>
          <div style={{height:6,borderRadius:999,background:'rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:12}}>
            <div style={{width:'75%',height:'100%',background:K.brandGrad}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5,color:'rgba(255,255,255,0.45)',fontFamily:K.mono}}>
            <span>5:00 PM · start</span>
            <span>10:00 PM · end</span>
          </div>
        </div>

        {/* Workers clocked out — needs release */}
        {clockedOut.length > 0 && (
          <div style={{marginBottom:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <Label>Clocked out · {clockedOut.length}</Label>
              <span style={{fontSize:10,color:K.electric,fontWeight:700,letterSpacing:'0.06em'}}>RELEASING IN 2:34</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {clockedOut.map(w=>{
                const isReleased = released[w.id];
                return (
                  <div key={w.id} style={{padding:'13px',borderRadius:14,background:isReleased?`linear-gradient(180deg,${K.electric}14,${K.electric}03)`:'rgba(255,255,255,0.03)',border:isReleased?`1px solid ${K.electric}55`:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{display:'flex',gap:11,alignItems:'center',marginBottom:10}}>
                      <div style={{width:38,height:38,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13,flexShrink:0}}>{w.initials}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{w.name}</div>
                        <div style={{fontSize:10.5,color:'rgba(255,255,255,0.55)'}}>Clocked out · 5h 02m worked</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:15,fontWeight:900,color:K.electric,letterSpacing:'-0.02em',fontFamily:K.mono}}>KES 1,800</div>
                      </div>
                    </div>
                    {isReleased ? (
                      <div style={{padding:'7px 10px',borderRadius:10,background:`${K.electric}14`,color:K.electric,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5,justifyContent:'center'}}>
                        {I.check(K.electric,12)} Released · M-Pesa on the way
                      </div>
                    ) : (
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setReleased(r=>({...r,[w.id]:true}))} style={{flex:1,padding:'9px',borderRadius:10,background:K.brandGrad,color:K.ink,fontSize:11.5,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Release now</button>
                        <button style={{padding:'9px 12px',borderRadius:10,background:'rgba(255,179,71,0.08)',color:'#FFB347',fontSize:11.5,fontWeight:700,border:'1px solid rgba(255,179,71,0.25)',cursor:'pointer',fontFamily:K.fontFamily,display:'inline-flex',alignItems:'center',gap:5}}>{I.dispute('#FFB347',11)} Flag</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Workers still on shift */}
        <div style={{marginBottom:18}}>
          <Label style={{marginBottom:10}}>On shift · {clockedIn.length}</Label>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {clockedIn.map(w=>(
              <div key={w.id} style={{padding:'12px 13px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:11,alignItems:'center'}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13,flexShrink:0,position:'relative'}}>
                  {w.initials}
                  <span style={{position:'absolute',bottom:-1,right:-1,width:12,height:12,borderRadius:'50%',background:K.electric,border:`2px solid ${K.ink}`,boxShadow:`0 0 8px ${K.electric}`}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:800,color:'#fff'}}>{w.name}</div>
                  <div style={{fontSize:10.5,color:K.electric,fontWeight:700}}>On shift · 3h 12m</div>
                </div>
                <div style={{fontSize:11.5,color:'rgba(255,255,255,0.5)',fontFamily:K.mono}}>KES 1,800</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{padding:'14px 16px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <Label style={{marginBottom:12}}>Timeline</Label>
          <TimelineDot state="past"   label="3 workers confirmed" sub="Akinyi, Kevin, Njeri" time="4:48 PM"/>
          <TimelineDot state="past"   label="All clocked in"       sub="Within 7 min of start"  time="5:07 PM"/>
          <TimelineDot state="active" label="Akinyi clocked out"   sub="5h 02m worked · awaiting release" time="8:45 PM"/>
          <TimelineDot state="future" label="Shift ends"           sub="Auto-release at 10:05" time="10:00 PM" last/>
        </div>
      </div>
    </div>
  );
}

// ═══ 05 · PAID + RATE ═══
function EmpPaidRate({ onDone }) {
  const [ratings, setRatings] = React.useState({});
  const workers = EMP_WORKERS.slice(0,3);
  const allRated = workers.every(w => ratings[w.id] != null);
  const setR = (id, n) => setRatings(r => ({ ...r, [id]: n }));

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:K.ink,color:'#fff',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:360,height:260,borderRadius:'50%',background:`radial-gradient(ellipse,${K.electric}22,transparent 70%)`,pointerEvents:'none'}}/>
      <div style={{flex:1,overflowY:'auto',padding:'36px 22px 120px',position:'relative',zIndex:1}}>
        <div style={{width:60,height:60,borderRadius:'50%',background:K.brandGrad,margin:'0 0 18px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {I.check(K.ink,28)}
        </div>
        <Eyebrow color={K.electric} style={{marginBottom:8}}>SHIFT COMPLETE</Eyebrow>
        <h1 style={{fontSize:28,fontWeight:900,letterSpacing:'-0.04em',lineHeight:1.1,margin:'0 0 6px'}}>All 3 paid.</h1>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.6)',marginBottom:20}}>
          <span style={{color:'#fff',fontWeight:700,fontFamily:K.mono}}>KES 5,400</span> released from escrow
        </div>

        {/* Receipt summary */}
        <div style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',paddingBottom:10,borderBottom:'0.5px dashed rgba(255,255,255,0.1)',marginBottom:10}}>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Receipt · SH‑­2847</span>
            <span style={{fontSize:10.5,color:K.electric,fontWeight:700,letterSpacing:'0.06em'}}>SETTLED</span>
          </div>
          <MoneyLine label="3 × KES 1,800" value="KES 5,400"/>
          <MoneyLine label="Service fee" value="KES 216" muted/>
          <MoneyLine label="M-Pesa txn" value="SKQ‑­4821" muted/>
          <div style={{height:0.5,background:'rgba(255,255,255,0.08)',margin:'4px 0'}}/>
          <MoneyLine label="Total released" value="KES 5,616" bold big tone="mint"/>
        </div>

        {/* Rate workers */}
        <Label style={{marginBottom:10}}>Rate tonight's team</Label>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
          {workers.map(w=>(
            <div key={w.id} style={{padding:'12px 13px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex',gap:11,alignItems:'center',marginBottom:10}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12,flexShrink:0}}>{w.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:800,color:'#fff'}}>{w.name}</div>
                  <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)'}}>5h 02m · KES 1,800</div>
                </div>
                {ratings[w.id] != null && <span style={{fontSize:10.5,color:K.electric,fontWeight:700}}>Rated</span>}
              </div>
              <div style={{display:'flex',gap:6,justifyContent:'space-between'}}>
                {[1,2,3,4,5].map(n=>{
                  const on = ratings[w.id] >= n;
                  return (
                    <button key={n} onClick={()=>setR(w.id,n)} style={{
                      flex:1,padding:'8px',borderRadius:9,
                      border: on?`1.5px solid ${K.volt}`:'1px solid rgba(255,255,255,0.08)',
                      background: on?`${K.volt}1a`:'transparent',
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                    }}>
                      {I.star(on?K.volt:'rgba(255,255,255,0.25)',14,on)}
                    </button>
                  );
                })}
              </div>
              {ratings[w.id]===5 && (
                <button style={{marginTop:8,width:'100%',padding:'7px',borderRadius:9,background:`${K.volt}1a`,color:K.volt,fontSize:11,fontWeight:700,border:`1px solid ${K.volt}33`,cursor:'pointer',fontFamily:K.fontFamily,display:'inline-flex',alignItems:'center',gap:5,justifyContent:'center'}}>
                  {IE.users(K.volt,11)} Add to trusted team
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 22px 22px',background:'linear-gradient(180deg,transparent,#0A0A0F 25%)'}}>
        <GradientBtn disabled={!allRated} onClick={onDone}>{allRated?'Done · back to dashboard':`Rate ${workers.length-Object.keys(ratings).length} more`}</GradientBtn>
      </div>
    </div>
  );
}

Object.assign(window, { EmpDashboard, EmpPostShift, EmpMatched, EmpLiveShift, EmpPaidRate, EMP_WORKERS, EMP_SHIFTS });
