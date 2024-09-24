import { Analytics } from '@hcengineering/analytics'
import core, { concatLink, getCurrentAccount, toIdMap, type IdMap } from '@hcengineering/core'
import { PlatformError, getMetadata, unknownError } from '@hcengineering/platform'
import presentation, { createQuery, getClient } from '@hcengineering/presentation'
import { location } from '@hcengineering/ui'
import {
  makeQuery,
  type GithubAuthentication,
  type GithubIntegrationRepository,
  type GithubProject
} from '@hcengineering/github'
import { get, writable } from 'svelte/store'
import github from '../plugin'

export async function onAuthorize (login?: string): Promise<void> {
  const meId = getCurrentAccount()._id
  const state = btoa(
    JSON.stringify({
      accountId: meId,
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
  await client.createDoc<GithubAuthentication>(github.class.GithubAuthentication, core.space.Workspace, {
    attachedTo: meId,
    login: '',
    error: null,
    authRequestTime: Date.now(),
    createdAt: new Date(),
    followers: 0,
    following: 0,
    nodeId: '',
    updatedAt: new Date(),
    url: '',
    repositories: 0,
    organizations: { totalCount: 0, nodes: [] },
    closedIssues: 0,
    openIssues: 0,
    mergedPRs: 0,
    openPRs: 0,
    closedPRs: 0,
    repositoryDiscussions: 0,
    starredRepositories: 0
  })

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
  githubAuth.set(res.shift())
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
  return await fetch(concatLink(concatLink(githubURL, '/api/v1/'), path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  })
}
