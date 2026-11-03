import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { BusinessProcess, Scenario, WorkflowGraph } from "@/lib/types";

export type CloudWorkspaceData = {
  workspaceId: string;
  processes: BusinessProcess[];
  scenarios: Scenario[];
  loadedRemote: boolean;
};

type DbRow = Record<string, unknown>;
function throwIfError(error: { message?: string } | null, action: string): asserts error is null {
  if (error) throw new Error(`${action}: ${error.message || "Supabase request failed."}`);
}
function graphFrom(value: unknown): WorkflowGraph {
  if (value && typeof value === "object" && "nodes" in value && "edges" in value) {
    const graph = value as Partial<WorkflowGraph>;
    if (Array.isArray(graph.nodes) && Array.isArray(graph.edges)) return { nodes:graph.nodes, edges:graph.edges, schemaVersion:graph.schemaVersion || 1 };
  }
  return { nodes:[], edges:[], schemaVersion:1 };
}

async function ensureWorkspace(client: SupabaseClient, user: User) {
  const query = await client.from("flowprint_workspaces").select("id,name").eq("owner_id",user.id).maybeSingle();
  throwIfError(query.error,"Load workspace");
  if (query.data) return query.data as {id:string;name:string};
  const created = await client.from("flowprint_workspaces").insert({ owner_id:user.id, name:"Northstar workspace" }).select("id,name").single();
  if (created.error?.code === "23505") {
    const retry = await client.from("flowprint_workspaces").select("id,name").eq("owner_id",user.id).maybeSingle();
    throwIfError(retry.error,"Reload workspace");
    if (retry.data) return retry.data as {id:string;name:string};
  }
  throwIfError(created.error,"Create workspace");
  return created.data as {id:string;name:string};
}

function mapProcess(row:DbRow):BusinessProcess {
  return {
    id:String(row.client_id),
    name:String(row.name),
    description:String(row.description || ""),
    department:String(row.department || ""),
    monthlyVolume:Number(row.monthly_volume || 0),
    currency:String(row.currency || "IDR"),
    hourlyLaborCost:Number(row.hourly_labor_cost || 0),
    graph:graphFrom(row.graph_json),
    createdAt:String(row.created_at || new Date().toISOString()),
    updatedAt:String(row.updated_at || new Date().toISOString()),
    analysisStatus:row.analysis_status === "analyzed" ? "analyzed" : "draft",
  };
}

export async function loadOrSeedWorkspace(client:SupabaseClient,user:User,localProcesses:BusinessProcess[],localScenarios:Scenario[]):Promise<CloudWorkspaceData> {
  const workspace=await ensureWorkspace(client,user);
  const processResult=await client.from("flowprint_processes").select("*").eq("workspace_id",workspace.id).order("created_at",{ascending:true});
  throwIfError(processResult.error,"Load processes");
  const processRows=(processResult.data||[]) as DbRow[];
  if(processRows.length===0) {
    await syncWorkspace(client,workspace.id,localProcesses,localScenarios);
    return {workspaceId:workspace.id,processes:localProcesses,scenarios:localScenarios,loadedRemote:false};
  }
  const processes=processRows.map(mapProcess);
  const processByDbId=new Map(processRows.map((row)=>[String(row.id),mapProcess(row)]));
  const dbProcessIds=processRows.map((row)=>String(row.id));
  let scenarios:Scenario[]=[];
  if(dbProcessIds.length) {
    const scenarioResult=await client.from("flowprint_scenarios").select("*").in("process_id",dbProcessIds).order("created_at",{ascending:false});
    throwIfError(scenarioResult.error,"Load scenarios");
    scenarios=((scenarioResult.data||[]) as DbRow[]).flatMap((row)=>{
      const parent=processByDbId.get(String(row.process_id));
      if(!parent) return [];
      return [{
        id:String(row.client_id),processId:parent.id,name:String(row.name),description:String(row.description||""),graph:graphFrom(row.graph_json),
        adoptionRate:Number(row.adoption_rate ?? 0.8),implementationCost:Number(row.implementation_cost ?? 0),createdAt:String(row.created_at||new Date().toISOString()),updatedAt:String(row.updated_at||new Date().toISOString()),
      }];
    });
  }
  return {workspaceId:workspace.id,processes,scenarios,loadedRemote:true};
}

export async function syncWorkspace(client:SupabaseClient,workspaceId:string,processes:BusinessProcess[],scenarios:Scenario[]) {
  const previousResult=await client.from("flowprint_processes").select("id,client_id").eq("workspace_id",workspaceId);
  throwIfError(previousResult.error,"Read existing processes");
  const previous=(previousResult.data||[]) as {id:string;client_id:string}[];
  const payload=processes.map((process)=>({
    workspace_id:workspaceId,client_id:process.id,name:process.name,description:process.description,department:process.department,
    monthly_volume:Math.max(0,Math.round(process.monthlyVolume)),currency:process.currency,hourly_labor_cost:Math.max(0,process.hourlyLaborCost),
    graph_json:process.graph,graph_schema_version:process.graph.schemaVersion||1,analysis_status:process.analysisStatus,created_at:process.createdAt,
  }));
  if(payload.length) {
    const upserted=await client.from("flowprint_processes").upsert(payload,{onConflict:"workspace_id,client_id"}).select("id,client_id");
    throwIfError(upserted.error,"Save processes");
  }
  const currentResult=await client.from("flowprint_processes").select("id,client_id").eq("workspace_id",workspaceId);
  throwIfError(currentResult.error,"Map saved processes");
  const current=(currentResult.data||[]) as {id:string;client_id:string}[];
  const dbIdByClientId=new Map(current.map((row)=>[row.client_id,row.id]));
  const localScenarioKey=new Set(scenarios.map((scenario)=>`${scenario.processId}\u0000${scenario.id}`));
  const allDbProcessIds=[...new Set([...previous.map((row)=>row.id),...current.map((row)=>row.id)])];
  if(allDbProcessIds.length) {
    const existingScenarioResult=await client.from("flowprint_scenarios").select("id,process_id,client_id").in("process_id",allDbProcessIds);
    throwIfError(existingScenarioResult.error,"Read existing scenarios");
    const previousProcessClientId=new Map([...previous,...current].map((row)=>[row.id,row.client_id]));
    const existingScenarios=(existingScenarioResult.data||[]) as {id:string;process_id:string;client_id:string}[];
    const staleScenarios=existingScenarios.filter((row)=>{
      const processClientId=previousProcessClientId.get(row.process_id);
      return !processClientId || !localScenarioKey.has(`${processClientId}\u0000${row.client_id}`);
    });
    for(const stale of staleScenarios) {
      const deletion=await client.from("flowprint_scenarios").delete().eq("id",stale.id);
      throwIfError(deletion.error,"Delete removed scenario");
    }
  }
  const scenarioPayload=scenarios.flatMap((scenario)=>{
    const processDbId=dbIdByClientId.get(scenario.processId);
    return processDbId?[{
      process_id:processDbId,client_id:scenario.id,name:scenario.name,description:scenario.description,graph_json:scenario.graph,
      adoption_rate:Math.max(0,Math.min(1,scenario.adoptionRate)),implementation_cost:Math.max(0,scenario.implementationCost),created_at:scenario.createdAt,
    }]:[];
  });
  if(scenarioPayload.length) {
    const upserted=await client.from("flowprint_scenarios").upsert(scenarioPayload,{onConflict:"process_id,client_id"});
    throwIfError(upserted.error,"Save scenarios");
  }
  const localProcessIds=new Set(processes.map((process)=>process.id));
  for(const stale of previous.filter((row)=>!localProcessIds.has(row.client_id))) {
    const deletion=await client.from("flowprint_processes").delete().eq("id",stale.id);
    throwIfError(deletion.error,"Delete removed process");
  }
}
