/**
 * Reads the imgBB API key from chrome.storage.sync (set via the Options page).
 */
export async function getImgbbKey(): Promise<string | undefined> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('imgbbApiKey', (result) => {
      resolve(result.imgbbApiKey || undefined)
    })
  })
}

/**
 * Uploads a base64 PNG to imgBB and returns the hosted URL.
 */
export async function uploadToImgbb(base64DataUri: string, apiKey: string): Promise<string> {
  const base64 = base64DataUri.replace(/^data:image\/\w+;base64,/, '')

  const body = new FormData()
  body.append('image', base64)

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body,
  })

  const json = await res.json() as {
    success: boolean
    data?: { url: string; display_url: string }
    error?: { message: string }
    status?: number
  }

  if (!res.ok || !json.success || !json.data) {
    const msg = json.error?.message ?? `HTTP ${res.status}`
    throw new Error(`imgBB upload failed: ${msg}`)
  }

  return json.data.display_url
}
