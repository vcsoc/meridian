import { parse, stringify } from 'yaml'
import type { City } from './data'

export type FavoriteEntry = { city: City; meta?: { alias: string; tags: string[]; address?: string } }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'

export function exportFavorites(favorites: FavoriteEntry[]) {
 return stringify({ version: 1, favorites })
}

export function importFavorites(source: string): FavoriteEntry[] {
 const data: unknown = parse(source, { maxAliasCount: 100 })
 if (!record(data) || data.version !== 1 || !Array.isArray(data.favorites)) throw new Error('Expected a Meridian favourites YAML file (version 1).')
 return data.favorites.map((entry: unknown, index: number) => {
  const invalid = () => new Error(`Invalid favourite at entry ${index + 1}.`)
  if (!record(entry) || !record(entry.city)) throw invalid()
  const c = entry.city
  if (!text(c.name) || !c.name.trim() || !text(c.country) || !text(c.code) || !text(c.tz) || typeof c.lat !== 'number' || !Number.isFinite(c.lat) || Math.abs(c.lat) > 90 || typeof c.lng !== 'number' || !Number.isFinite(c.lng) || Math.abs(c.lng) > 180 || (c.address !== undefined && !text(c.address))) throw invalid()
  try { new Intl.DateTimeFormat('en-US', { timeZone: c.tz }) } catch { throw invalid() }
  const city: City = { name: c.name, country: c.country, code: c.code, tz: c.tz, lat: c.lat, lng: c.lng, ...(text(c.address) ? { address: c.address } : {}) }
  if (entry.meta === undefined) return { city }
  const m = entry.meta
  if (!record(m) || !text(m.alias) || !Array.isArray(m.tags) || !m.tags.every(text) || (m.address !== undefined && !text(m.address))) throw invalid()
  return { city, meta: { alias: m.alias, tags: m.tags, ...(text(m.address) ? { address: m.address } : {}) } }
 })
}
