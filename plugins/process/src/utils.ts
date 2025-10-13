import { Tx, TxUpdateDoc } from '@hcengineering/core/types/tx'
import { SelectedContext } from './types'
import core from '@hcengineering/core'
import { Card } from '@hcengineering/card'
import { parseDSLContext } from './dslContext'

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
  } catch {
    return parseDSLContext(value)
  }
}

export function isUpdateTx (etx: Tx): etx is TxUpdateDoc<Card> {
  return etx._class === core.class.TxUpdateDoc
}
