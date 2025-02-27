export interface RetryOptions {
  retries: number
  delay?: number
}

export async function retry<T>(op: () => Promise<T>, { retries, delay }: RetryOptions): Promise<T> {
  let error: any
  while (retries > 0) {
    retries--
    try {
      return await op()
    } catch (err: any) {
      error = err
      if (retries !== 0 && delay !== undefined && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw error
}
