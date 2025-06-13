// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

import { MessageID } from '@hcengineering/communication-types'

const MSB_MASK = 1n << 63n
const EXTERNAL_FLAG = 1n << 62n
const TICK_MASK = (1n << 62n) - 1n

/*
  Epoch: 2022-01-01T00:00:00Z
  64-bit layout:
    bit 63 = 0
    bit 62 = external flag
    bits 61..0 = monotonic tick
*/

const EPOCH_OFFSET_US = BigInt(Date.UTC(2022, 0, 1)) * 1000n
const monoStartNs = process.hrtime.bigint()
const realStartUs = BigInt(Date.now()) * 1000n

let lastTick = 0n

/**
 * Generate the next monotonic tick (unit = 10µs) since epoch2022
 * strictly monotonic: bumps +1 on conflict or clock rollback
 */
function getMonotonicTick10us (): bigint {
  const nowNs = process.hrtime.bigint()
  const deltaUs = (nowNs - monoStartNs) / 1000n
  const absUs = realStartUs + deltaUs
  const relUs = absUs > EPOCH_OFFSET_US ? absUs - EPOCH_OFFSET_US : 0n
  const candidate = relUs / 10n
  const tick = candidate <= lastTick ? lastTick + 1n : candidate
  lastTick = tick
  return tick
}

function tick10usToDate (tick: bigint): { date: Date, us: number } {
  const totalUs = tick * 10n
  const absUs = EPOCH_OFFSET_US + totalUs
  const ms = Number(absUs / 1000n)
  const us = Number(absUs % 1000n)
  return { date: new Date(ms), us }
}

export function generateMessageId (external = false): MessageID {
  const tick = getMonotonicTick10us()
  const id = external ? (tick | EXTERNAL_FLAG) : tick
  return id.toString() as MessageID
}

export function messageIdToDate (id: string): Date | undefined {
  let n: bigint
  try {
    n = BigInt(id)
  } catch {
    throw new Error(`Invalid bigint string: ${id}`)
  }
  const tick = n & TICK_MASK
  try {
    const date = tick10usToDate(tick).date
    if (isNaN(date.getTime())) {
      return undefined
    }
    return date
  } catch (err: any) {
    console.error('Failed to parse message id', id, err)
    return undefined
  }
}

export function isExternalMessageId (id: string): boolean {
  let n: bigint
  try {
    n = BigInt(id)
  } catch {
    throw new Error(`Invalid bigint string: ${id}`)
  }

  if ((n & MSB_MASK) !== 0n) {
    throw new Error(`Invalid MessageID: MSB (bit63) must be 0, got ${id}`)
  }

  return (n & EXTERNAL_FLAG) !== 0n
}

export function isInternalMessageId (messageId: string): boolean {
  return !isExternalMessageId(messageId)
}
