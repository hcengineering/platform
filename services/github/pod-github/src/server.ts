import { createNodeMiddleware } from '@octokit/webhooks'
import { App } from 'octokit'

import config from './config'
import { PlatformWorker } from './platform'

import bp from 'body-parser'
import cors from 'cors'
import express from 'express'

import { Analytics } from '@hcengineering/analytics'
import { Account, BrandingMap, MeasureContext, Ref } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import serverCore from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'

/**
 * @public
 */
export async function start (ctx: MeasureContext, brandingMap: BrandingMap): Promise<() => Promise<void>> {
  // Create an authenticated Octokit client authenticated as a GitHub App
  ctx.info('Running Huly Github integration', { appId: config.AppID, clientID: config.ClientID })

  setMetadata(serverCore.metadata.FrontUrl, config.FrontURL)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)

  const octokitApp: App = new App({
    appId: config.AppID,
    privateKey: config.PrivateKey,
    webhooks: {
      secret: config.WebhookSecret
    }
  })

  // Optional: Get & log the authenticated app's name
  const { data } = await octokitApp.octokit.request('/app')

  // Read more about custom logging: https://github.com/octokit/core.js#logging
  octokitApp.octokit.log.debug(`Authenticated as '${data.name as string}'`)

  // Optional: Handle errors
  octokitApp.webhooks.onError((error) => {
    Analytics.handleError(error)
    ctx.error('error', { error, event: error.event })
  })

  // Launch a web server to listen for GitHub webhooks
  const port = config.Port
  const path = '/api/webhook'
  const localWebhookUrl = `http://localhost:${port}${path}`

  // See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
  const middleware = createNodeMiddleware(octokitApp.webhooks as any, { path })

  const app = express()

  app.use(middleware as any)
  app.use(cors())
  app.use(bp.json())
  app.use(bp.urlencoded({ extended: true }))

  // Initialize platform worker
  let worker: PlatformWorker
  try {
    worker = await PlatformWorker.create(ctx, octokitApp, brandingMap)
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('Failed to init Service', { err })
    process.exit(1)
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/api/v1/installation', async (req, res) => {
    const payloadData: {
      installationId: number
      accountId: Ref<Account>
      token: string
    } = req.body
    try {
      const decodedToken = decodeToken(payloadData.token)
      ctx.info('/api/v1/installation', {
        email: decodedToken.email,
        workspaceName: decodedToken.workspace.name,
        body: req.body
      })

      ctx.info('map-installation', {
        workspace: decodedToken.workspace.name,
        installationid: payloadData.installationId
      })
      await ctx.withLog('map-installation', {}, async (ctx) => {
        await worker.mapInstallation(
          ctx,
          decodedToken.workspace.name,
          payloadData.installationId,
          payloadData.accountId
        )
      })
      res.status(200)
      res.json({})
    } catch (err: any) {
      Analytics.handleError(err)
      const tok = decodeToken(payloadData.token, false)
      ctx.error('failed to map-installation', {
        workspace: tok.workspace?.name,
        installationid: payloadData.installationId,
        email: tok?.email
      })
      res.status(401)
      res.json({ error: err.message })
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/api/v1/auth', async (req, res) => {
    try {
      const payloadData: {
        code: string
        state: string
        accountId: Ref<Account>
        token: string
      } = req.body

      const decodedData: {
        accountId: Ref<Account>
        token: string
        op: string
      } = JSON.parse(atob(payloadData.state))

      const decodedToken = decodeToken(decodedData.token)
      ctx.info('request github access-token', {
        workspace: decodedToken.workspace.name,
        accountId: payloadData.accountId,
        code: payloadData.code,
        state: payloadData.state
      })
      await ctx.withLog('request-github-access-token', {}, async (ctx) => {
        await worker.requestGithubAccessToken({
          workspace: decodedToken.workspace.name,
          accountId: payloadData.accountId,
          code: payloadData.code,
          state: payloadData.state
        })
      })
      res.status(200)
      res.json({})
    } catch (err: any) {
      Analytics.handleError(err)
      res.status(401)
      res.json({ error: err.message })
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/api/v1/installation-remove', async (req, res) => {
    try {
      const payloadData: {
        installationId: number
        token: string
      } = req.body

      const decodedToken = decodeToken(payloadData.token)
      ctx.info('/api/v1/installation-remove', {
        email: decodedToken.email,
        workspaceName: decodedToken.workspace.name,
        body: req.body
      })

      ctx.info('remove-installation', {
        workspace: decodedToken.workspace.name,
        installationId: payloadData.installationId
      })
      await ctx.withLog('remove-installation', {}, async (ctx) => {
        await worker.removeInstallation(ctx, decodedToken.workspace.name, payloadData.installationId)
      })
      res.status(200)
      res.json({})
    } catch (err: any) {
      Analytics.handleError(err)
      res.status(401)
      res.json({ error: err.message })
    }
  })

  const server = app.listen(port, () => {
    ctx.info(`Server is listening for events at: ${localWebhookUrl}`)
    ctx.info('Press Ctrl + C to quit.')
  })

  return async () => {
    await worker.close()
    server.close()
  }
}
