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

import { Token } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { AnalyticEvent, AnalyticEventType } from '@hcengineering/analytics-collector'
import { extractToken } from '@hcengineering/server-client'
import config from './config'
import { ApiError } from './error'
import { getGeoLocationFromIp, getClientIp, geoFieldMapping, getAllPossibleIps } from './geoip'

type AsyncRequestHandler = (req: Request, res: Response, token: Token, next: NextFunction) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req.headers)
  if (token === undefined) {
    throw new ApiError(401)
  }
  try {
    await fn(req, res, token, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void handleRequest(fn, req, res, next)
}

function isContentValid (body: any[]): boolean {
  return !body.some((it) => {
    if (it == null) return true
    if (!('event' in it)) return true
    if (!('properties' in it)) return true
    if (!('timestamp' in it)) return true

    const eventSize = JSON.stringify(it).length
    if (eventSize > 1024 * 1024) {
      // maximum 1MB per event
      console.warn(`Event too large: ${eventSize} bytes, event: ${it.event}`)
      return true
    }

    return false
  })
}

function getRecordsByType (event: AnalyticEvent): Record<string, any> {
  switch (event.event as AnalyticEventType) {
    case AnalyticEventType.SetTag:
      return {
        event: '$set',
        event_type: 'set_property'
      }
    case AnalyticEventType.SetUser:
      return {
        event: '$identify',
        event_type: 'identify'
      }
    case AnalyticEventType.SetGroup:
      return {
        event: '$groupidentify',
        event_type: 'groupidentify'
      }
    case AnalyticEventType.SetAlias:
      return {
        event: '$create_alias',
        $alias: event.properties.alias,
        event_type: 'create_alias'
      }
    case AnalyticEventType.Navigation:
      return {
        event: '$pageview',
        event_type: 'pageview'
      }
    case AnalyticEventType.Error:
      return {
        event: '$exception',
        event_type: 'exception'
      }
    case AnalyticEventType.CustomEvent:
      return {
        event:
          typeof event.properties.event === 'string' && event.properties.event.length > 0
            ? event.properties.event
            : 'custom_event'
      }
    default:
      return {
        event: typeof event.event === 'string' && event.event.length > 0 ? event.event : 'unknown_event'
      }
  }
}

async function preparePostHogEvent (event: AnalyticEvent, req: Request): Promise<Record<string, any>> {
  let errorMessage = 'Unknown error'
  let errorType = 'Error'

  if (event.event === AnalyticEventType.Error) {
    if (event.properties.error_message != null && String(event.properties.error_message).trim() !== '') {
      errorMessage = String(event.properties.error_message).trim()
    } else if (event.properties.$error != null && String(event.properties.$error).trim() !== '') {
      errorMessage = String(event.properties.$error).trim()
    } else if (event.properties.message != null && String(event.properties.message).trim() !== '') {
      errorMessage = String(event.properties.message).trim()
    } else if (event.properties.error != null && String(event.properties.error).trim() !== '') {
      errorMessage = String(event.properties.error).trim()
    }

    if (event.properties.error_type != null && String(event.properties.error_type).trim() !== '') {
      errorType = String(event.properties.error_type).trim()
    } else if (event.properties.$error_type != null && String(event.properties.$error_type).trim() !== '') {
      errorType = String(event.properties.$error_type).trim()
    }
  }

  const baseEvent: Record<string, any> = event.properties
  const recordsByType = getRecordsByType(event)
  for (const [key, value] of Object.entries(recordsByType)) {
    baseEvent[key] = value
  }

  // Add IP address
  baseEvent.$ip = getClientIp(req)
  baseEvent.timestamp = event.properties.$timestamp ?? new Date(event.timestamp).toISOString()

  // Add all possible IP addresses for debugging
  const allIps = getAllPossibleIps(req)
  for (const [key, value] of Object.entries(allIps)) {
    if (value !== null) {
      baseEvent[key] = value
    }
  }

  // Add geolocation data
  const geoData = await getGeoLocationFromIp(req)

  for (const [sourceField, targetField] of Object.entries(geoFieldMapping)) {
    baseEvent[targetField] = geoData[sourceField as keyof typeof geoData]
  }

  if (event.event === AnalyticEventType.SetAlias && typeof event.properties.alias === 'string') {
    const aliasProperties: Record<string, any> = {
      alias: event.properties.alias,
      $anon_distinct_id: event.distinct_id,
      ...baseEvent
    }
    const aliasEvent: Record<string, any> = {
      event: '$create_alias',
      distinct_id: event.distinct_id,
      properties: aliasProperties,
      timestamp: new Date(event.timestamp).toISOString()
    }
    aliasEvent.properties.$original_timestamp = event.timestamp

    if ('event' in aliasEvent.properties) {
      aliasEvent.properties.$original_event_type = aliasEvent.properties.event
      delete aliasEvent.properties.event
    }

    return aliasEvent
  }

  if (event.event === AnalyticEventType.Error) {
    if (baseEvent.$exception_list == null && baseEvent.$exception == null) {
      const exceptionList = []

      const exceptionData: Record<string, any> = {
        type: errorType !== '' ? errorType : 'Error',
        value: errorMessage,
        message: errorMessage
      }

      baseEvent.$exception_message = errorMessage
      baseEvent.$exception_type = errorType

      exceptionList.push(exceptionData)

      baseEvent.$exception_list = exceptionList

      delete baseEvent.$error
      delete baseEvent.$error_type
      delete baseEvent.$error_stack
      delete baseEvent.error
      delete baseEvent.error_message
      delete baseEvent.error_type
      delete baseEvent.error_stack
      delete baseEvent.message
      delete baseEvent.stack
      delete baseEvent.stackTrace
    }
  }

  const eventName = recordsByType.event ?? event.event ?? 'unknown_event'

  const regularEventForPostHog: Record<string, any> = {
    event: eventName,
    distinct_id: event.distinct_id,
    properties: { ...baseEvent },
    timestamp: new Date(event.timestamp).toISOString()
  }
  regularEventForPostHog.properties.$original_timestamp = event.timestamp

  if ('event' in regularEventForPostHog.properties) {
    regularEventForPostHog.properties.$original_event_type = regularEventForPostHog.properties.event
    delete regularEventForPostHog.properties.event
  }

  if (
    typeof event.properties.$anonymous_id === 'string' &&
    event.properties.$anonymous_id !== event.distinct_id &&
    event.distinct_id !== event.properties.$anonymous_id
  ) {
    regularEventForPostHog.properties.$anon_distinct_id = event.properties.$anonymous_id
  }

  return regularEventForPostHog
}

export function createServer (): Express {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: config.MaxPayloadSize }))

  app.post(
    '/collect',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || !Array.isArray(req.body)) {
        throw new ApiError(400)
      }

      if (!isContentValid(req.body)) {
        throw new ApiError(400)
      }

      const events: AnalyticEvent[] = req.body
      const payloadSize = JSON.stringify(req.body).length

      console.log(`Received batch: ${events.length} events, ${payloadSize} bytes`)

      const posthogEvents = await Promise.all(
        events.map(async (event) => {
          return await preparePostHogEvent(event, req)
        })
      )

      const payload = {
        api_key: config.PostHogAPI,
        batch: posthogEvents.reverse()
      }

      const posthogPayloadSize = JSON.stringify(payload).length
      console.log(`Sending to PostHog: ${posthogEvents.length} events, ${posthogPayloadSize} bytes`)

      try {
        const response = await fetch(`${config.PostHogHost}/batch/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Analytics-Collector/1.0'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`PostHog API error: ${response.status} ${response.statusText}`, errorText)
        } else {
          console.log(`Successfully sent ${posthogEvents.length} events to PostHog`)
        }
      } catch (error) {
        console.error('Failed to send events to PostHog:', error)
      }

      res.status(200)
      res.json({
        received: events.length,
        processed: posthogEvents.length,
        payloadSize,
        timestamp: new Date().toISOString()
      })
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.log(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).send(err.message?.length > 0 ? { message: err.message } : err)
  })

  return app
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Analytics collector service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
