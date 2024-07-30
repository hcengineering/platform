import fs from 'node:fs/promises'
import fetch from 'node-fetch'
import FormData from 'form-data'

export async function readFile (doc: string): Promise<string> {
  const buffer = await fs.readFile(doc)
  return buffer.toString()
}

function peelStr (s: string): string {
  return s
    .replace(/^[\W_0-9]*/, '')
    .replace(/[\W_0-9]*$/, '')
    .toLowerCase()
}

export function compareStrExact (a: string, b: string): boolean {
  return peelStr(a) === peelStr(b)
}

export function clean (s: string): string {
  return s.replaceAll('\n', ' ').trim()
}

export async function uploadFile (
  contents: string,
  name: string,
  type: string,
  uploadURL: string,
  token: string
): Promise<string> {
  const data = new FormData()
  const buffer = Buffer.from(contents, 'base64')
  data.append(
    'file',
    Object.assign(buffer, {
      lastModified: Date.now(),
      name,
      type
    })
  )

  const resp = await fetch(uploadURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: data
  })

  if (resp.status !== 200) {
    if (resp.status === 413) {
      throw new Error('File is too large')
    } else {
      throw Error(`Failed to upload file: ${resp.statusText}`)
    }
  }

  return await resp.text()
}
