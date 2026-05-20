const DAY_MAP: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

export interface RotaLite {
  dias_semana: string[] | null;
  horario_corte: string | null;
  periodo: string | null;
}

export function calcDataColeta(rota: RotaLite | null | undefined, now: Date = new Date()): Date {
  if (!rota) return now;
  if (rota.periodo === "livre") return now;
  const dias = (rota.dias_semana || []).map((d) => DAY_MAP[d]).filter((d) => d !== undefined);
  if (dias.length === 0) return now;
  const corte = rota.horario_corte || "23:59";
  const [hh, mm] = corte.split(":").map((n) => parseInt(n, 10));
  for (let offset = 0; offset < 14; offset++) {
    const cand = new Date(now);
    cand.setDate(now.getDate() + offset);
    if (dias.includes(cand.getDay())) {
      if (offset === 0) {
        if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return cand;
      } else {
        return cand;
      }
    }
  }
  return now;
}

export function formatDataColeta(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}