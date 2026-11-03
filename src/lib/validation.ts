import type { WorkflowGraph } from "@/lib/types";

export type WorkflowValidation = { valid: boolean; issues: string[]; invalidNodeIds: string[] };

const allowed = new Set(["start>activity", "start>wait", "start>end", "activity>activity", "activity>wait", "activity>end", "wait>activity", "wait>end"]);

export function validateWorkflow(graph: WorkflowGraph): WorkflowValidation {
  const issues: string[] = [];
  const invalid = new Set<string>();
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const starts = nodes.filter((n) => n.type === "start");
  const ends = nodes.filter((n) => n.type === "end");
  if (starts.length !== 1) { issues.push(`Workflow harus memiliki tepat satu node Mulai (saat ini ${starts.length}).`); starts.forEach((n) => invalid.add(n.id)); }
  if (ends.length !== 1) { issues.push(`Workflow harus memiliki tepat satu node Selesai (saat ini ${ends.length}).`); ends.forEach((n) => invalid.add(n.id)); }
  if (!nodes.length) return { valid: false, issues: ["Workflow masih kosong."], invalidNodeIds: [] };

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) { incoming.set(n.id, 0); outgoing.set(n.id, 0); adjacency.set(n.id, []); }
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) { issues.push("Ada koneksi yang mengarah ke node yang tidak ditemukan."); continue; }
    const route = `${source.type}>${target.type}`;
    if (!allowed.has(route)) { issues.push(`Koneksi ${source.data.label} → ${target.data.label} tidak valid untuk alur linear.`); invalid.add(source.id); invalid.add(target.id); }
    outgoing.set(source.id, (outgoing.get(source.id) ?? 0) + 1);
    incoming.set(target.id, (incoming.get(target.id) ?? 0) + 1);
    adjacency.get(source.id)?.push(target.id);
  }
  if (starts[0] && (incoming.get(starts[0].id) ?? 0) !== 0) { issues.push("Node Mulai tidak boleh memiliki koneksi masuk."); invalid.add(starts[0].id); }
  if (ends[0] && (outgoing.get(ends[0].id) ?? 0) !== 0) { issues.push("Node Selesai tidak boleh memiliki koneksi keluar."); invalid.add(ends[0].id); }
  for (const n of nodes) {
    const inCount = incoming.get(n.id) ?? 0;
    const outCount = outgoing.get(n.id) ?? 0;
    if (n.type !== "start" && inCount !== 1) { issues.push(`${n.data.label} harus memiliki tepat satu koneksi masuk.`); invalid.add(n.id); }
    if (n.type !== "end" && outCount !== 1) { issues.push(`${n.data.label} harus memiliki tepat satu koneksi keluar.`); invalid.add(n.id); }
    if (inCount > 1 || outCount > 1) invalid.add(n.id);
  }

  if (starts.length === 1) {
    const visited = new Set<string>();
    let cursor: string | undefined = starts[0].id;
    let cycle = false;
    while (cursor) {
      if (visited.has(cursor)) { cycle = true; invalid.add(cursor); break; }
      visited.add(cursor);
      cursor = adjacency.get(cursor)?.[0];
    }
    if (cycle) issues.push("Workflow mengandung siklus. Gunakan alur linear tanpa koneksi berulang.");
    if (!ends[0] || !visited.has(ends[0].id)) issues.push("Tidak ditemukan jalur valid dari Mulai ke Selesai.");
    if (visited.size < nodes.length) {
      const disconnected = nodes.filter((n) => !visited.has(n.id));
      disconnected.forEach((n) => invalid.add(n.id));
      issues.push(`${disconnected.length} node belum terhubung dalam jalur Mulai → Selesai.`);
    }
  }
  const uniqueIssues = [...new Set(issues)];
  return { valid: uniqueIssues.length === 0, issues: uniqueIssues, invalidNodeIds: [...invalid] };
}
