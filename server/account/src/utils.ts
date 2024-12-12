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
import { groupByArray, MeasureContext } from '@hcengineering/core'
import { getMongoClient } from '@hcengineering/mongo' // TODO: get rid of this import later
import { getMetadata } from '@hcengineering/platform'
import { getDBClient } from '@hcengineering/postgres'

import { pbkdf2Sync } from 'crypto'

import { MongoAccountDB } from './collections/mongo'
import { PostgresAccountDB } from './collections/postgres'
import { accountPlugin } from './plugin'
import type { Account, AccountDB, AccountInfo, RegionInfo, WorkspaceInfo } from './types'

export async function getAccountDB (uri: string, dbNs?: string): Promise<[AccountDB, () => void]> {
  const isMongo = uri.startsWith('mongodb://')

  if (isMongo) {
    const client = getMongoClient(uri)
    const db = (await client.getClient()).db(dbNs ?? 'account')
    const mongoAccount = new MongoAccountDB(db)

    await mongoAccount.init()

    return [
      mongoAccount,
      () => {
        client.close()
      }
    ]
  } else {
    const client = getDBClient(uri)
    const pgClient = await client.getClient()
    // TODO: if dbNs is provided put tables in that schema
    const pgAccount = new PostgresAccountDB(pgClient)

    let error = false

    do {
      try {
        await pgAccount.init()
        error = false
      } catch (e) {
        console.error('Error while initializing postgres account db', e)
        error = true
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } while (error)

    return [
      pgAccount,
      () => {
        client.close()
      }
    ]
  }
}

export function toAccountInfo (account: Account): AccountInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, salt, ...result } = account
  return result
}

/**
 * Returns a hash code for a string.
 * (Compatible to Java's String.hashCode())
 *
 * The hash code for a string object is computed as
 *     s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
 * using number arithmetic, where s[i] is the i th character
 * of the given string, n is the length of the string,
 * and ^ indicates exponentiation.
 * (The hash value of the empty string is zero.)
 *
 */
function hashWorkspace (dbWorkspaceName: string): number {
  return [...dbWorkspaceName].reduce((hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0, 0)
}

export enum EndpointKind {
  Internal,
  External
}

const toTransactor = (line: string): { internalUrl: string, region: string, externalUrl: string } => {
  const [internalUrl, externalUrl, region] = line
    .split(';')
    .map((it) => it.trim())
    .map((it) => (it.length === 0 ? undefined : it))
  return { internalUrl: internalUrl ?? '', region: region ?? '', externalUrl: externalUrl ?? internalUrl ?? '' }
}

const getEndpoints = (): string[] => {
  const transactorsUrl = getMetadata(accountPlugin.metadata.Transactors)
  if (transactorsUrl === undefined) {
    throw new Error('Please provide transactor endpoint url')
  }
  const endpoints = transactorsUrl
    .split(',')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)

  if (endpoints.length === 0) {
    throw new Error('Please provide transactor endpoint url')
  }
  return endpoints
}

// Info is static, so no need to calculate it every time.
let regionInfo: RegionInfo[] = []

export const getRegions = (): RegionInfo[] => {
  if (regionInfo.length === 0) {
    const endpoints = getEndpoints()
      .map(toTransactor)
      .map((it) => ({ region: it.region.trim(), name: '' }))
    if (process.env.REGION_INFO !== undefined) {
      regionInfo = process.env.REGION_INFO.split(';')
        .map((it) => it.split('|'))
        .map((it) => ({ region: it[0].trim(), name: it[1].trim() }))
      // We need to add all endpoints if they are not in info.
      for (const endpoint of endpoints) {
        if (regionInfo.find((it) => it.region === endpoint.region) === undefined) {
          regionInfo.push(endpoint)
        }
      }
    } else {
      regionInfo = endpoints
    }
  }
  return regionInfo
}

export const getEndpoint = (ctx: MeasureContext, workspaceInfo: WorkspaceInfo, kind: EndpointKind): string => {
  const byRegions = groupByArray(getEndpoints().map(toTransactor), (it) => it.region)
  let transactors = (byRegions.get(workspaceInfo.region ?? '') ?? [])
    .map((it) => (kind === EndpointKind.Internal ? it.internalUrl : it.externalUrl))
    .flat()

  // This is really bad
  if (transactors.length === 0) {
    ctx.error('No transactors for the target region, will use default region', { group: workspaceInfo.region })

    transactors = (byRegions.get('') ?? [])
      .map((it) => (kind === EndpointKind.Internal ? it.internalUrl : it.externalUrl))
      .flat()
  }

  if (transactors.length === 0) {
    ctx.error('No transactors for the default region')
    throw new Error('Please provide transactor endpoint url')
  }

  const hash = hashWorkspace(workspaceInfo.workspace)
  return transactors[Math.abs(hash % transactors.length)]
}

export function getAllTransactors (kind: EndpointKind): string[] {
  const transactorsUrl = getMetadata(accountPlugin.metadata.Transactors)
  if (transactorsUrl === undefined) {
    throw new Error('Please provide transactor endpoint url')
  }
  const endpoints = transactorsUrl
    .split(',')
    .map((it) => it.trim())
    .filter((it) => it.length > 0)

  if (endpoints.length === 0) {
    throw new Error('Please provide transactor endpoint url')
  }

  const toTransactor = (line: string): { internalUrl: string, group: string, externalUrl: string } => {
    const [internalUrl, externalUrl, group] = line.split(';')
    return { internalUrl, group: group ?? '', externalUrl: externalUrl ?? internalUrl }
  }

  return endpoints.map(toTransactor).map((it) => (kind === EndpointKind.External ? it.externalUrl : it.internalUrl))
}

export function hashWithSalt (password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 1000, 32, 'sha256')
}

export function verifyPassword (password: string, hash: Buffer, salt: Buffer): boolean {
  return Buffer.compare(hash, hashWithSalt(password, salt)) === 0
}

export function cleanEmail (email: string): string {
  return email.toLowerCase().trim()
}

export function isEmail (email: string): boolean {
  const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/
  return EMAIL_REGEX.test(email)
}

export function areDbIdsEqual (obj1: any, obj2: any): boolean {
  if (obj1.equals !== undefined) {
    return obj1.equals(obj2)
  }

  return obj1 === obj2
}

export function isShallowEqual (obj1: Record<string, any>, obj2: Record<string, any>): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  return keys1.length === keys2.length && keys1.every((k) => obj1[k] === obj2[k])
}
