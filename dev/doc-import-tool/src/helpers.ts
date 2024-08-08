import fs from 'node:fs/promises'

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
