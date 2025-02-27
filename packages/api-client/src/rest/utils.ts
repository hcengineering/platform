import { uncompress } from 'snappyjs'

export async function withRetry<T> (fn: () => Promise<T>): Promise<T> {
  const maxRetries = 3
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      if (attempt === maxRetries - 1) {
        console.error('Failed to execute query', err)
        throw lastError
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
    }
  }
  throw lastError
}

function rpcJSONReceiver (key: string, value: any): any {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'TotalArray') {
      return Object.assign(value.value, { total: value.total, lookupMap: value.lookupMap })
    }
  }
  return value
}

export async function extractJson<T> (response: Response): Promise<any> {
  const encoding = response.headers.get('content-encoding')
  if (encoding === 'snappy') {
    const buffer = await response.arrayBuffer()
    const decompressed = uncompress(buffer)
    const decoder = new TextDecoder()
    const jsonString = decoder.decode(decompressed)
    return JSON.parse(jsonString, rpcJSONReceiver) as T
  }
  const jsonString = await response.text()
  return JSON.parse(jsonString, rpcJSONReceiver) as T
}
