// Employer desktop dashboard — bonus view
// A compact operations command center for managers on laptop

const { K, Logo, Label, Eyebrow, StatusPill, I, IE, EscrowMeter, MoneyLine, EMP_WORKERS } = window;

function EmpDesktop() {
  return (
    <div style={{
      width:'100%',height:'100%',background:K.ink,color:'#fff',
      fontFamily:K.fontFamily,display:'flex',flexDirection:'column',overflow:'hidden',
    }}>
      {/* top bar */}
      <div style={{height:56,borderBottom:'0.5px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',padding:'0 22px',gap:18,flexShrink:0}}>
        <Logo size={22}/>
        <div style={{width:0.5,height:22,background:'rgba(255,255,255,0.1)'}}/>
        <div style={{display:'flex',gap:18}}>
          {['Dashboard','Shifts','Team','Pay','Settings'].map((t,i)=>(
            <span key={t} style={{fontSize:12.5,fontWeight:i===0?700:500,color:i===0?'#fff':'rgba(255,255,255,0.5)',cursor:'pointer',letterSpacing:'-0.01em'}}>{t}</span>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:10,alignItems:'center'}}>
          <div style={{padding:'6px 10px',borderRadius:999,background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',fontSize:11,color:'rgba(255,255,255,0.7)',fontWeight:600,display:'inline-flex',gap:6,alignItems:'center'}}>
            <span style={{width:6,height:6,borderRadius:999,background:K.electric}}/>
            The Brew Bistro · Westlands
          </div>
          <div style={{padding:'5px 9px',borderRadius:999,background:`${K.volt}1a`,color:K.volt,fontSize:10.5,fontWeight:700,letterSpacing:'0.06em'}}>LIVE · 2 SHIFTS</div>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#3b6e5e,#1b3e34)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12}}>WM</div>
        </div>
      </div>

      {/* body */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,padding:'18px 22px',overflow:'auto'}}>
        {/* ESCROW hero — spans 2 cols */}
        <div style={{gridColumn:'span 2',padding:'18px 20px',borderRadius:18,background:`linear-gradient(180deg,${K.electric}0d,${K.electric}02 60%), rgba(255,255,255,0.02)`,border:`1px solid ${K.electric}33`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',background:K.mintGlow,pointerEvents:'none'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,position:'relative'}}>
            <div>
              <Label color="rgba(255,255,255,0.5)">Escrow balance</Label>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:6}}>
                <span style={{fontSize:13,color:'rgba(255,255,255,0.5)',fontWeight:700}}>KES</span>
                <span style={{fontSize:38,fontWeight:900,color:'#fff',letterSpacing:'-0.04em',fontFamily:K.mono,lineHeight:1}}>42,300</span>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button style={{padding:'9px 14px',borderRadius:10,background:K.brandGrad,color:K.ink,fontSize:12,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Top up</button>
              <button style={{padding:'9px 14px',borderRadius:10,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.8)',fontSize:12,fontWeight:600,border:'0.5px solid rgba(255,255,255,0.1)',cursor:'pointer',fontFamily:K.fontFamily}}>Ledger</button>
            </div>
          </div>
          <EscrowMeter funded={50000} held={42300} committed={12600}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginTop:18,position:'relative'}}>
            <DStat l="Committed" v="12,600" c={K.electric}/>
            <DStat l="Available" v="29,700" c="#fff"/>
            <DStat l="Released · 30d" v="184k" c={K.volt}/>
            <DStat l="Workers paid" v="63" c="#fff"/>
          </div>
        </div>

        {/* KPI cards */}
        <KPI label="Today's fill rate" value="94%" sub="above 30d avg · +3pp" tone="mint"/>
        <KPI label="Avg time to fill" value="9 min" sub="faster than 87% of venues" tone="volt"/>

        {/* Live shifts board — spans 2 cols */}
        <div style={{gridColumn:'span 2',padding:'16px',borderRadius:16,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,alignItems:'center'}}>
            <Label>Live now</Label>
            <span style={{fontSize:10.5,color:'rgba(255,255,255,0.4)'}}>8:47 PM · auto refresh</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {role:'Waiter',   time:'5 – 10 PM', workers:3, done:2, clockedIn:1, pay:5400},
              {role:'Dishwasher', time:'6 – 11 PM', workers:2, done:0, clockedIn:2, pay:3400},
            ].map((s,i)=>(
              <div key={i} style={{padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:4,alignSelf:'stretch',borderRadius:999,background:K.electric}}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{s.role}</span>
                    <StatusPill tone="mint">Live</StatusPill>
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>{s.time} · {s.workers} workers · KES {s.pay.toLocaleString()} held</div>
                </div>
                <div style={{display:'flex',gap:14}}>
                  <Mini label="On shift" value={s.clockedIn} c={K.electric}/>
                  <Mini label="Clocked out" value={s.done} c={K.volt}/>
                  <Mini label="Expected" value={s.workers - s.clockedIn - s.done} c="rgba(255,255,255,0.6)"/>
                </div>
                <button style={{padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:11.5,fontWeight:700,cursor:'pointer',fontFamily:K.fontFamily}}>Open</button>
              </div>
            ))}
          </div>
        </div>

        {/* Matched workers — spans 2 cols */}
        <div style={{gridColumn:'span 2',padding:'16px',borderRadius:16,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,alignItems:'center'}}>
            <Label>Matched for Friday · Waiter</Label>
            <span style={{fontSize:11,color:K.electric,fontWeight:700,cursor:'pointer'}}>See all →</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {EMP_WORKERS.slice(0,4).map(w=>(
              <div key={w.id} style={{padding:'10px 12px',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:10,alignItems:'center'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:w.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12,flexShrink:0}}>{w.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:5,alignItems:'center'}}>
                    <span style={{fontSize:12,fontWeight:800,color:'#fff'}}>{w.name}</span>
                    <span style={{padding:'1px 5px',borderRadius:999,background:`${K.volt}22`,color:K.volt,fontSize:9,fontWeight:800}}>{w.match}%</span>
                  </div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>★ {w.rating} · {w.shifts} shifts · {w.showUp}%</div>
                </div>
                <button style={{padding:'6px 10px',borderRadius:8,background:K.brandGrad,color:K.ink,fontSize:10.5,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>Accept</button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity ticker */}
        <div style={{padding:'16px',borderRadius:16,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <Label style={{marginBottom:10}}>Recent activity</Label>
          {[
            {t:'Akinyi clocked out',   s:'KES 1,800 · 2m',  c:K.electric},
            {t:'Kevin confirmed',      s:'Tonight · 11m',   c:K.volt},
            {t:'Escrow +KES 20k',      s:'this morning',    c:'#fff'},
            {t:'Njeri rated 5★',       s:'yesterday',       c:K.volt},
          ].map((a,i,arr)=>(
            <div key={i} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:i<arr.length-1?'0.5px solid rgba(255,255,255,0.05)':'none'}}>
              <div style={{width:5,height:5,borderRadius:999,background:a.c,marginTop:7,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:11.5,fontWeight:700,color:'#fff'}}>{a.t}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>{a.s}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly pay chart */}
        <div style={{padding:'16px',borderRadius:16,background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14}}>
            <Label>Paid this week</Label>
            <span style={{fontSize:10.5,color:K.electric,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>{IE.trend(K.electric,10)} +12%</span>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700}}>KES</span>
            <span style={{fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-0.03em',fontFamily:K.mono}}>58,200</span>
          </div>
          {/* mini bar chart */}
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:54}}>
            {[35,48,42,61,38,72,55].map((h,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:'100%',height:`${h}%`,background:i===6?K.brandGrad:`${K.electric}55`,borderRadius:'3px 3px 0 0'}}/>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,color:'rgba(255,255,255,0.4)',marginTop:4,fontFamily:K.mono}}>
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </div>

        {/* Post shift CTA — spans 2 cols */}
        <div style={{gridColumn:'span 2',padding:'18px 20px',borderRadius:16,background:`linear-gradient(135deg,${K.volt}14,${K.electric}08)`,border:`1px solid ${K.volt}44`,display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:K.brandGrad,display:'flex',alignItems:'center',justifyContent:'center'}}>{IE.plus(K.ink,20)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:'#fff',letterSpacing:'-0.02em'}}>Post next week's shifts now</div>
            <div style={{fontSize:11.5,color:'rgba(255,255,255,0.6)',marginTop:2}}>Workers booked 48h ahead have a 99.3% show-up rate</div>
          </div>
          <button style={{padding:'11px 18px',borderRadius:12,background:K.brandGrad,color:K.ink,fontSize:12.5,fontWeight:800,border:'none',cursor:'pointer',fontFamily:K.fontFamily}}>New shift →</button>
        </div>
      </div>
    </div>
  );
}

function DStat({l,v,c}) {
  return (
    <div>
      <div style={{fontSize:9.5,color:'rgba(255,255,255,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:5}}>{l}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:4}}>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700}}>KES</span>
        <span style={{fontSize:18,fontWeight:900,color:c,letterSpacing:'-0.03em',fontFamily:K.mono}}>{v}</span>
      </div>
    </div>
  );
}

function KPI({label,value,sub,tone}) {
  const tones={mint:{c:K.electric,bg:`${K.electric}0d`,bd:`${K.electric}33`},volt:{c:K.volt,bg:`${K.volt}0d`,bd:`${K.volt}33`}};
  const t=tones[tone]||tones.mint;
  return (
    <div style={{padding:'16px 18px',borderRadius:16,background:t.bg,border:`1px solid ${t.bd}`}}>
      <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,marginBottom:8}}>{label}</div>
      <div style={{fontSize:32,fontWeight:900,color:t.c,letterSpacing:'-0.04em',lineHeight:1}}>{value}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:8,lineHeight:1.4}}>{sub}</div>
    </div>
  );
}

function Mini({label,value,c}) {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:16,fontWeight:900,color:c,letterSpacing:'-0.02em',fontFamily:K.mono,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase',fontWeight:700,marginTop:3}}>{label}</div>
    </div>
  );
}

Object.assign(window, { EmpDesktop });
