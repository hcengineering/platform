export async function download (url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`)
      return null
    }
    return await response.blob()
  } catch (err) {
    console.error(`Error downloading from ${url}:`, err instanceof Error ? err.message : err)
    return null
  }
}
