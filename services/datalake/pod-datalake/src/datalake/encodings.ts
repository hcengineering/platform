//
// Copyright © 2024 Hardcore Engineering Inc.
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
//

import { type UUID } from './types'

export function digestToUUID (digest: string): UUID {
  const bytes = Buffer.from(digest, 'hex').subarray(0, 16)
  return toUUID(new Uint8Array(bytes))
}

export function stringToUUID (value: string): UUID {
  const bytes = Buffer.from(value).subarray(0, 16)
  return toUUID(new Uint8Array(bytes))
}

export const toUUID = (buffer: Uint8Array): UUID => {
  const hex = toHex(buffer)
  const hex32 = hex.slice(0, 32).padStart(32, '0')
  return formatHexAsUUID(hex32)
}

export const toHex = (buffer: Uint8Array): string => {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function formatHexAsUUID (hexString: string): UUID {
  if (hexString.length !== 32) {
    throw new Error('Hex string must be exactly 32 characters long.')
  }
  return hexString.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') as UUID
}
