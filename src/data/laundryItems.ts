export interface LaundryItem {
  id: string;
  name: string;
  unit: string;
}

export const laundryItems: LaundryItem[] = [
  { id: "blusa_camisa", name: "Blusa / Camisa", unit: "PEÇA" },
  { id: "calca", name: "Calça", unit: "PEÇA" },
  { id: "camisola_transpassada", name: "Camisola Transpassada", unit: "PEÇA" },
  { id: "campo_grande", name: "Campo Grande", unit: "PEÇA" },
  { id: "campo_medio", name: "Campo Médio", unit: "PEÇA" },
  { id: "campo_pequeno", name: "Campo Pequeno", unit: "PEÇA" },
  { id: "campo_grande_fenestra", name: "Campo Grande c/ Fenestra", unit: "PEÇA" },
  { id: "campo_pequeno_fenestra", name: "Campo Pequeno c/ Fenestra", unit: "PEÇA" },
  { id: "capa_microscopio", name: "Capa para Microscópio", unit: "PEÇA" },
  { id: "capote_cirurgico", name: "Capote Cirúrgico", unit: "PEÇA" },
  { id: "cobertor_grande", name: "Cobertor Grande", unit: "PEÇA" },
  { id: "cobertor_pequeno", name: "Cobertor Pequeno", unit: "PEÇA" },
  { id: "colcha_grande", name: "Colcha Grande", unit: "PEÇA" },
  { id: "colcha_pequena", name: "Colcha Pequena", unit: "PEÇA" },
  { id: "compressa_035", name: "Compressa 0,35 x 0,36", unit: "PEÇA" },
  { id: "compressa_050", name: "Compressa 0,50 x 0,70", unit: "PEÇA" },
  { id: "edredom", name: "Edredom", unit: "PEÇA" },
  { id: "fronha", name: "Fronha", unit: "PEÇA" },
  { id: "gorro_touca", name: "Gorro / Touca", unit: "PEÇA" },
  { id: "impermeavel", name: "Impermeável (Napa)", unit: "PEÇA" },
  { id: "jaleco_medico", name: "Jaleco Médico", unit: "PEÇA" },
  { id: "lencol_liso", name: "Lençol Liso", unit: "PEÇA" },
  { id: "lencol_elastico", name: "Lençol com Elástico", unit: "PEÇA" },
  { id: "pano_chao", name: "Pano de Chão", unit: "PEÇA" },
  { id: "pano_prato", name: "Pano de Prato", unit: "PEÇA" },
  { id: "pijama_paciente", name: "Pijama Paciente", unit: "CONJUNTO" },
  { id: "piso", name: "Piso", unit: "PEÇA" },
  { id: "saco_duplo", name: "Saco Duplo de Algodão (Hamper)", unit: "PEÇA" },
  { id: "sapatilha", name: "Sapatilha", unit: "PEÇA" },
  { id: "short", name: "Short", unit: "PEÇA" },
  { id: "tapete_grande", name: "Tapete Grande", unit: "PEÇA" },
  { id: "tapete_pequeno", name: "Tapete Pequeno", unit: "PEÇA" },
  { id: "toalha_banho", name: "Toalha de Banho", unit: "PEÇA" },
  { id: "toalha_rosto", name: "Toalha de Rosto", unit: "PEÇA" },
  { id: "toalha_mao", name: "Toalha de Mão", unit: "PEÇA" },
  { id: "tracado", name: "Traçado", unit: "PEÇA" },
  { id: "travesseiro", name: "Travesseiro", unit: "PEÇA" },
  { id: "almofada", name: "Almofada", unit: "PEÇA" },
];

export type ItemQuantities = Record<string, number>;
