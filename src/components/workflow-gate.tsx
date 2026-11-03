import Link from "next/link";
import { AlertTriangle, ArrowRight, Workflow } from "lucide-react";

export function WorkflowGate({ processId, issues }: { processId:string; issues:string[] }) {
  return <section className="card card-body" style={{borderColor:"#f0debb",background:"#fffdf8"}}>
    <div style={{display:"flex",gap:11,alignItems:"flex-start"}}><span className="insight-symbol"><AlertTriangle size={15}/></span><div style={{flex:1}}><h2 style={{fontSize:14,margin:"2px 0 6px"}}>Analisis dijeda — workflow belum valid</h2><p className="tiny muted" style={{lineHeight:1.65,margin:"0 0 10px"}}>Perbaiki struktur alur sebelum melihat metrik atau opportunity agar hasil tidak menyesatkan.</p><ul style={{margin:"0 0 14px",paddingLeft:17,color:"#88611f",fontSize:9,lineHeight:1.8}}>{issues.map((issue,index)=><li key={`${issue}-${index}`}>{issue}</li>)}</ul><Link className="button primary small" href={`/app/processes/${processId}/studio`}><Workflow size={12}/> Perbaiki di Process Studio <ArrowRight size={11}/></Link></div></div>
  </section>;
}
