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
import { PlatformError, getMetadata, setMetadata, unknownError } from '@hcengineering/platform'
import presentation, { createQuery, getClient } from '@hcengineering/presentation'
import { location } from '@hcengineering/ui'
import { get, writable } from 'svelte/store'
import github from '../plugin'

type GithubFrontendConfigKey = 'GITHUB_APP' | 'GITHUB_CLIENTID' | 'GITHUB_URL'

let githubFrontendConfigPromise: Promise<Partial<Record<GithubFrontendConfigKey, string>>> | undefined

async function getGithubFrontendConfig (): Promise<Partial<Record<GithubFrontendConfigKey, string>>> {
  if (githubFrontendConfigPromise == null) {
    githubFrontendConfigPromise = fetch('/config.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load /config.json: ${response.status}`)
        }
        return (await response.json()) as Partial<Record<GithubFrontendConfigKey, string>>
      })
      .catch((err) => {
        console.warn('Failed to load GitHub frontend config fallback', err)
        return {}
      })
  }

  return await githubFrontendConfigPromise
}

export async function getGithubConfigValue (
  metadataKey: string,
  metadataValue: string | undefined,
  configKey: GithubFrontendConfigKey
): Promise<string | undefined> {
  if (metadataValue != null && metadataValue !== '') {
    return metadataValue
  }

  const config = await getGithubFrontendConfig()
  const configValue = config[configKey]
  if (typeof configValue === 'string' && configValue !== '') {
    setMetadata(metadataKey as any, configValue)
    return configValue
  }

  return undefined
}

export async function onAuthorize (login?: string): Promise<void> {
  const clientId = await getGithubConfigValue(
    github.metadata.GithubClientID,
    getMetadata(github.metadata.GithubClientID),
    'GITHUB_CLIENTID'
  )
  if (clientId == null) {
    throw new PlatformError(unknownError('Github OAuth client ID is not configured'))
  }

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
      client_id: clientId,
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
  const githubURL = await getGithubConfigValue(github.metadata.GithubURL, getMetadata(github.metadata.GithubURL), 'GITHUB_URL')
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
