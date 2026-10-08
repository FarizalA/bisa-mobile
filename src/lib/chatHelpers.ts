export interface OrderContentParsed {
  jobId: string;
  judul: string;
  budget: string;
  status: string;
}

export function parseOrderContent(content: string): OrderContentParsed {
  const raw = content.slice(8);
  if (raw.includes("|")) {
    const [jobId, encodedJudul, encodedBudget, status] = raw.split("|");
    return {
      jobId: jobId || "",
      judul: encodedJudul ? decodeURIComponent(encodedJudul) : "",
      budget: encodedBudget ? decodeURIComponent(encodedBudget) : "",
      status: status || "",
    };
  }
  const parts = raw.split(":");
  if (parts.length >= 4) {
    const jobId = parts[0];
    const status = parts[parts.length - 1];
    const budget = parts[parts.length - 2];
    const judul = parts.slice(1, -2).join(":");
    return { jobId, judul, budget, status };
  }
  return {
    jobId: parts[0] || "",
    judul: parts[1] || "",
    budget: parts[2] || "",
    status: parts[3] || "",
  };
}

export function formatBudget(budget: string): string {
  if (!budget) return "-";
  if (budget.includes("Rp")) return budget;
  const digits = budget.replace(/[^0-9]/g, "");
  if (!digits) return budget;
  const num = Number(digits);
  if (isNaN(num)) return budget;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
