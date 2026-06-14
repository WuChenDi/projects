// Verify a site token against GET /api/verify.
export async function verifyToken(token: string): Promise<boolean> {
  const res = await fetch('/api/verify', {
    headers: { authorization: `Bearer ${token}` },
  })
  return res.ok
}
