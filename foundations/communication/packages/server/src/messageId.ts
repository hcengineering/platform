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

const EPOCH_OFFSET_US = BigInt(Date.UTC(2022, 0, 1)) * 1000n
const monoStartNs = process.hrtime.bigint()
const realStartUs = BigInt(Date.now()) * 1000n
let lastTick = 0n

function getMonotonicTick10us (): bigint {
  const nowNs = process.hrtime.bigint()
  const deltaUs = (nowNs - monoStartNs) / 1000n
  const absUs = realStartUs + deltaUs
  const relUs = absUs > EPOCH_OFFSET_US ? absUs - EPOCH_OFFSET_US : 0n
  const candidate = relUs / 10n
  const tick = candidate <= lastTick ? lastTick + 1n : candidate
  lastTick = tick
  return tick & ((1n << 64n) - 1n)
}

export function generateMessageId (): MessageID {
  return getMonotonicTick10us().toString() as MessageID
}
