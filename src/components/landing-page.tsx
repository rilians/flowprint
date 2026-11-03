import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, Clock3, GitBranch, Lightbulb, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const steps = [
  ["01", "Map", "Gambarkan alur kerja aktual dalam visual workflow yang mudah dipahami."],
  ["02", "Analyze", "Hitung effort, waktu tunggu, volume, dan biaya dari data proses Anda."],
  ["03", "Discover", "Temukan peluang improvement dengan alasan dan faktor yang transparan."],
  ["04", "Optimize", "Rancang skenario To-Be tanpa menyentuh baseline proses."],
  ["05", "Measure", "Bandingkan dampak operasional dan business case sebelum implementasi."],
];
const features = [
  { icon: Workflow, title: "Visual process intelligence", body: "Setiap aktivitas membawa konteks: durasi, mode kerja, peran, sistem, dan kesiapan integrasi." },
  { icon: Lightbulb, title: "Opportunity scoring yang transparan", body: "Skor prioritas heuristik 0–100 menunjukkan faktor yang mendorong peluang—bukan janji hasil automasi." },
  { icon: BarChart3, title: "Before vs after simulator", body: "Uji asumsi biaya, adopsi, waktu, dan effort untuk melihat estimasi dampak pada proses target." },
];

export function LandingPage() {
  return <main className="landing">
    <nav className="landing-nav">
      <Link href="/" className="brand"><span className="brand-mark">F</span><span>FLOWPRINT<span className="brand-sub">PROCESS INTELLIGENCE</span></span></Link>
      <div className="landing-links"><a href="#how">Cara kerja</a><a href="#capabilities">Kemampuan</a><Link href="/app" className="button primary small">Buka live demo <ArrowUpRight size={13}/></Link></div>
    </nav>
    <section className="landing-hero">
      <div className="hero-copy">
        <div className="hero-badge"><Sparkles size={12}/> BUSINESS PROCESS INTELLIGENCE</div>
        <h1>Turn operational complexity into <em>intelligent workflows.</em></h1>
        <p>Petakan proses kerja, temukan inefisiensi tersembunyi, dan rancang peluang perbaikan yang bisa diukur—sebelum perubahan diterapkan.</p>
        <div className="hero-actions"><Link href="/app" className="button primary">Explore live demo <ArrowRight size={14}/></Link><a href="#how" className="button">Lihat cara kerja <ArrowDown size={13}/></a></div>
        <div className="hero-note"><ShieldCheck size={13}/> Demo lokal, data ilustratif, tanpa perlu login.</div>
      </div>
      <div className="hero-visual" aria-label="Preview dashboard FLOWPRINT">
        <div className="hero-orb"/>
        <div className="preview-window">
          <div className="preview-top"><div className="preview-lights"><i/><i/><i/></div><b>FLOWPRINT / Process intelligence</b><span className="pill purple">Live demo</span></div>
          <div className="preview-content">
            <div className="preview-sidebar"><span>◈ Overview</span><span>◉ Process Studio</span><span>▤ Intelligence</span><span>✧ Opportunities</span><span>◫ Scenarios</span></div>
            <div className="preview-main">
              <div className="preview-main-head"><b>Reimbursement karyawan</b><span className="pill green">Analyzed</span></div>
              <div className="preview-stat-row"><div className="preview-mini"><small>Human effort / run</small><b>60 mnt</b></div><div className="preview-mini"><small>Waktu tunggu</small><b>8 jam</b></div><div className="preview-mini"><small>Volume / bulan</small><b>180</b></div></div>
              <div className="preview-flow">
                <div className="preview-node"><i>↗</i><b>Formulir</b><small>10 menit · manual</small></div>
                <div className="preview-node"><i>◷</i><b>Verifikasi</b><small>20 menit · manual</small></div>
                <div className="preview-node"><i>✓</i><b>Persetujuan</b><small>8 jam · tunggu</small></div>
                <div className="preview-node"><i>⌁</i><b>Pembayaran</b><small>25 menit</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="preview-float"><b>Potential improvement</b><strong>+ 101 jam</strong><span>Estimasi hemat / bulan*</span><div className="progress"><span style={{ width:"72%" }}/></div></div>
      </div>
    </section>
    <section id="how" className="landing-section soft">
      <div className="landing-section-inner"><div className="eyebrow">One connected journey</div><h2>From process map to measurable change.</h2><p className="section-lead">Bukan sekadar diagram. FLOWPRINT menghubungkan gambaran proses saat ini dengan insight operasional dan rancangan masa depan.</p>
        <div className="steps-grid">{steps.map(([num, title, text]) => <article className="step-card" key={num}><span className="step-num">{num} / FLOW</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>
    <section id="capabilities" className="landing-section">
      <div className="eyebrow">Built for process improvement</div><h2>Make the work visible.</h2><p className="section-lead">Dari handoff yang sulit dilihat sampai estimasi finansial yang bisa dibahas bersama process owner.</p>
      <div className="feature-grid">{features.map(({ icon: Icon, title, body }) => <article className="feature-card" key={title}><Icon size={18}/><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="two-col" style={{ marginTop:16 }}>
        <div className="card" style={{ padding:20, background:"#f7f6ff", borderColor:"#e6e3ff" }}><div className="eyebrow">See the work</div><h3 style={{ margin:"6px 0", fontSize:16 }}>Workflow canvas yang kontekstual.</h3><p className="muted tiny" style={{ lineHeight:1.7 }}>Tambahkan aktivitas, hubungkan alurnya, lalu inspeksi effort dan karakteristik tiap langkah. Baseline tetap aman saat Anda membuat skenario.</p><Link href="/app/processes/employee-reimbursement/studio" className="button small" style={{ marginTop:7 }}>Jelajahi Process Studio <ArrowRight size={12}/></Link></div>
        <div className="card" style={{ padding:20 }}><div className="eyebrow">Design what’s next</div><h3 style={{ margin:"6px 0", fontSize:16 }}>Uji ide sebelum implementasi.</h3><p className="muted tiny" style={{ lineHeight:1.7 }}>Bandingkan baseline dengan rancangan To-Be, sesuaikan tingkat adopsi dan biaya implementasi, lalu siapkan business case.</p><Link href="/app/processes/employee-reimbursement/scenarios" className="button small" style={{ marginTop:7 }}>Lihat simulator <ArrowRight size={12}/></Link></div>
      </div>
    </section>
    <section className="landing-section soft"><div className="landing-section-inner" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:25, flexWrap:"wrap" }}><div><div className="eyebrow">Start with a live demo</div><h2>See the work. Find the waste.</h2><p className="section-lead" style={{ marginBottom:0 }}>Jelajahi tiga contoh proses dan buat rancangan perbaikan Anda sendiri.</p></div><Link href="/app" className="button primary">Buka workspace <ArrowRight size={14}/></Link></div></section>
    <footer className="landing-footer">FLOWPRINT · See the Work. Find the Waste. Design What's Next. · Demo data is illustrative.</footer>
  </main>;
}
