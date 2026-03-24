import { ItemQuantities } from "@/data/laundryItems";

export interface Collection {
  id: string;
  cliente: string;
  responsavel: string;
  data: string;
  motorista: string;
  quantities: ItemQuantities;
  pesoTotal: string;
  observacoes: string;
  status: "coleta" | "entrega" | "finalizado";
  delivered?: ItemQuantities;
  createdAt: string;
}
