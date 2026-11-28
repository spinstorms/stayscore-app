/**
 * Tripadvisor ratings saved from stayodds.com (no live calls to Tripadvisor): rating out of 5,
 * review count, ranking and awards, with the date each one was checked. Refreshed when the
 * website's copy is refreshed and the app is updated.
 */
import data from '../assets/data/tripadvisor.json';

export type TripadvisorInfo = { r: number; n?: number | null; u?: string | null; d?: string | null; k?: string; a?: string[] };

const HOTELS = (data as { hotels: Record<string, TripadvisorInfo> }).hotels;

export function getTripadvisor(id: string | undefined | null): TripadvisorInfo | null {
  return (id && HOTELS[id]) || null;
}

export const TRIPADVISOR_UPDATED = (data as { updated?: string }).updated ?? '';
