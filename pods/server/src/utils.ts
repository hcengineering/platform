import type { Request } from 'express'

export function retrieveJson (req: Request): Promise<any> {
  const body: Uint8Array[] = []
  return new Promise((resolve, reject) => {
    req
      .on('data', (chunk: Uint8Array) => {
        body.push(chunk)
      })
      .on('error', (err) => {
        reject(err)
      })
      .on('end', () => {
        // on end of data, perform necessary action
        try {
          const data = JSON.parse(Buffer.concat(body).toString())
          resolve(data)
        } catch (err: any) {
          reject(err)
        }
      })
  })
}
