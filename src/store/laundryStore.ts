import { create } from "zustand";
import { Collection } from "@/types/collection";
import { ItemQuantities } from "@/data/laundryItems";

interface LaundryStore {
  collections: Collection[];
  addCollection: (c: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  getCollection: (id: string) => Collection | undefined;
}

const loadFromStorage = (): Collection[] => {
  try {
    const data = localStorage.getItem("amana_collections");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (collections: Collection[]) => {
  localStorage.setItem("amana_collections", JSON.stringify(collections));
};

export const useLaundryStore = create<LaundryStore>((set, get) => ({
  collections: loadFromStorage(),
  addCollection: (c) => {
    const updated = [...get().collections, c];
    saveToStorage(updated);
    set({ collections: updated });
  },
  updateCollection: (id, updates) => {
    const updated = get().collections.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    saveToStorage(updated);
    set({ collections: updated });
  },
  getCollection: (id) => get().collections.find((c) => c.id === id),
}));
