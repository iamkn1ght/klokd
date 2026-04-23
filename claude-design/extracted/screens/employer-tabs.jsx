// Employer tabs: Shifts (schedule), Pay (escrow ledger), Team (trusted pool)

const { K, GradientBtn, GhostBtn, Eyebrow, Label, Chip, StatusPill, DarkCard,
  VLine, Logo, I, IE, EmpHeader, StatTile, WorkerCard, MoneyLine, EscrowMeter,
  EMP_WORKERS } = window;

// ═══ SHIFTS TAB ═══
function EmpShiftsTab() {
  const [filter, setFilter] = React.useState('all');
  const shifts = [
    { id:'t1', day:'TODAY',    date:'3 Apr', role:'Waiter',  time:'5 – 10 PM',  workers:'3/3', status:'live',   pay:5400, tone:'mint' },
    { id:'t2', day:'TODAY',    date:'3 Apr', role:'Dishwasher', time:'6 – 11 PM', workers:'2/2', status:'live',   pay:3400, tone:'mint' },
    { id:'t3', day:'TOMORROW', date:'4 Apr', role:'Barista', time:'7 AM – 2 PM',workers:'2/2', status:'filled', pay:4200, tone:'mint' },
    { id:'t4', day:'FRIDAY',   date:'5 Apr', role:'Waiter',  time:'6 – 11 PM',  workers:'1/4', status:'filling',pay:8800, tone:'volt' },
    { id:'t5', day:'FRIDAY',   date:'5 Apr', role:'Kitchen', time:'4 – 10 PM',  workers:'0/2', status:'open',   pay:4000, tone:'warn' },
    { id:'t6', day:'SATURDAY', date:'6 Apr', role:'Cashier', time:'9 AM – 5 PM',workers:'0/1', status:'open',   pay:1600, tone:'warn' },
  ];
  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:K.ink}}>
      <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:'-0.03em'}}>Shifts</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>6 upcoming · 2 live now</div>
        </div>
        <button style={{display:'inline-flex',alignItems:'center',gap:4,padding:'7px 11px 7px 9px',borderRadius:999,background:K.brandGrad,color:K.ink,fontSize:11.5,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>
          {IE.plus(K.ink,12)} New
        </button>
      </div>

      <div style={{padding:'14px 20px 0',display:'flex',gap:6,overflowX:'auto'}}>
        {[['all','All · 6'],['live','Live · 2'],['filled','Filled · 1'],['open','Open · 3']].map(([k,l])=>(
          <Chip key={k} active={filter===k} onClick={()=>setFilter(k)}>{l}</Chip>
        ))}
      </div>

      <div style={{padding:'18px 20px 24px'}}>
        {['TODAY','TOMORROW','FRIDAY','SATURDAY'].map(day=>{
          const list = shifts.filter(s=>s.day===day);
          if (!list.length) return null;
          return (
            <div key={day} style={{marginBottom:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
                <Label>{day} · {list[0].date}</Label>
                <span style={{fontSize:10.5,color:'rgba(255,255,255,0.4)',fontFamily:K.mono}}>KES {list.reduce((a,s)=>a+s.pay,0).toLocaleString()}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {list.map(s=>(
                  <div key={s.id} style={{
                    padding:'12px 14px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',
                    display:'flex',alignItems:'center',gap:11,
                  }}>
                    <div style={{width:4,alignSelf:'stretch',borderRadius:999,background:s.tone==='mint'?K.electric:s.tone==='volt'?K.volt:'#FFB347'}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:800,color:'#fff',letterSpacing:'-0.01em'}}>{s.role}</span>
                        {s.status==='live' && <StatusPill tone="mint">Live</StatusPill>}
                        {s.status==='filled' && <StatusPill tone="mint">Filled</StatusPill>}
                        {s.status==='filling' && <StatusPill tone="volt">Filling</StatusPill>}
                        {s.status==='open' && <StatusPill tone="warn">Open</StatusPill>}
                      </div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>{s.time}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:900,color:s.tone==='warn'?'#FFB347':K.electric,fontFamily:K.mono,letterSpacing:'-0.02em'}}>{s.workers}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontFamily:K.mono}}>KES {s.pay.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ PAY TAB (escrow ledger) ═══
function EmpPayTab() {
  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:K.ink}}>
      <div style={{padding:'16px 20px 0'}}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:'-0.03em'}}>Pay</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>Escrow + M-Pesa ledger</div>
      </div>

      {/* Escrow hero */}
      <div style={{padding:'16px 20px 0'}}>
        <div style={{padding:'16px',borderRadius:18,background:`linear-gradient(180deg,${K.electric}0d,${K.electric}02 60%), rgba(255,255,255,0.02)`,border:`1px solid ${K.electric}33`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            <Label color="rgba(255,255,255,0.5)">Escrow balance</Label>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:6,marginBottom:14}}>
              <span style={{fontSize:13,color:'rgba(255,255,255,0.5)',fontWeight:700}}>KES</span>
              <span style={{fontSize:34,fontWeight:900,color:'#fff',letterSpacing:'-0.04em',fontFamily:K.mono}}>42,300</span>
            </div>
            <EscrowMeter funded={50000} held={42300} committed={12600}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:16}}>
              <MiniStat l="Committed" v="12,600" c={K.electric}/>
              <MiniStat l="Available" v="29,700" c="#fff"/>
              <MiniStat l="Released 30d" v="184k" c={K.volt}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'14px 20px 0',display:'flex',gap:8}}>
        <button style={{flex:1,padding:'11px',borderRadius:12,background:K.brandGrad,color:K.ink,fontSize:12,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Top up escrow</button>
        <button style={{flex:1,padding:'11px',borderRadius:12,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.8)',fontSize:12,fontWeight:600,border:'0.5px solid rgba(255,255,255,0.1)',cursor:'pointer',fontFamily:K.fontFamily}}>Withdraw</button>
      </div>

      {/* Ledger */}
      <div style={{padding:'20px 20px 24px'}}>
        <Label style={{marginBottom:10}}>Ledger · April</Label>
        <div style={{padding:'0 14px',borderRadius:14,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          {[
            {d:'3 Apr',t:'Released · Akinyi O.',s:'Waiter · 5h · tonight',       k:-1800,tone:'out'},
            {d:'3 Apr',t:'Escrow top-up',        s:'M-Pesa · Till 504-221',      k:+20000,tone:'in'},
            {d:'2 Apr',t:'Released · Kevin M.',  s:'Dishwasher · 5h',            k:-1600,tone:'out'},
            {d:'2 Apr',t:'Released · 3 workers', s:'Brunch shift · Sat',         k:-5400,tone:'out'},
            {d:'31 Mar',t:'Refund · flagged',    s:'Brian K. no-show · auto',    k:+1800,tone:'refund'},
            {d:'30 Mar',t:'Released · Njeri W.', s:'Kitchen · 6h',               k:-2400,tone:'out'},
          ].map((r,i,arr)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:i<arr.length-1?'0.5px solid rgba(255,255,255,0.05)':'none',alignItems:'center'}}>
              <div style={{width:32,height:32,borderRadius:9,background:r.tone==='in'?`${K.electric}14`:r.tone==='refund'?'rgba(188,255,78,0.14)':'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {r.tone==='in'?<span style={{color:K.electric,fontWeight:900,fontSize:16,lineHeight:1}}>↓</span>:r.tone==='refund'?<span style={{color:K.volt,fontWeight:900,fontSize:16,lineHeight:1}}>↩</span>:<span style={{color:'rgba(255,255,255,0.5)',fontWeight:900,fontSize:16,lineHeight:1}}>↑</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:700,color:'#fff',letterSpacing:'-0.01em'}}>{r.t}</div>
                <div style={{fontSize:10.5,color:'rgba(255,255,255,0.45)',display:'flex',gap:6}}>
                  <span>{r.d}</span><span>·</span><span>{r.s}</span>
                </div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:r.k>0?K.electric:'#fff',fontFamily:K.mono,letterSpacing:'-0.01em'}}>
                {r.k>0?'+':''}{r.k.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <button style={{marginTop:14,width:'100%',padding:'11px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:K.fontFamily,display:'inline-flex',alignItems:'center',gap:6,justifyContent:'center'}}>
          {I.download('rgba(255,255,255,0.6)',12)} Export for accountant · PDF
        </button>
      </div>
    </div>
  );
}
function MiniStat({l,v,c}) {
  return (
    <div>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>{l}</div>
      <div style={{fontSize:14,fontWeight:800,color:c,letterSpacing:'-0.02em',fontFamily:K.mono}}>{v}</div>
    </div>
  );
}

// ═══ TEAM TAB ═══
function EmpTeamTab() {
  const [tab, setTab] = React.useState('trusted');
  const trusted = EMP_WORKERS.slice(0,3).map(w=>({...w, tag:w.id==='w1'?'Regular · 12 shifts':w.id==='w2'?'Top performer':'Lead · 8 shifts'}));
  const recent = EMP_WORKERS.slice(3);

  return (
    <div style={{flex:1,overflowY:'auto',color:'#fff',background:K.ink}}>
      <div style={{padding:'16px 20px 0'}}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:'-0.03em'}}>Team</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2}}>Your trusted pool & history</div>
      </div>

      {/* Quick stats */}
      <div style={{padding:'14px 20px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
        <StatTile label="Trusted" value="12" tone="mint" compact/>
        <StatTile label="Worked · 30d" value="34" tone="neutral" compact/>
        <StatTile label="Avg rating" value="4.7" tone="volt" compact icon={I.star(K.volt,10)}/>
      </div>

      {/* Segmented */}
      <div style={{padding:'14px 20px 0',display:'flex',gap:6}}>
        {[['trusted','Trusted · 12'],['recent','Recent · 34'],['invited','Invited · 3']].map(([k,l])=>(
          <Chip key={k} active={tab===k} onClick={()=>setTab(k)}>{l}</Chip>
        ))}
      </div>

      <div style={{padding:'16px 20px 24px'}}>
        {tab==='trusted' && (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {trusted.map(w=>(
                <div key={w.id} style={{padding:'12px 13px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:11,alignItems:'center'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13,flexShrink:0,position:'relative'}}>
                    {w.initials}
                    <div style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:'50%',background:K.volt,border:`1.5px solid ${K.ink}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {I.star(K.ink,8,true)}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{w.name}</div>
                    <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)',display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span style={{color:K.volt,fontWeight:700}}>★ {w.rating}</span>
                      <span>·</span>
                      <span>{w.tag}</span>
                    </div>
                  </div>
                  <button style={{padding:'7px 10px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#fff',fontSize:10.5,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily}}>Invite</button>
                </div>
              ))}
            </div>
            {/* CTA: invite to shift */}
            <div style={{marginTop:16,padding:'13px 14px',borderRadius:14,background:`linear-gradient(180deg,${K.volt}10,transparent 60%)`,border:`1px solid ${K.volt}33`,display:'flex',gap:10,alignItems:'center'}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${K.volt}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>{IE.flash(K.volt,16)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5,fontWeight:800,color:'#fff'}}>Invite your trusted team first</div>
                <div style={{fontSize:10.5,color:'rgba(255,255,255,0.55)'}}>They see your shift before the open pool</div>
              </div>
              <button style={{padding:'7px 11px',borderRadius:10,background:K.brandGrad,color:K.ink,fontSize:11,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Try it</button>
            </div>
          </>
        )}
        {tab==='recent' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {recent.map(w=>(
              <div key={w.id} style={{padding:'12px 13px',borderRadius:14,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:11,alignItems:'center'}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13,flexShrink:0}}>{w.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{w.name}</div>
                  <div style={{fontSize:10.5,color:'rgba(255,255,255,0.5)'}}>Last worked · 28 Mar · {w.showUp}% show-up</div>
                </div>
                <button style={{padding:'7px 10px',borderRadius:10,border:`1px solid ${K.volt}55`,background:`${K.volt}12`,color:K.volt,fontSize:10.5,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily,display:'inline-flex',alignItems:'center',gap:4}}>{I.star(K.volt,10,true)} Trust</button>
              </div>
            ))}
          </div>
        )}
        {tab==='invited' && (
          <div style={{padding:'32px 20px',textAlign:'center',color:'rgba(255,255,255,0.5)'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>{IE.users('rgba(255,255,255,0.5)',20)}</div>
            <div style={{fontSize:13,color:'#fff',fontWeight:700,marginBottom:4}}>3 invites pending</div>
            <div style={{fontSize:11,lineHeight:1.5}}>Workers you invited to your trusted pool. They'll appear here until they accept.</div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { EmpShiftsTab, EmpPayTab, EmpTeamTab });
