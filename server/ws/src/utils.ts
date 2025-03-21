import type { Request } from 'express'

export function retrieveJson (req: Request): Promise<any> {
  const body: Buffer[] = []
  return new Promise((resolve, reject) => {
    req
      .on('data', (chunk) => {
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
