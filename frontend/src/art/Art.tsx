/** Hand-built SVG art: no image assets, so nothing to 404 and nothing to license. */

export function HeroScale() {
  const gold = "#c4a574", cream = "#f3f0e8";
  return (
    <svg viewBox="0 0 520 540" role="img" aria-label="A balance scale weighing a claim against evidence" style={{ width: "100%", maxWidth: 560 }}>
      <defs>
        <radialGradient id="hs-glow" cx="50%" cy="38%" r="55%">
          <stop offset="0" stopColor={gold} stopOpacity=".28" />
          <stop offset="1" stopColor={gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-gold" x1="0" x2="1">
          <stop offset="0" stopColor="#e6cfa3" /><stop offset="1" stopColor="#a8844f" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="220" r="250" fill="url(#hs-glow)" />
      {[0, 1, 2].map((i) => (
        <circle key={i} className="pulse" cx="260" cy="140" r="26" fill="none" stroke={gold} strokeWidth="1.2" style={{ animationDelay: `${i * 0.8}s` }} />
      ))}
      {/* pillar + base */}
      <rect x="252" y="140" width="16" height="320" rx="8" fill="url(#hs-gold)" />
      <path d="M170 470 Q260 440 350 470 L370 500 H150 Z" fill="url(#hs-gold)" opacity=".95" />
      <circle cx="260" cy="140" r="16" fill={cream} stroke={gold} strokeWidth="3" />
      {/* beam + pans */}
      <g className="beam" style={{ transformOrigin: "260px 140px" }}>
        <rect x="80" y="134" width="360" height="12" rx="6" fill="url(#hs-gold)" />
        {[96, 424].map((x) => (
          <g key={x}>
            <line x1={x} y1="140" x2={x - 56} y2="300" stroke={gold} strokeWidth="1.5" />
            <line x1={x} y1="140" x2={x + 56} y2="300" stroke={gold} strokeWidth="1.5" />
            <path d={`M${x - 66} 300 H${x + 66} Q${x + 60} 340 ${x} 342 Q${x - 60} 340 ${x - 66} 300 Z`} fill="#161616" stroke={gold} strokeWidth="2" />
          </g>
        ))}
        {/* left pan: the claim */}
        <g transform="translate(40 232)">
          <rect x="0" y="0" width="112" height="58" rx="10" fill={cream} />
          <text x="12" y="23" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.5" fill="#6b6560">CLAIM · VDT-000042</text>
          <text x="12" y="44" fontFamily="Playfair Display, serif" fontSize="15" fill="#0b0b0b">“It shipped on 3 Mar”</text>
        </g>
        {/* right pan: the evidence */}
        <g transform="translate(368 232)">
          <rect x="0" y="0" width="112" height="58" rx="10" fill="#161616" stroke={gold} />
          <text x="12" y="23" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.5" fill={gold}>SOURCE · 200 OK</text>
          <text x="12" y="44" fontFamily="Playfair Display, serif" fontSize="15" fill={cream}>fetched by each node</text>
        </g>
      </g>
      {/* verdict plaque */}
      <g className="float">
        <rect x="170" y="36" width="180" height="46" rx="23" fill="#161616" stroke={gold} />
        <circle cx="198" cy="59" r="7" fill="#3fb37b" />
        <text x="214" y="55" fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1.4" fill={gold}>VERDICT</text>
        <text x="214" y="72" fontFamily="JetBrains Mono, monospace" fontSize="12" fill={cream}>TRUE · 92%</text>
      </g>
    </svg>
  );
}

/** Five validators each fetch the evidence themselves, then compare verdicts. */
export function ValidatorNet() {
  const gold = "#c4a574";
  const cx = 260, cy = 190, R = 130;
  const nodes = Array.from({ length: 5 }, (_, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), n: i + 1 };
  });
  return (
    <svg viewBox="0 0 520 380" role="img" aria-label="Five validators independently fetch evidence and compare verdicts" style={{ width: "100%", maxWidth: 520 }}>
      {nodes.map((n, i) => (
        <g key={n.n}>
          <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={gold} strokeOpacity=".4" strokeDasharray="3 5" />
          <line x1={n.x} y1={n.y} x2={nodes[(i + 1) % 5].x} y2={nodes[(i + 1) % 5].y} stroke={gold} strokeOpacity=".18" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r="44" fill="#161616" stroke={gold} />
      {[0, 1].map((i) => <circle key={i} className="pulse" cx={cx} cy={cy} r="44" fill="none" stroke={gold} style={{ animationDelay: `${i * 1.2}s` }} />)}
      <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="18" fill="#f3f0e8">equivalent?</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1.4" fill={gold}>OUTCOME + ±20</text>
      {nodes.map((n) => (
        <g key={n.n}>
          <circle cx={n.x} cy={n.y} r="26" fill="#0b0b0b" stroke={gold} />
          <text x={n.x} y={n.y - 2} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8.5" letterSpacing="1" fill={gold}>NODE</text>
          <text x={n.x} y={n.y + 13} textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="17" fill="#f3f0e8">{n.n}</text>
        </g>
      ))}
      <text x={cx} y="372" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" letterSpacing="1.6" fill="#f3f0e8" fillOpacity=".55">EACH NODE FETCHES THE EVIDENCE ITSELF</text>
    </svg>
  );
}
