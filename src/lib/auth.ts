import { randomToken } from './util'

export type AdminRow = {
  id: number
  nome: string
  email: string
  senha_hash: string
}

const encoder = new TextEncoder()

function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256
  )
  return new Uint8Array(bits)
}

/**
 * The Workers runtime hard-caps PBKDF2 at 100,000 iterations and throws a
 * NotSupportedError above it. Local miniflare/Node does not, so a higher value
 * passes every local test and then fails in production. Hashing and seeding must
 * therefore stay at or below this ceiling.
 */
export const PBKDF2_MAX_ITERATIONS = 100000

/** Formato: pbkdf2$<iteracoes>$<saltB64>$<hashB64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const iterations = PBKDF2_MAX_ITERATIONS
  const hash = await pbkdf2(password, salt, iterations)
  return `pbkdf2$${iterations}$${toB64(salt)}$${toB64(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = String(stored || '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations <= 0) return false
  const salt = fromB64(parts[2])
  const expected = fromB64(parts[3])
  let actual: Uint8Array
  try {
    actual = await pbkdf2(password, salt, iterations)
  } catch {
    // A hash written above the runtime ceiling cannot be verified here.
    // Fail closed instead of turning the login into a 500.
    return false
  }
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

export const SESSION_COOKIE = 'utr_sid'
const SESSION_HOURS = 12

export async function createSession(db: D1Database, adminId: number): Promise<string> {
  const token = randomToken(32)
  const expira = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString()
  await db
    .prepare('INSERT INTO sessions (token, admin_id, expira_em) VALUES (?, ?, ?)')
    .bind(token, adminId, expira)
    .run()
  return token
}

export async function destroySession(db: D1Database, token: string | null): Promise<void> {
  if (!token) return
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export async function getAdminFromRequest(
  db: D1Database,
  req: Request
): Promise<AdminRow | null> {
  const cookie = req.headers.get('Cookie') || ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  if (!match) return null
  const token = match[1]
  const row = await db
    .prepare(
      `SELECT a.id, a.nome, a.email, a.senha_hash, s.expira_em
         FROM sessions s JOIN admin_users a ON a.id = s.admin_id
        WHERE s.token = ?`
    )
    .bind(token)
    .first<AdminRow & { expira_em: string }>()
  if (!row) return null
  if (new Date(row.expira_em).getTime() < Date.now()) {
    await destroySession(db, token)
    return null
  }
  return { id: row.id, nome: row.nome, email: row.email, senha_hash: row.senha_hash }
}

export function sessionCookie(token: string): string {
  const maxAge = SESSION_HOURS * 3600
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
