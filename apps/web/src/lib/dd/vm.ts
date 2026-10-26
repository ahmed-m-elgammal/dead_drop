/**
 * Dead Drop — the validated city map, once per app (M3 W2 split from the
 * store to keep the ladder/history modules import-cycle-free).
 */
import mapJson from '@/data/map_alpha.json';
import { validateCityMap, type ValidatedMap } from '@dead-drop/engine';

export const VM: ValidatedMap = validateCityMap(mapJson);
