import { SelectedContext } from './types'

export function parseContext (value: any): SelectedContext | undefined {
  if (value === undefined) return
  if (typeof value !== 'string') return
  const index = value.indexOf('${')
  if (index === -1) return
  const endIndex = value.lastIndexOf('}')
  if (endIndex === -1) return
  const content = value.substring(index + 1, endIndex + 1)
  try {
    const res = JSON.parse(content) as SelectedContext
    if (res.type === undefined) return
    return res
  } catch {}
}
