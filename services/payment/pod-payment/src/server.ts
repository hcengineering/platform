//
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
//

import cors from 'cors'
import express, { type Express, NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { MeasureContext, systemAccountUuid } from '@hcengineering/core'
import morgan from 'morgan'
import onHeaders from 'on-headers'
import { generateToken } from '@hcengineering/server-token'

import { Config } from './config'
import { withAdmin, withOwner, withToken, type RequestWithAuth } from './middleware'
import { PaymentProviderFactory } from './factory'
import type { PaymentProvider } from './providers'
import { SubscribeRequest } from './providers'

const KEEP_ALIVE_TIMEOUT = 5 // seconds

type AsyncRequestHandler = (ctx: MeasureContext, req: Request, res: Response) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await ctx.with(name, {}, (ctx) => {
      onHeaders(res, () => {
        const measurements = ctx.metrics?.measurements
        if (measurements !== undefined) {
          const values = []
          for (const [k, v] of Object.entries(measurements)) {
            values.push(`${k};dur=${v.value.toFixed(2)}`)
          }
          if (values.length > 0) {
            if (!res.headersSent) {
              res.setHeader('Server-Timing', values.join(', '))
            }
          }
        }
      })
      return fn(ctx, req, res)
    })
  } catch (err: unknown) {
    ctx.error('Failed to process payment request', { err })
    res.status(500).end()
  }
}

export async function createServer (ctx: MeasureContext, config: Config): Promise<{ app: Express, close: () => void }> {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  const childLogger = ctx.logger.childLogger?.('requests', { enableConsole: 'true' })
  const requests = ctx.newChild('requests', {}, { logger: childLogger, span: false })
  class LogStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  app.use(morgan('short', { stream: new LogStream() }))

  const serviceToken = generateToken(systemAccountUuid, undefined, { service: 'billing' })

  // Initialize payment provider if configured
  let provider: PaymentProvider | undefined

  if (
    config.PolarAccessToken !== undefined &&
    config.PolarWebhookSecret !== undefined &&
    config.PolarSubscriptionPlans !== undefined
  ) {
    try {
      provider = PaymentProviderFactory.getInstance().create('polar', {
        accessToken: config.PolarAccessToken,
        webhookSecret: config.PolarWebhookSecret,
        subscriptionPlans: config.PolarSubscriptionPlans
      })

      if (provider !== undefined) {
        // Register provider-specific endpoints (e.g., webhooks)
        provider.registerWebhookEndpoints(app, ctx, config.AccountsUrl, serviceToken)

        ctx.info('polar.sh payment provider initialized successfully')
      }
    } catch (err) {
      ctx.error('Failed to initialize payment provider polar.sh', { err })
    }
  }

  // ============ Generic Payment Service Endpoints ============
  // These endpoints are provider-agnostic and work with any payment provider

  /**
   * POST /api/v1/subscriptions/:workspace/subscribe
   * Create a subscription for a workspace
   * Body: SubscribeRequest { type: 'tier' | 'support', plan: string, ... }
   */
  app.post(
    '/api/v1/subscriptions/:workspace/subscribe',
    withToken,
    withOwner,
    (req: RequestWithAuth, res: Response) => {
      if (provider === undefined || serviceToken === undefined) {
        res.status(503).json({ error: 'Payment provider is not configured' })
        return
      }

      void handleRequest(
        ctx,
        'create-subscription',
        async (ctx) => {
          const workspaceUuid = req.token?.workspace
          const accountUuid = req.token?.account
          const request = req.body as SubscribeRequest

          if (accountUuid === undefined) {
            res.status(401).json({ error: 'Missing account in token' })
            return
          }

          if (workspaceUuid === undefined) {
            res.status(401).json({ error: 'Missing workspace in token' })
            return
          }

          if (request.type === undefined || request.plan === undefined) {
            res.status(400).json({ error: 'Missing required fields: type, plan' })
            return
          }

          const subscription = await provider.createSubscription(ctx, request, workspaceUuid, accountUuid)
          res.status(200).json(subscription)
        },
        req,
        res,
        () => {}
      )
    }
  )

  /**
   * POST /api/v1/subscriptions/:subscriptionId/cancel
   * Cancel a subscription
   * Authorization: Only workspace owner/admin can cancel
   */
  app.post(
    '/api/v1/subscriptions/:subscriptionId/cancel',
    withToken,
    withOwner,
    (req: RequestWithAuth, res: Response) => {
      if (provider === undefined) {
        res.status(503).json({ error: 'Payment provider is not configured' })
        return
      }

      void handleRequest(
        ctx,
        'cancel-subscription',
        async (ctx) => {
          const subscriptionId = req.params.subscriptionId
          await provider.cancelSubscription(ctx, subscriptionId)
          res.status(200).json({ message: 'Subscription cancellation requested' })
        },
        req,
        res,
        () => {}
      )
    }
  )

  /**
   * GET /api/v1/subscriptions/:subscriptionId
   * Get subscription details
   * Authorization: Only admin can view billing details directly from provider
   * (Subscription contains sensitive pricing and payment information)
   */
  app.get('/api/v1/subscriptions/:subscriptionId', withToken, withAdmin, (req: RequestWithAuth, res: Response) => {
    if (provider === undefined) {
      res.status(503).json({ error: 'Payment provider is not configured' })
      return
    }

    void handleRequest(
      ctx,
      'get-subscription',
      async (ctx) => {
        const subscriptionId = req.params.subscriptionId
        const subscription = await provider.getSubscription(ctx, subscriptionId)
        res.status(200).json(subscription)
      },
      req,
      res,
      () => {}
    )
  })

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' })
  })

  return {
    app,
    close: () => {}
  }
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Service started at ${host ?? '*'}:${port}`)
  }

  const server = host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 1000
  server.headersTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 2000

  return server
}
