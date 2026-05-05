import {
  getClient as getAccountClientRaw,
  type AccountClient,
  type Integration as AccountIntegration
} from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import { concatLink, getCurrentAccount, toIdMap, type IdMap } from '@hcengineering/core'
import {
  githubIntegrationKind,
  makeQuery,
  type GithubAuthentication,
  type GithubIntegrationRepository,
  type GithubProject
} from '@hcengineering/github'
import login from '@hcengineering/login'
import { PlatformError, getMetadata, unknownError } from '@hcengineering/platform'
import presentation, { createQuery, getClient } from '@hcengineering/presentation'
import { location } from '@hcengineering/ui'
import { get, writable } from 'svelte/store'
import github from '../plugin'

export async function onAuthorize (login?: string): Promise<void> {
  const state = btoa(
    JSON.stringify({
      accountId: getCurrentAccount().primarySocialId,
      workspace: get(location).path[1],
      token: getMetadata(presentation.metadata.Token),
      op: 'authorize'
    })
  )
  const client = getClient()

  // Remove old authorizations.
  const config = await client.findAll(github.class.GithubAuthentication, {})
  for (const c of config) {
    await client.remove(c)
  }
  Analytics.handleEvent('Authorize github clicked')

  const url =
    'https://github.com/login/oauth/authorize?' +
    makeQuery({
      client_id: getMetadata(github.metadata.GithubClientID),
      login: '',
      state,
      allow_signup: 'true'
    })
  window.open(url)
}

export function getAccountClient (): AccountClient | undefined {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)
  if (accountsUrl == null || token == null) {
    return undefined
  }
  return getAccountClientRaw(accountsUrl, token)
}

export async function updateGithubAccountIntegrationLogin (
  loginVal: string,
  integration: AccountIntegration | undefined
): Promise<void> {
  try {
    const accountClient = getAccountClient()
    if (accountClient === undefined) {
      throw new Error('Account client is not defined')
    }
    const socialId = integration?.socialId ?? getCurrentAccount().primarySocialId
    const workspaceUuid = integration?.workspaceUuid ?? null

    const key = { socialId, kind: githubIntegrationKind, workspaceUuid }
    const existing = await accountClient.getIntegration(key)
    const mergedData = { ...(existing?.data ?? {}), login: loginVal }

    if (existing == null) {
      throw new Error('Integration not found')
    }
    await accountClient.updateIntegration({ ...existing, data: mergedData })
  } catch (err: any) {
    console.error('Error updating github account integration login', err)
    Analytics.handleError(err)
  }
}

const repositoryQuery = createQuery(true)

/**
 * @public
 */
export const integrationRepositories = writable<IdMap<GithubIntegrationRepository>>(new Map())

repositoryQuery.query(github.class.GithubIntegrationRepository, {}, (res) => {
  integrationRepositories.set(toIdMap(res))
})

const projectQuery = createQuery(true)

/**
 * @public
 */
export const githubProjects = writable<IdMap<GithubProject>>(new Map())

projectQuery.query(github.mixin.GithubProject, {}, (res) => {
  githubProjects.set(toIdMap(res))
})

const authQuery = createQuery(true)
export const githubAuth = writable<GithubAuthentication | undefined>(undefined)
authQuery.query(github.class.GithubAuthentication, {}, (res) => {
  githubAuth.set(res.find((it) => it.login !== ''))
})

/**
 * @public
 */
export async function sendGHServiceRequest (path: string, args: Record<string, any>): Promise<any> {
  const githubURL = getMetadata(github.metadata.GithubURL)
  if (githubURL === undefined) {
    // We could try use recognition service to find some document properties.
    throw new PlatformError(unknownError('Github integration is not configured'))
  }
  const response = await fetch(concatLink(concatLink(githubURL, '/api/v1/'), path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  })
  const result = await response.json().catch(() => undefined)

  if (!response.ok) {
    const errorMessage =
      typeof result?.error === 'string'
        ? result.error
        : `Github integration request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return result
}
