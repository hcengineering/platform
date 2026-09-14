// Copyright © 2026 Huly Contributors.
import { ApiError } from './error'

export const maxDocumentBytes = 25 * 1024 * 1024

export function getPreviewId (file: string, etag: string, format: 'html' | 'pdf'): string {
  const legacyId = `${file}@${etag.replaceAll('"', '')}`
  return format === 'html' ? legacyId : `${legacyId}@pdf-v1`
}

/** One converter process, bounded waiting jobs, and shared results for identical source versions. */
export function createPreviewQueue (maxPending = 4): {
  run: <T>(key: string, operation: () => Promise<T>) => Promise<T>
} {
  const results = new Map<string, Promise<unknown>>()
  const pending: Array<() => void> = []
  let active = false

  return {
    run<T>(key: string, operation: () => Promise<T>): Promise<T> {
      const existing = results.get(key)
      if (existing !== undefined) return existing as Promise<T>
      if (active && pending.length >= maxPending) {
        return Promise.reject(new ApiError(503, 'Document preview is busy. Please try again.'))
      }
      let resolveJob!: (value: T) => void
      let rejectJob!: (reason: unknown) => void
      const result = new Promise<T>((resolve, reject) => {
        resolveJob = resolve
        rejectJob = reject
      })
      results.set(key, result)
      const start = (): void => {
        active = true
        const finish = (): void => {
          results.delete(key)
          active = false
          pending.shift()?.()
        }
        void Promise.resolve()
          .then(operation)
          .then(
            (value) => {
              finish()
              resolveJob(value)
            },
            (error) => {
              finish()
              rejectJob(error)
            }
          )
      }
      if (active) pending.push(start)
      else start()
      return result
    }
  }
}

/** Send bytes, never a source URL: document storage stays behind Huly authentication. */
export async function convertToPdf (
  document: Buffer,
  endpoint: string,
  options: { timeoutMs?: number, maxOutputBytes?: number } = {}
): Promise<Buffer> {
  if (document.length > maxDocumentBytes) throw new ApiError(413, 'Document exceeds the 25 MiB preview limit')
  const maxOutput = options.maxOutputBytes ?? 50 * 1024 * 1024
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs ?? 60000)
  try {
    const body = new FormData()
    body.append('files', new Blob([new Uint8Array(document)]), 'document.docx')
    const response = await fetch(`${endpoint.replace(/\/+$/, '')}/forms/libreoffice/convert`, {
      method: 'POST',
      body,
      signal: controller.signal,
      redirect: 'error'
    })
    if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim() !== 'application/pdf') {
      await response.body?.cancel()
      throw new ApiError(502, 'Failed to convert document to PDF')
    }
    if (Number(response.headers.get('content-length')) > maxOutput) {
      await response.body?.cancel()
      throw new ApiError(502, 'Converted document exceeds the preview limit')
    }
    const reader = response.body?.getReader()
    if (reader === undefined) throw new ApiError(502, 'Empty PDF response')
    const chunks: Buffer[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > maxOutput) {
          await reader.cancel()
          throw new ApiError(502, 'Converted document exceeds the preview limit')
        }
        chunks.push(Buffer.from(value))
      }
    } finally {
      reader.releaseLock()
    }
    const pdf = Buffer.concat(chunks)
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new ApiError(502, 'Invalid PDF response')
    return pdf
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError(504, 'Document conversion timed out')
    if (error instanceof ApiError) throw error
    throw new ApiError(502, 'Document converter is unavailable')
  } finally {
    clearTimeout(timer)
  }
}
