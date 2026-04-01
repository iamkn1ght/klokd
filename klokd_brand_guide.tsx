import { useState } from "react";

const T = {
  electric: "#00E5A0",
  volt: "#BCFF4E",
  ink: "#0A0A0F",
  slate: "#1A1A2E",
  mist: "#F4F6F3",
  soft: "#E8EDE8",
  mid: "#6B7280",
  warm: "#F9F7F4",
  success: "#00E5A0",
  warning: "#FFB347",
  error: "#FF6B6B",
  info: "#60A5FA",
};

const tabs = ["Foundation","Logo","Colour","Typography","Tokens","Voice","Motion","Do & Don't"];

const Chip = ({children, color = T.electric, bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 10px",borderRadius:999,border:`1px solid ${color}`,background:bg||"transparent",color,fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>{children}</span>
);

const SectionLabel = ({children}) => (
  <div style={{fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:T.mid,marginBottom:"0.8rem",paddingBottom:"0.5rem",borderBottom:`0.5px solid ${T.soft}`}}>{children}</div>
);

const Card = ({children, dark, style={}}) => (
  <div style={{background:dark?T.slate:"#fff",borderRadius:16,padding:"1.2rem",border:`1px solid ${dark?"rgba(255,255,255,0.06)":T.soft}`,...style}}>{children}</div>
);

function CopyTag({value, label}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(()=>setCopied(false),1500);
  };
  return (
    <button onClick={copy} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,border:`1px solid ${T.soft}`,background:T.mist,cursor:"pointer",fontSize:"0.68rem",color:copied?T.electric:T.mid,fontFamily:"monospace",fontWeight:600,transition:"all 0.15s"}}>
      {copied ? "✓ copied" : (label||value)}
    </button>
  );
}

function ColourSwatch({name, hex, pantone, cmyk, dark, role}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(hex); setCopied(true); setTimeout(()=>setCopied(false),1500); };
  return (
    <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.soft}`,cursor:"pointer"}} onClick={copy}>
      <div style={{height:72,background:hex,display:"flex",alignItems:"flex-end",padding:"8px 10px"}}>
        {copied && <span style={{fontSize:"0.65rem",fontWeight:700,color:dark?"#fff":T.ink,background:"rgba(0,0,0,0.2)",padding:"2px 8px",borderRadius:999}}>Copied!</span>}
      </div>
      <div style={{padding:"10px 12px",background:"#fff"}}>
        <div style={{fontSize:"0.8rem",fontWeight:700,color:T.ink,marginBottom:2}}>{name}</div>
        <div style={{fontSize:"0.65rem",fontFamily:"monospace",color:T.mid,marginBottom:2}}>{hex}</div>
        {role && <div style={{fontSize:"0.6rem",color:T.mid,marginBottom:4}}>{role}</div>}
        {pantone && <div style={{fontSize:"0.6rem",color:T.mid}}>{pantone}</div>}
      </div>
    </div>
  );
}

function TypeSpecimen({size, weight, tracking, leading, label, sample, mono}) {
  return (
    <div style={{padding:"1rem 0",borderBottom:`0.5px solid ${T.soft}`}}>
      <div style={{display:"flex",gap:16,alignItems:"baseline",marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.electric}}>{label}</span>
        <span style={{fontSize:"0.6rem",color:T.mid,fontFamily:"monospace"}}>{size} / {weight} / ls:{tracking} / lh:{leading}</span>
      </div>
      <div style={{fontSize:size,fontWeight:weight,letterSpacing:tracking,lineHeight:leading,color:T.ink,fontFamily:mono?"monospace":"inherit"}}>{sample}</div>
    </div>
  );
}

function TokenRow({name, value, preview}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`0.5px solid ${T.soft}`}}>
      <div style={{flex:1,fontSize:"0.72rem",fontFamily:"monospace",color:T.ink}}>{name}</div>
      <div style={{fontSize:"0.72rem",fontFamily:"monospace",color:T.mid}}>{value}</div>
      {preview}
    </div>
  );
}

const Logo = ({size=40, light}) => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <div style={{width:size,height:size,background:`linear-gradient(135deg, ${T.electric}, ${T.volt})`,borderRadius:size*0.28,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{color:T.ink,fontWeight:900,fontSize:size*0.44,letterSpacing:"-0.04em"}}>K</span>
    </div>
    <span style={{fontWeight:900,fontSize:size*0.52,letterSpacing:"-0.05em",color:light?"#fff":T.ink}}>klokd</span>
  </div>
);

const LogoMark = ({size=40}) => (
  <div style={{width:size,height:size,background:`linear-gradient(135deg, ${T.electric}, ${T.volt})`,borderRadius:size*0.28,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <span style={{color:T.ink,fontWeight:900,fontSize:size*0.44,letterSpacing:"-0.04em"}}>K</span>
  </div>
);

export default function BrandGuide() {
  const [active, setActive] = useState("Foundation");

  return (
    <div style={{fontFamily:"'Inter','Helvetica Neue',Arial,sans-serif",background:T.soft,minHeight:"100vh",WebkitFontSmoothing:"antialiased"}}>

      {/* Header */}
      <div style={{background:T.ink,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,position:"sticky",top:0,zIndex:100}}>
        <Logo size={30} light />
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Chip color={T.electric}>Brand Guide v1.0</Chip>
          <Chip color="rgba(255,255,255,0.3)">Confidential</Chip>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:T.mist,borderBottom:`1px solid ${T.soft}`,padding:"8px 16px",display:"flex",gap:4,overflowX:"auto",position:"sticky",top:58,zIndex:99}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setActive(t)} style={{padding:"5px 14px",borderRadius:999,border:"none",cursor:"pointer",background:active===t?T.ink:"transparent",color:active===t?T.electric:T.mid,fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap",transition:"all 0.15s"}}>
            {t}
          </button>
        ))}
      </div>

      <div style={{padding:"clamp(1rem,3vw,2rem)",maxWidth:900,margin:"0 auto"}}>

        {/* ── FOUNDATION ── */}
        {active==="Foundation" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card dark>
              <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.electric,marginBottom:12}}>Brand Idea</div>
              <div style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:900,letterSpacing:"-0.03em",color:"#fff",lineHeight:1.1,marginBottom:14}}>
                The trust layer Kenya's<br/><span style={{color:T.electric}}>casual labour market</span><br/>has never had.
              </div>
              <div style={{fontSize:"0.85rem",color:"rgba(255,255,255,0.55)",lineHeight:1.7,maxWidth:560}}>
                Klokd is not an HR tool. It is not a job board. It is the infrastructure — the moment of connection, commitment, and payment — that turns an informal relationship into a trusted one. Every design decision must serve that idea.
              </div>
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1rem"}}>
              {[
                {title:"Purpose",body:"To make casual work dignified, reliable, and paid — for the worker and the employer, every single shift.",color:T.electric},
                {title:"Vision",body:"To become the infrastructure layer for East Africa's informal labour economy — starting with Kenya's 16.7 million casual workers.",color:T.volt},
                {title:"Mission",body:"To connect verified workers with businesses that need them — instantly, on mobile, with M-Pesa payment within minutes of every shift.",color:T.info},
              ].map((c,i)=>(
                <Card key={i}>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:c.color,marginBottom:8}}>{c.title}</div>
                  <div style={{fontSize:"0.82rem",color:T.mid,lineHeight:1.65}}>{c.body}</div>
                </Card>
              ))}
            </div>

            <Card>
              <SectionLabel>Brand Personality</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"1rem"}}>
                {[
                  {trait:"Trustworthy",opp:"Not corporate",desc:"Klokd earns trust through transparency, reliability, and doing what it says it will do. Never bureaucratic or distant."},
                  {trait:"Direct",opp:"Not clever",desc:"Klokd speaks plainly. The worker and employer do not have time for ambiguity. Every word earns its place."},
                  {trait:"Energetic",opp:"Not aggressive",desc:"There is urgency in this product — shifts are time-sensitive. The brand has energy without anxiety."},
                  {trait:"Warm",opp:"Not sentimental",desc:"Klokd cares about the people who use it. That shows in language, not decoration."},
                  {trait:"Precise",opp:"Not cold",desc:"Data, times, amounts — Klokd is specific. Precision is a form of respect for the user's time."},
                ].map((p,i)=>(
                  <div key={i} style={{padding:"0.9rem",background:T.mist,borderRadius:12,border:`1px solid ${T.soft}`}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:T.ink,marginBottom:2}}>{p.trait}</div>
                    <div style={{fontSize:"0.65rem",color:T.electric,fontWeight:600,marginBottom:6}}>not {p.opp}</div>
                    <div style={{fontSize:"0.72rem",color:T.mid,lineHeight:1.5}}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card dark>
              <SectionLabel>Brand Positioning Statement</SectionLabel>
              <div style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.8)",lineHeight:1.8,fontStyle:"italic",borderLeft:`3px solid ${T.electric}`,paddingLeft:"1rem"}}>
                "For Kenya's casual workers and the businesses that employ them, Klokd is the mobile platform that makes every shift instant, verified, and paid — because no one should have to chase a wage or a worker on WhatsApp."
              </div>
            </Card>
          </div>
        )}

        {/* ── LOGO ── */}
        {active==="Logo" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card>
              <SectionLabel>Logo System</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
                <div style={{padding:"2rem",background:T.mist,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",gap:12,border:`1px solid ${T.soft}`}}>
                  <Logo size={44}/>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.mid}}>Primary — light</div>
                </div>
                <div style={{padding:"2rem",background:T.ink,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <Logo size={44} light/>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)"}}>Primary — dark</div>
                </div>
                <div style={{padding:"2rem",background:T.mist,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",gap:16,border:`1px solid ${T.soft}`}}>
                  <LogoMark size={48}/>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.mid}}>Logomark only</div>
                </div>
                <div style={{padding:"2rem",background:`linear-gradient(135deg,${T.electric},${T.volt})`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <span style={{fontWeight:900,fontSize:"2rem",letterSpacing:"-0.05em",color:T.ink}}>klokd</span>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(10,10,15,0.5)"}}>Wordmark on brand</div>
                </div>
              </div>
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1rem"}}>
              <Card>
                <SectionLabel>Clear Space Rule</SectionLabel>
                <div style={{display:"flex",justifyContent:"center",padding:"1rem",background:T.mist,borderRadius:12,marginBottom:10,position:"relative"}}>
                  <div style={{border:`1.5px dashed ${T.electric}40`,padding:"16px",borderRadius:8}}>
                    <Logo size={36}/>
                  </div>
                </div>
                <div style={{fontSize:"0.75rem",color:T.mid,lineHeight:1.6}}>Minimum clear space on all sides equals the height of the logomark. Never crowd the logo with other elements.</div>
              </Card>

              <Card>
                <SectionLabel>Minimum Sizes</SectionLabel>
                <div style={{display:"flex",flexDirection:"column",gap:16,padding:"0.5rem 0"}}>
                  {[
                    {label:"Digital minimum",size:24,note:"App icon, notification"},
                    {label:"UI minimum",size:32,note:"Navigation, headers"},
                    {label:"Print minimum",size:48,note:"Documents, decks"},
                  ].map((m,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:16}}>
                      <LogoMark size={m.size}/>
                      <div>
                        <div style={{fontSize:"0.72rem",fontWeight:600,color:T.ink}}>{m.label}</div>
                        <div style={{fontSize:"0.65rem",color:T.mid}}>{m.note} · {m.size}px min</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <SectionLabel>Logo Don'ts</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"1rem"}}>
                {[
                  {label:"Don't stretch",bg:T.mist,style:{transform:"scaleX(1.4)"}},
                  {label:"Don't recolour mark",bg:T.mist,markColor:"#FF6B6B"},
                  {label:"Don't use on busy bg",bg:"repeating-linear-gradient(45deg,#ddd 0,#ddd 2px,#fff 0,#fff 8px)"},
                  {label:"Don't add effects",bg:T.mist,shadow:true},
                ].map((d,i)=>(
                  <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${T.soft}`}}>
                    <div style={{height:72,background:d.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                      <div style={{...d.style,filter:d.shadow?"drop-shadow(4px 4px 8px rgba(0,0,0,0.4))":"none",opacity:0.7}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:28,height:28,background:d.markColor||`linear-gradient(135deg,${T.electric},${T.volt})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{color:T.ink,fontWeight:900,fontSize:"0.75rem"}}>K</span>
                          </div>
                          <span style={{fontWeight:900,fontSize:"0.9rem",letterSpacing:"-0.04em",color:T.ink}}>klokd</span>
                        </div>
                      </div>
                      <div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{color:"#fff",fontSize:"0.6rem",fontWeight:700}}>✗</span>
                      </div>
                    </div>
                    <div style={{padding:"6px 10px",background:"#fff"}}>
                      <div style={{fontSize:"0.65rem",color:T.error,fontWeight:600}}>{d.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── COLOUR ── */}
        {active==="Colour" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card>
              <SectionLabel>Primary Palette — click to copy hex</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
                <ColourSwatch name="Electric Mint" hex="#00E5A0" role="Primary CTA · Success · Money" pantone="Pantone 3385 C" />
                <ColourSwatch name="Volt Lime" hex="#BCFF4E" role="Secondary CTA · Energy · Growth" pantone="Pantone 381 C" />
                <ColourSwatch name="Klokd Ink" hex="#0A0A0F" dark role="Primary background · Dark shell" pantone="Pantone Black 6 C" />
                <ColourSwatch name="Deep Slate" hex="#1A1A2E" dark role="Cards on dark · Dark elevation" />
              </div>
              <SectionLabel>Secondary Palette</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
                <ColourSwatch name="Nordic Mist" hex="#F4F6F3" role="Light shell · Page background" />
                <ColourSwatch name="Soft Grey" hex="#E8EDE8" role="Borders · Dividers · Subtle fills" />
                <ColourSwatch name="Mid Grey" hex="#6B7280" role="Body text · Secondary labels" />
                <ColourSwatch name="Warm White" hex="#F9F7F4" role="Alt background · Print" />
              </div>
              <SectionLabel>Semantic Colours</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"1rem"}}>
                <ColourSwatch name="Success" hex="#00E5A0" role="Confirmed · Paid · Active" />
                <ColourSwatch name="Warning" hex="#FFB347" role="Pending · Attention needed" />
                <ColourSwatch name="Error" hex="#FF6B6B" role="Failed · Declined · Risk High" />
                <ColourSwatch name="Info" hex="#60A5FA" role="Neutral info · Data · Links" />
              </div>
            </Card>

            <Card>
              <SectionLabel>Colour Usage Rules</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"}}>
                {[
                  {rule:"Electric Mint on Ink",bg:T.ink,fg:T.electric,use:"Primary CTAs, key data points, active states on dark backgrounds. Never use on light backgrounds — contrast fails."},
                  {rule:"Ink on Electric Mint",bg:T.electric,fg:T.ink,use:"CTA button text, logomark letter. The only approved text on Electric Mint. Never use white text on Electric Mint."},
                  {rule:"Volt on Ink",bg:T.ink,fg:T.volt,use:"Secondary CTAs, energy accents. Use sparingly — Volt is for emphasis, not structure."},
                  {rule:"Ink on Mist",bg:T.mist,fg:T.ink,use:"Primary body text on light backgrounds. The default for all employer-side screens."},
                ].map((r,i)=>(
                  <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${T.soft}`}}>
                    <div style={{background:r.bg,padding:"14px",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,background:`linear-gradient(135deg,${T.electric},${T.volt})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{color:T.ink,fontWeight:900,fontSize:"0.75rem"}}>K</span>
                      </div>
                      <span style={{fontWeight:700,fontSize:"0.85rem",color:r.fg,letterSpacing:"-0.02em"}}>klokd</span>
                    </div>
                    <div style={{padding:"10px 12px",background:"#fff"}}>
                      <div style={{fontSize:"0.72rem",fontWeight:600,color:T.ink,marginBottom:3}}>{r.rule}</div>
                      <div style={{fontSize:"0.65rem",color:T.mid,lineHeight:1.5}}>{r.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card dark>
              <SectionLabel>Gradient System</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1rem"}}>
                {[
                  {name:"Brand Gradient",css:"linear-gradient(135deg, #00E5A0, #BCFF4E)",use:"Primary CTAs · Logomark · Hero accents"},
                  {name:"Dark Gradient",css:"linear-gradient(135deg, #0A0A0F, #1A1A2E)",use:"Dark cards · Modal backgrounds"},
                  {name:"Glow — Electric",css:"radial-gradient(circle, rgba(0,229,160,0.15) 0%, transparent 70%)",use:"Background accents · Atmospheric only"},
                  {name:"Glow — Volt",css:"radial-gradient(circle, rgba(188,255,78,0.10) 0%, transparent 70%)",use:"Secondary atmosphere · Use sparingly"},
                ].map((g,i)=>(
                  <div key={i} style={{borderRadius:12,overflow:"hidden"}}>
                    <div style={{height:64,background:g.css,borderRadius:"12px 12px 0 0"}}></div>
                    <div style={{padding:"8px 10px",background:"rgba(255,255,255,0.05)",borderRadius:"0 0 12px 12px"}}>
                      <div style={{fontSize:"0.72rem",fontWeight:600,color:"#fff",marginBottom:2}}>{g.name}</div>
                      <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.4)",marginBottom:4}}>{g.use}</div>
                      <CopyTag value={g.css} label="Copy CSS"/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── TYPOGRAPHY ── */}
        {active==="Typography" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card>
              <SectionLabel>Typeface</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
                {[
                  {name:"Inter",role:"Primary · All UI",use:"Every screen, every size. Inter is the brand typeface. It is the most legible sans-serif at small sizes on Android — which is where most Klokd users live."},
                  {name:"Monospace",role:"Code · Tokens · Data",use:"Transaction codes, API references, token values. System monospace stack — do not specify a single monospace font."},
                ].map((f,i)=>(
                  <Card key={i} style={{background:T.mist}}>
                    <div style={{fontSize:"2rem",fontWeight:900,letterSpacing:"-0.04em",color:T.ink,marginBottom:4,fontFamily:i===1?"monospace":"inherit"}}>Aa</div>
                    <div style={{fontSize:"0.85rem",fontWeight:700,color:T.ink,marginBottom:2}}>{f.name}</div>
                    <Chip>{f.role}</Chip>
                    <div style={{fontSize:"0.72rem",color:T.mid,lineHeight:1.6,marginTop:8}}>{f.use}</div>
                  </Card>
                ))}
              </div>
              <SectionLabel>Type Scale</SectionLabel>
              <TypeSpecimen label="Display" size="2.8rem" weight={900} tracking="-0.04em" leading={1.0} sample="Klokd." />
              <TypeSpecimen label="H1 — Hero" size="2rem" weight={900} tracking="-0.03em" leading={1.05} sample="Show up. Get paid." />
              <TypeSpecimen label="H2 — Section" size="1.4rem" weight={800} tracking="-0.025em" leading={1.15} sample="Kenya's Casual Labour Marketplace" />
              <TypeSpecimen label="H3 — Card title" size="1rem" weight={700} tracking="-0.015em" leading={1.25} sample="Post a shift in under 2 minutes" />
              <TypeSpecimen label="Body — Default" size="0.9rem" weight={400} tracking="0em" leading={1.65} sample="Klokd connects verified casual workers with businesses that need them — instantly, reliably, and on mobile." />
              <TypeSpecimen label="Small — UI labels" size="0.78rem" weight={500} tracking="0em" leading={1.5} sample="94% show-up rate · 4.8 rating · 47 shifts" />
              <TypeSpecimen label="Label — Caps" size="0.6rem" weight={700} tracking="0.14em" leading={1.4} sample="SHIFT CONFIRMED · 5PM–10PM · WESTLANDS" />
              <TypeSpecimen label="Mono — Data" size="0.75rem" weight={600} tracking="0.02em" leading={1.4} sample="KES 1,800 · M-Pesa · 0722 ••• •••" mono />
            </Card>

            <Card>
              <SectionLabel>Weight System — Two weights only in UI</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"1rem"}}>
                {[
                  {w:400,name:"Regular",use:"Body copy, descriptions, secondary labels"},
                  {w:500,name:"Medium",use:"UI labels, metadata, supporting info"},
                  {w:700,name:"Bold",use:"Card titles, names, key data"},
                  {w:900,name:"Black",use:"Display text, headlines, numbers, logo"},
                ].map((wt,i)=>(
                  <div key={i} style={{padding:"1rem",background:T.mist,borderRadius:12,border:`1px solid ${T.soft}`}}>
                    <div style={{fontSize:"1.6rem",fontWeight:wt.w,color:T.ink,letterSpacing:"-0.02em",marginBottom:6}}>{wt.w}</div>
                    <div style={{fontSize:"0.78rem",fontWeight:wt.w,color:T.ink,marginBottom:4}}>{wt.name}</div>
                    <div style={{fontSize:"0.65rem",color:T.mid,lineHeight:1.5}}>{wt.use}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── TOKENS ── */}
        {active==="Tokens" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card>
              <SectionLabel>Border Radius</SectionLabel>
              {[
                {name:"--radius-sm",value:"8px",preview:<div style={{width:32,height:32,background:T.electric,borderRadius:8}}/>},
                {name:"--radius-md",value:"12px",preview:<div style={{width:40,height:40,background:T.electric,borderRadius:12}}/>},
                {name:"--radius-lg",value:"16px",preview:<div style={{width:48,height:48,background:T.electric,borderRadius:16}}/>},
                {name:"--radius-xl",value:"20px",preview:<div style={{width:56,height:56,background:T.electric,borderRadius:20}}/>},
                {name:"--radius-2xl",value:"28px",preview:<div style={{width:64,height:64,background:T.electric,borderRadius:28}}/>},
                {name:"--radius-pill",value:"999px",preview:<div style={{width:80,height:32,background:T.electric,borderRadius:999}}/>},
              ].map((t,i)=><TokenRow key={i} {...t}/>)}
            </Card>

            <Card>
              <SectionLabel>Spacing Scale</SectionLabel>
              {[
                {name:"--space-1",value:"4px",preview:<div style={{height:4,width:40,background:T.electric}}/>},
                {name:"--space-2",value:"8px",preview:<div style={{height:8,width:40,background:T.electric}}/>},
                {name:"--space-3",value:"12px",preview:<div style={{height:12,width:40,background:T.electric}}/>},
                {name:"--space-4",value:"16px",preview:<div style={{height:16,width:40,background:T.electric}}/>},
                {name:"--space-5",value:"24px",preview:<div style={{height:24,width:40,background:T.electric}}/>},
                {name:"--space-6",value:"32px",preview:<div style={{height:32,width:40,background:T.electric}}/>},
                {name:"--space-7",value:"48px",preview:<div style={{height:48,width:40,background:T.electric}}/>},
              ].map((t,i)=><TokenRow key={i} {...t}/>)}
            </Card>

            <Card>
              <SectionLabel>Component Tokens — Buttons</SectionLabel>
              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:"1.5rem"}}>
                <div style={{background:`linear-gradient(135deg,${T.electric},${T.volt})`,borderRadius:12,padding:"11px 24px",cursor:"pointer"}}>
                  <span style={{fontSize:"0.82rem",fontWeight:700,color:T.ink}}>Primary action</span>
                </div>
                <div style={{background:T.ink,borderRadius:12,padding:"11px 24px",border:`1px solid rgba(0,229,160,0.3)`,cursor:"pointer"}}>
                  <span style={{fontSize:"0.82rem",fontWeight:700,color:T.electric}}>Secondary action</span>
                </div>
                <div style={{background:"transparent",borderRadius:12,padding:"11px 24px",border:`1px solid ${T.soft}`,cursor:"pointer"}}>
                  <span style={{fontSize:"0.82rem",fontWeight:700,color:T.mid}}>Tertiary / Decline</span>
                </div>
                <div style={{background:T.soft,borderRadius:12,padding:"11px 24px",cursor:"not-allowed",opacity:0.5}}>
                  <span style={{fontSize:"0.82rem",fontWeight:700,color:T.mid}}>Disabled</span>
                </div>
              </div>
              <SectionLabel>Component Tokens — Status Chips</SectionLabel>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:"1.5rem"}}>
                {[
                  {l:"Confirmed",bg:"#00E5A015",c:"#00A870"},
                  {l:"Pending",bg:"#FFB34720",c:"#B37A00"},
                  {l:"In progress",bg:"#60A5FA20",c:"#1D6FA8"},
                  {l:"Declined",bg:"#FF6B6B15",c:"#CC3333"},
                  {l:"Paid",bg:"#00E5A015",c:"#00A870"},
                  {l:"New",bg:"#BCFF4E20",c:"#4A7A00"},
                ].map((ch,i)=>(
                  <span key={i} style={{padding:"4px 12px",borderRadius:999,background:ch.bg,color:ch.c,fontSize:"0.7rem",fontWeight:700}}>{ch.l}</span>
                ))}
              </div>
              <SectionLabel>Component Tokens — Cards</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1rem"}}>
                {[
                  {name:"Card — Light",bg:"#fff",border:T.soft,text:T.ink},
                  {name:"Card — Mist",bg:T.mist,border:T.soft,text:T.ink},
                  {name:"Card — Dark",bg:T.slate,border:"rgba(255,255,255,0.06)",text:"#fff"},
                  {name:"Card — Accent",bg:T.ink,border:`${T.electric}40`,text:"#fff"},
                ].map((c,i)=>(
                  <div key={i} style={{background:c.bg,borderRadius:16,padding:"1rem",border:`1px solid ${c.border}`}}>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:c.text,marginBottom:4}}>{c.name}</div>
                    <div style={{fontSize:"0.65rem",color:c.text,opacity:0.5}}>border: {c.border}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Elevation — no drop shadows</SectionLabel>
              <div style={{fontSize:"0.8rem",color:T.mid,lineHeight:1.7,marginBottom:"1rem"}}>
                Klokd uses <strong style={{color:T.ink}}>border and background contrast</strong> for elevation — never drop shadows. This keeps the UI clean on both dark and light backgrounds and performs better on low-end Android devices.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"1rem"}}>
                {[
                  {name:"Ground",bg:T.soft,border:"none",note:"Page background"},
                  {name:"Level 1",bg:T.mist,border:T.soft,note:"Surface cards"},
                  {name:"Level 2",bg:"#fff",border:T.soft,note:"Raised cards"},
                  {name:"Level 3",bg:T.ink,border:"rgba(255,255,255,0.06)",note:"Dark overlay"},
                ].map((e,i)=>(
                  <div key={i} style={{background:e.bg,borderRadius:12,padding:"0.9rem",border:e.border!=="none"?`1px solid ${e.border}`:"none"}}>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:i<2?T.ink:"#fff",marginBottom:3}}>{e.name}</div>
                    <div style={{fontSize:"0.62rem",color:i<2?T.mid:"rgba(255,255,255,0.4)"}}>{e.note}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── VOICE ── */}
        {active==="Voice" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card dark>
              <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.electric,marginBottom:12}}>Voice Principle</div>
              <div style={{fontSize:"1.2rem",fontWeight:800,color:"#fff",lineHeight:1.3,letterSpacing:"-0.02em",marginBottom:10}}>
                Klokd speaks like a trusted colleague — not a corporate system and not a casual friend.
              </div>
              <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>
                Every word in the product is either building trust or destroying it. Workers and employers make fast decisions based on what they read. Klokd's copy must be immediate, honest, and warm — in that order.
              </div>
            </Card>

            <Card>
              <SectionLabel>Writing Principles</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"}}>
                {[
                  {p:"Lead with the outcome",d:"Tell the user what happens, not what to do. 'KES 1,800 sent to M-Pesa' not 'Payment processed successfully'."},
                  {p:"Use active voice",d:"'Akinyi confirmed your shift' not 'Your shift has been confirmed by Akinyi'. Someone did something. Name them."},
                  {p:"Specific over vague",d:"'Clock in by 5:00 PM' not 'Please arrive on time'. Numbers and times are trust signals."},
                  {p:"No jargon",d:"This product serves a barista and a hospital manager. 'Shift' not 'engagement'. 'Pay' not 'remuneration'. 'Rate' not 'compensation structure'."},
                  {p:"Earn formality",d:"Notifications are casual. Contracts are formal. Error states are calm and specific. Match the register to the moment."},
                ].map((pr,i)=>(
                  <div key={i} style={{padding:"0.9rem",background:T.mist,borderRadius:12,border:`1px solid ${T.soft}`}}>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:T.ink,marginBottom:6}}>{pr.p}</div>
                    <div style={{fontSize:"0.7rem",color:T.mid,lineHeight:1.55}}>{pr.d}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Voice by Moment — Worker</SectionLabel>
              <div style={{display:"grid",gap:8}}>
                {[
                  {moment:"New shift notification",do:"Waiter shift · KES 1,800 · Westlands · Tonight 5–10pm. Tap to accept.",dont:"You have a new shift opportunity available in your area."},
                  {moment:"Shift confirmed",do:"You're klokd in. The Brew Bistro · Tonight 5pm. Contract signed and saved.",dont:"Your shift has been confirmed. Please review your contract."},
                  {moment:"Payment sent",do:"KES 1,800 sent to your M-Pesa. Great shift, Akinyi.",dont:"Payment has been successfully processed to your registered mobile number."},
                  {moment:"No shifts available",do:"No shifts near you right now. We'll notify you the moment something comes up.",dont:"There are currently no available shift opportunities matching your profile criteria."},
                ].map((v,i)=>(
                  <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${T.soft}`}}>
                    <div style={{padding:"6px 12px",background:T.mist,borderBottom:`1px solid ${T.soft}`}}>
                      <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.mid}}>{v.moment}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                      <div style={{padding:"10px 12px",borderRight:`1px solid ${T.soft}`}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:T.electric,marginBottom:5}}>✓ DO</div>
                        <div style={{fontSize:"0.75rem",color:T.ink,lineHeight:1.55}}>{v.do}</div>
                      </div>
                      <div style={{padding:"10px 12px"}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:T.error,marginBottom:5}}>✗ DON'T</div>
                        <div style={{fontSize:"0.75rem",color:T.mid,lineHeight:1.55}}>{v.dont}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Voice by Moment — Employer</SectionLabel>
              <div style={{display:"grid",gap:8}}>
                {[
                  {moment:"Worker confirmed",do:"Akinyi K. confirmed your shift. 4.8 ★ · 94% show-up rate. She'll clock in via GPS at 5pm.",dont:"A worker has accepted your shift request. Please await further confirmation."},
                  {moment:"Worker clocked in",do:"Akinyi is in. Clocked in 4:58 PM · 0.8 km from venue.",dont:"Worker has successfully clocked into the shift at the designated time."},
                  {moment:"Payment released",do:"KES 1,800 sent to Akinyi. Rate her shift to build your trusted roster.",dont:"Payment has been disbursed to the worker's registered mobile money account."},
                  {moment:"No workers available",do:"No verified waiters available tonight in Westlands. Try widening to 5 km or posting for tomorrow.",dont:"There are currently no workers matching your shift requirements in the selected parameters."},
                ].map((v,i)=>(
                  <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${T.soft}`}}>
                    <div style={{padding:"6px 12px",background:T.mist,borderBottom:`1px solid ${T.soft}`}}>
                      <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.mid}}>{v.moment}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                      <div style={{padding:"10px 12px",borderRight:`1px solid ${T.soft}`}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:T.electric,marginBottom:5}}>✓ DO</div>
                        <div style={{fontSize:"0.75rem",color:T.ink,lineHeight:1.55}}>{v.do}</div>
                      </div>
                      <div style={{padding:"10px 12px"}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,color:T.error,marginBottom:5}}>✗ DON'T</div>
                        <div style={{fontSize:"0.75rem",color:T.mid,lineHeight:1.55}}>{v.dont}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── MOTION ── */}
        {active==="Motion" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card dark>
              <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.electric,marginBottom:12}}>Motion Principle</div>
              <div style={{fontSize:"1.1rem",fontWeight:800,color:"#fff",lineHeight:1.4,marginBottom:10}}>Motion confirms. It does not decorate.</div>
              <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.55)",lineHeight:1.7}}>
                Every animation in Klokd communicates something — a state change, a transition, a confirmation. Motion that exists only to look good is not Klokd. The product is used under pressure (filling a shift fast, clocking in at the door). Animation must support speed, never slow it down.
              </div>
            </Card>

            <Card>
              <SectionLabel>Easing Curves</SectionLabel>
              <div style={{display:"grid",gap:"1rem"}}>
                {[
                  {name:"Ease Out — Default",css:"cubic-bezier(0.0, 0.0, 0.2, 1.0)",use:"Most transitions. Elements entering the screen. Feels natural and intentional.",dur:"200ms"},
                  {name:"Ease In — Exit",css:"cubic-bezier(0.4, 0.0, 1.0, 1.0)",use:"Elements leaving the screen. Dismissals. Faster than entry.",dur:"150ms"},
                  {name:"Spring — Confirmation",css:"cubic-bezier(0.34, 1.56, 0.64, 1.0)",use:"Payment confirmed. Shift accepted. Success states. The slight overshoot creates a celebratory feel.",dur:"400ms"},
                  {name:"Linear — Progress",css:"linear",use:"Progress bars. Loading states. Anything that represents measured, continuous movement.",dur:"Variable"},
                ].map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:16,alignItems:"flex-start",padding:"1rem",background:T.mist,borderRadius:12,border:`1px solid ${T.soft}`}}>
                    <div style={{width:48,height:48,borderRadius:12,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:`linear-gradient(135deg,${T.electric},${T.volt})`}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:4,marginBottom:4}}>
                        <div style={{fontSize:"0.78rem",fontWeight:700,color:T.ink}}>{e.name}</div>
                        <div style={{fontSize:"0.65rem",fontFamily:"monospace",color:T.electric}}>{e.dur}</div>
                      </div>
                      <div style={{fontSize:"0.65rem",fontFamily:"monospace",color:T.mid,marginBottom:4}}>{e.css}</div>
                      <div style={{fontSize:"0.7rem",color:T.mid,lineHeight:1.5}}>{e.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>Duration Scale</SectionLabel>
              {[
                {name:"--duration-fast",value:"100ms",use:"Hover states · Focus rings · Colour changes"},
                {name:"--duration-base",value:"200ms",use:"Most UI transitions · Tab switches · Card reveals"},
                {name:"--duration-slow",value:"350ms",use:"Page transitions · Modal entry · Sheet slides"},
                {name:"--duration-celebration",value:"500ms",use:"Payment confirmed · Shift booked · Rating submitted"},
              ].map((d,i)=>(
                <TokenRow key={i} name={d.name} value={d.value} preview={<span style={{fontSize:"0.65rem",color:T.mid,maxWidth:200,textAlign:"right"}}>{d.use}</span>}/>
              ))}
            </Card>

            <Card>
              <SectionLabel>What Never Animates</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"}}>
                {[
                  {rule:"Error states",reason:"Errors must be immediate. Animation on an error message delays comprehension and feels dismissive."},
                  {rule:"Critical data",reason:"Payment amounts, shift times, worker names. These must appear instantly — never fade or slide in."},
                  {rule:"Loading skeletons",reason:"Use neutral flat placeholders. Pulsing or shimmer animations are distracting and battery-expensive on low-end devices."},
                  {rule:"Decorative loops",reason:"No idle animations, no looping illustrations, no background motion. Klokd is used by people in motion — the screen must be calm."},
                ].map((n,i)=>(
                  <div key={i} style={{padding:"0.9rem",background:T.mist,borderRadius:12,border:`1px solid ${T.soft}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span>
                      </div>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color:T.ink}}>{n.rule}</div>
                    </div>
                    <div style={{fontSize:"0.7rem",color:T.mid,lineHeight:1.55}}>{n.reason}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── DO & DON'T ── */}
        {active==="Do & Don't" && (
          <div style={{display:"grid",gap:"1.5rem"}}>
            <Card dark>
              <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.electric,marginBottom:12}}>The Standard</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#fff",lineHeight:1.5}}>Every design decision must serve the core loop. If a visual element, word, or animation does not make the shift faster, the payment more trusted, or the relationship stronger — remove it.</div>
            </Card>

            {[
              {
                category:"Logo",
                items:[
                  {do:true,label:"Use the gradient logomark on ink backgrounds",preview:<div style={{padding:16,background:T.ink,borderRadius:10,display:"flex",justifyContent:"center"}}><LogoMark size={40}/></div>},
                  {do:true,label:"Use the full lockup with adequate clear space",preview:<div style={{padding:16,background:T.mist,borderRadius:10,display:"flex",justifyContent:"center",border:`1px solid ${T.soft}`}}><Logo size={36}/></div>},
                  {do:false,label:"Place the logo on a photo or patterned background",preview:<div style={{padding:16,background:"repeating-linear-gradient(45deg,#bbb,#bbb 2px,#ddd 2px,#ddd 10px)",borderRadius:10,display:"flex",justifyContent:"center",position:"relative"}}><Logo size={36}/><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                  {do:false,label:"Recolour the logomark or wordmark",preview:<div style={{padding:16,background:T.mist,borderRadius:10,display:"flex",justifyContent:"center",position:"relative",border:`1px solid ${T.soft}`}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:36,height:36,background:"#FF6B6B",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontWeight:900,fontSize:"1rem"}}>K</span></div><span style={{fontWeight:900,fontSize:"1rem",color:"#FF6B6B",letterSpacing:"-0.04em"}}>klokd</span></div><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                ]
              },
              {
                category:"Colour",
                items:[
                  {do:true,label:"Use Electric Mint for primary CTAs on dark backgrounds",preview:<div style={{padding:12,background:T.ink,borderRadius:10}}><div style={{background:`linear-gradient(135deg,${T.electric},${T.volt})`,borderRadius:10,padding:"10px 20px",textAlign:"center"}}><span style={{fontSize:"0.82rem",fontWeight:700,color:T.ink}}>Accept shift</span></div></div>},
                  {do:true,label:"Use Ink on Mist for employer light screens",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`}}><div style={{fontSize:"0.82rem",fontWeight:700,color:T.ink}}>Post a shift</div><div style={{fontSize:"0.7rem",color:T.mid,marginTop:2}}>Under 2 minutes</div></div>},
                  {do:false,label:"Use white text on Electric Mint — fails accessibility",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`,position:"relative"}}><div style={{background:T.electric,borderRadius:10,padding:"10px 20px",textAlign:"center"}}><span style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>Accept shift</span></div><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                  {do:false,label:"Use colour as pure decoration — every colour must mean something",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`,position:"relative"}}><div style={{display:"flex",gap:4}}>{[T.electric,T.error,T.info,T.warning,T.volt].map((c,i)=><div key={i} style={{width:20,height:20,borderRadius:"50%",background:c}}/>)}</div><div style={{fontSize:"0.7rem",color:T.mid,marginTop:8}}>Random colour decoration</div><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                ]
              },
              {
                category:"Typography",
                items:[
                  {do:true,label:"Use Black weight (900) for numbers and headlines",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`}}><div style={{fontSize:"1.6rem",fontWeight:900,color:T.electric,letterSpacing:"-0.03em"}}>KES 1,800</div><div style={{fontSize:"0.7rem",color:T.mid}}>M-Pesa · Sent</div></div>},
                  {do:true,label:"Use Label style (uppercase, tracked) for metadata only",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`}}><div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:T.mid,marginBottom:4}}>Shift confirmed</div><div style={{fontSize:"0.85rem",fontWeight:700,color:T.ink}}>Waiter · Westlands · Tonight 5pm</div></div>},
                  {do:false,label:"Use more than two weights in a single UI component",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`,position:"relative"}}><div style={{fontSize:"0.85rem",fontWeight:400,color:T.ink}}>Regular</div><div style={{fontSize:"0.85rem",fontWeight:500,color:T.ink}}>Medium</div><div style={{fontSize:"0.85rem",fontWeight:700,color:T.ink}}>Bold</div><div style={{fontSize:"0.85rem",fontWeight:900,color:T.ink}}>Black</div><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                  {do:false,label:"Use Label style for body copy — caps are for metadata",preview:<div style={{padding:12,background:T.mist,borderRadius:10,border:`1px solid ${T.soft}`,position:"relative"}}><div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:T.mid}}>KLOKD CONNECTS VERIFIED CASUAL WORKERS WITH BUSINESSES THAT NEED THEM.</div><div style={{position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",background:T.error,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:"0.55rem",fontWeight:700}}>✗</span></div></div>},
                ]
              },
            ].map((section,si)=>(
              <Card key={si}>
                <SectionLabel>{section.category}</SectionLabel>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1rem"}}>
                  {section.items.map((item,i)=>(
                    <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${item.do?T.electric+"30":T.error+"30"}`}}>
                      {item.preview}
                      <div style={{padding:"8px 10px",background:item.do?"#00E5A008":"#FF6B6B08"}}>
                        <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                          <span style={{color:item.do?T.electric:T.error,fontWeight:700,fontSize:"0.7rem",flexShrink:0}}>{item.do?"✓":"✗"}</span>
                          <div style={{fontSize:"0.68rem",color:T.mid,lineHeight:1.5}}>{item.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{background:T.ink,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginTop:16}}>
        <Logo size={24} light/>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {["klokd.co.ke","@klokKE","Brand Guide v1.0","Confidential · 2026"].map((t,i)=>(
            <span key={i} style={{fontSize:"0.58rem",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)"}}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
