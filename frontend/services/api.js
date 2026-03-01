const API_URL = ''

export async function pingBackend() {
  const res = await fetch(`${API_URL}/ping`)
  return res.json()
}