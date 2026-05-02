//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type PersonId, type WorkspaceUuid } from '@hcengineering/core'
import { LRUCache } from 'lru-cache'
import type { ClientBundle } from './client'
import config from './config'

const clientCache = new LRUCache<string, ClientBundle>({
  ttl: config.ClientCacheTtlMs,
  ttlAutopurge: true
})
const inFlightClientCreations = new Map<string, Promise<ClientBundle>>()

export function getCacheKey (workspaceUuid: WorkspaceUuid, socialId: PersonId | undefined, serviceTag: string): string {
  return `${workspaceUuid}:${socialId ?? 'system'}:${serviceTag}`
}

export function getCachedClient (
  workspaceUuid: WorkspaceUuid,
  socialId: PersonId | undefined,
  serviceTag: string
): ClientBundle | undefined {
  const key = getCacheKey(workspaceUuid, socialId, serviceTag)
  return clientCache.get(key)
}

export function setCachedClient (
  workspaceUuid: WorkspaceUuid,
  socialId: PersonId | undefined,
  serviceTag: string,
  value: ClientBundle
): void {
  const key = getCacheKey(workspaceUuid, socialId, serviceTag)
  clientCache.set(key, value)
}

export function getInFlightClientCreation (key: string): Promise<ClientBundle> | undefined {
  return inFlightClientCreations.get(key)
}

export function setInFlightClientCreation (key: string, creation: Promise<ClientBundle>): void {
  inFlightClientCreations.set(key, creation)
}

export function clearInFlightClientCreation (key: string): void {
  inFlightClientCreations.delete(key)
}

export function clearClientCachesForTests (): void {
  clientCache.clear()
  inFlightClientCreations.clear()
}
