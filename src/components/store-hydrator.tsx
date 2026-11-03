"use client";
import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadOrSeedWorkspace, syncWorkspace } from "@/lib/supabase/repository";
import { useFlowprintStore } from "@/stores/flowprint-store";

function errorMessage(error:unknown) { return error instanceof Error ? error.message : "Cloud sync failed."; }

export function StoreHydrator() {
  const markHydrated = useFlowprintStore((state) => state.markHydrated);
  useEffect(() => {
    let alive=true;
    let cloudReady=false;
    let workspaceId:string|null=null;
    let applyingCloudData=false;
    let timer:ReturnType<typeof setTimeout>|null=null;
    let authSubscription:{unsubscribe:()=>void}|null=null;
    const client=getSupabaseBrowserClient();
    const store=useFlowprintStore;

    const loadSession=async(session:Session|null)=>{
      cloudReady=false;
      workspaceId=null;
      if(!session?.user){
        if(alive) store.getState().setSyncStatus("demo",null);
        return;
      }
      store.getState().setSyncStatus("connecting",session.user.email||null);
      const snapshot=store.getState();
      try{
        if(!client) throw new Error("Supabase project settings are missing.");
        const result=await loadOrSeedWorkspace(client,session.user,snapshot.processes,snapshot.scenarios);
        if(!alive) return;
        if(result.loadedRemote){
          try{window.localStorage.setItem("flowprint-local-backup-v1",JSON.stringify({backedUpAt:new Date().toISOString(),processes:snapshot.processes,scenarios:snapshot.scenarios}));}catch{/* Browser storage may be full; cloud data remains intact. */}
        }
        applyingCloudData=true;
        workspaceId=result.workspaceId;
        store.getState().replaceCloudData(result.processes,result.scenarios);
        store.getState().setSyncStatus("synced",session.user.email||null);
        queueMicrotask(()=>{applyingCloudData=false;cloudReady=true;});
      }catch(error){
        if(alive) store.getState().setSyncStatus("error",session.user.email||null,errorMessage(error));
      }
    };

    const unsubscribeStore=store.subscribe((state,previous)=>{
      if(!alive||!client||!cloudReady||applyingCloudData||!workspaceId) return;
      if(state.processes===previous.processes&&state.scenarios===previous.scenarios) return;
      if(timer) clearTimeout(timer);
      timer=setTimeout(async()=>{
        const current=store.getState();
        const id=workspaceId;
        if(!id) return;
        try{
          await syncWorkspace(client,id,current.processes,current.scenarios);
          if(alive) store.getState().setSyncStatus("synced",current.authEmail);
        }catch(error){
          if(alive) store.getState().setSyncStatus("error",current.authEmail,errorMessage(error));
        }
      },850);
    });

    void Promise.resolve(store.persist.rehydrate()).then(async()=>{
      if(!alive) return;
      markHydrated();
      if(!client){store.getState().setSyncStatus("demo",null);return;}
      const auth=client.auth.onAuthStateChange((event,session)=>{
        if(event==="SIGNED_IN"||event==="USER_UPDATED") window.setTimeout(()=>{if(alive) void loadSession(session);},0);
        if(event==="SIGNED_OUT"){
          cloudReady=false;workspaceId=null;
          store.getState().resetDemo();
          store.getState().setSyncStatus("demo",null);
        }
      });
      authSubscription=auth.data.subscription;
      const {data,error}=await client.auth.getSession();
      if(!alive) return;
      if(error){store.getState().setSyncStatus("error",null,error.message);return;}
      if(data.session) await loadSession(data.session);
      else store.getState().setSyncStatus("demo",null);
    }).catch((error)=>{
      if(alive){markHydrated();store.getState().setSyncStatus("error",null,errorMessage(error));}
    });

    return ()=>{
      alive=false;
      cloudReady=false;
      unsubscribeStore();
      authSubscription?.unsubscribe();
      if(timer) clearTimeout(timer);
    };
  }, [markHydrated]);
  return null;
}
