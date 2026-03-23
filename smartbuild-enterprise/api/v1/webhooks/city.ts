import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function verifySignature(body: string, sig: string, secret: string) {
  return sig === `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const rawBody = Buffer.concat(chunks).toString()

  const sig = (req.headers['x-smartbuild-signature'] as string) ?? ''
  if (!verifySignature(rawBody, sig, process.env.CITY_WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Firma inválida' })
  }

  const { event, payload } = JSON.parse(rawBody)

  if (event === 'firma.registrada' || event === 'pago.liberado') {
    await pool.query(
      `UPDATE ent_hitos SET ito_estado=$1, ito_at=NOW() WHERE id=$2`,
      [event === 'pago.liberado' ? 'pago_liberado' : payload.decision, payload.hito_id]
    ).catch(() => {})
  }

  res.json({ ok: true })
}
