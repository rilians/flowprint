"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cloud, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export function AuthView(){
  const router=useRouter();
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const configured=hasSupabaseConfig();
  useEffect(()=>{
    const client=getSupabaseBrowserClient();
    if(!client) return;
    void client.auth.getSession().then(({data})=>{if(data.session) router.replace("/app");});
  },[router]);

  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const client=getSupabaseBrowserClient();
    if(!client){toast.error("Supabase belum dikonfigurasi untuk aplikasi ini.");return;}
    setBusy(true);
    try{
      if(mode==="signin"){
        const {error}=await client.auth.signInWithPassword({email:email.trim(),password});
        if(error) throw error;
        toast.success("Berhasil masuk. Menyiapkan cloud workspace…");
        router.replace("/app");
      }else{
        const {data,error}=await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:`${window.location.origin}/app`}});
        if(error) throw error;
        if(data.session){toast.success("Akun dibuat dan Anda sudah masuk.");router.replace("/app");}
        else toast.info("Akun dibuat. Periksa email untuk konfirmasi sebelum masuk.");
      }
    }catch(error){toast.error(error instanceof Error?error.message:"Autentikasi gagal. Periksa email dan password.");}
    finally{setBusy(false);}
  };

  return <main className="landing" style={{minHeight:"100vh",display:"grid",gridTemplateRows:"72px 1fr auto"}}>
    <nav className="landing-nav" style={{width:"100%",maxWidth:1200}}><Link href="/" className="brand"><span className="brand-mark">F</span><span>FLOWPRINT<span className="brand-sub">PROCESS INTELLIGENCE</span></span></Link><Link href="/app" className="button small"><ArrowLeft size={12}/> Kembali ke demo</Link></nav>
    <div style={{display:"grid",placeItems:"center",padding:"28px 16px 50px"}}><div style={{display:"grid",gridTemplateColumns:"minmax(260px,380px) minmax(290px,380px)",width:"min(100%,760px)",border:"1px solid var(--border)",borderRadius:18,background:"#fff",boxShadow:"0 22px 70px rgba(31,36,70,.10)",overflow:"hidden"}} className="auth-grid">
      <section style={{padding:"35px 28px",background:"#f7f6ff",borderRight:"1px solid var(--border)"}}><span className="pill purple"><Cloud size={11}/> Cloud workspace</span><h1 style={{fontSize:27,letterSpacing:"-.055em",lineHeight:1.1,margin:"21px 0 10px"}}>{mode==="signin"?"Continue your process journey.":"Create a Flowprint workspace."}</h1><p className="tiny muted" style={{lineHeight:1.8}}>Masuk untuk menyimpan proses dan skenario Anda ke Supabase. Demo tanpa login tetap tersedia dan tersimpan lokal.</p><div style={{display:"grid",gap:11,marginTop:24}}>{[[ShieldCheck,"RLS menjaga data tetap milik akun Anda."],[Cloud,"Sinkron antar sesi saat akun masuk."],[LockKeyhole,"Browser hanya memakai publishable key; tidak ada service key di client."]].map(([Icon,text])=>{const I=Icon as typeof ShieldCheck;return <div key={String(text)} style={{display:"flex",gap:9,alignItems:"flex-start",fontSize:9,color:"#697084",lineHeight:1.5}}><I size={14} color="#665cf0" style={{flex:"0 0 auto"}}/>{text as string}</div>;})}</div>
      </section>
      <section style={{padding:"34px 27px"}}><div className="eyebrow">{mode==="signin"?"Welcome back":"Get started"}</div><h2 style={{fontSize:19,letterSpacing:"-.04em",margin:"4px 0 6px"}}>{mode==="signin"?"Sign in":"Create account"}</h2><p className="tiny muted" style={{margin:"0 0 20px"}}>{mode==="signin"?"Gunakan email akun Supabase Anda.":"Email dan password akan dikelola oleh Supabase Auth."}</p>
        {!configured&&<div className="warning-banner" style={{marginBottom:14}}>Supabase URL/key belum ada. Isi <code>.env.local</code> atau lanjutkan dalam Demo Mode.</div>}
        <form onSubmit={submit}>
          <div className="form-field"><label htmlFor="auth-email">Email</label><div style={{position:"relative"}}><Mail size={14} style={{position:"absolute",left:10,top:10,color:"#969bad"}}/><input id="auth-email" type="email" className="input" style={{paddingLeft:32}} autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com"/></div></div>
          <div className="form-field"><label htmlFor="auth-password">Password</label><div style={{position:"relative"}}><LockKeyhole size={14} style={{position:"absolute",left:10,top:10,color:"#969bad"}}/><input id="auth-password" type={showPassword?"text":"password"} className="input" style={{paddingLeft:32,paddingRight:37}} autoComplete={mode==="signin"?"current-password":"new-password"} minLength={6} required value={password} onChange={(e)=>setPassword(e.target.value)}/><button type="button" className="icon-button" aria-label={showPassword?"Sembunyikan password":"Tampilkan password"} onClick={()=>setShowPassword(!showPassword)} style={{position:"absolute",right:3,top:2,width:29,height:29}}>{showPassword?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>{mode==="signup"&&<small className="muted" style={{fontSize:8}}>Minimal 6 karakter, mengikuti konfigurasi project.</small>}</div>
          <button className="button primary" style={{width:"100%",marginTop:6}} type="submit" disabled={busy||!configured}>{busy?"Memproses…":mode==="signin"?"Sign in":"Buat akun"}</button>
        </form>
        <div style={{borderTop:"1px solid #f0f1f5",marginTop:16,paddingTop:14,textAlign:"center",fontSize:9,color:"#777e90"}}>{mode==="signin"?"Belum punya akun?":"Sudah punya akun?"} <button onClick={()=>setMode(mode==="signin"?"signup":"signin")} style={{border:0,background:"transparent",color:"var(--primary)",fontWeight:700}}>{mode==="signin"?"Buat akun":"Sign in"}</button></div>
        <p className="tiny muted" style={{lineHeight:1.6,margin:"14px 0 0"}}>Jika konfirmasi email aktif, redirect mengikuti URL yang diizinkan di Supabase Auth.</p>
      </section>
    </div></div>
    <footer className="landing-footer">FLOWPRINT · Demo Mode tersedia tanpa login</footer>
    <style jsx>{`@media (max-width:680px){.auth-grid{grid-template-columns:1fr!important}.auth-grid>section:first-child{border-right:0!important;border-bottom:1px solid var(--border)}}`}</style>
  </main>;
}
