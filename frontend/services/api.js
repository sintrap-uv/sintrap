const API_URL = process.env.NGROK_URL

if (!API_URL) {
  console.warn('API_URL no definida. Revisa el .env')
}

export async function pingBackend() {
  const res = await fetch(`${API_URL}/ping`)
  return res.json()
}