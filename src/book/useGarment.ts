import { useStore } from '../state';
import { garmentById, gidOf, Garment } from '../data';

export function useGarment(): Garment | undefined {
  const { state } = useStore();
  return garmentById(gidOf(state.chapter, state.side));
}
