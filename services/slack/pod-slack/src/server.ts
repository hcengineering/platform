//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { createServer, type Server } from 'http'
import config from './config'
import { postToSlack } from './bot'

/**
 * Minimal HTTP server.
 *   GET  /health           -> liveness probe
 *   POST /notify           -> { "channel": "...", "text": "..." } posts to Slack
 * This lets other Huly services push notifications to Slack over HTTP.
 */
export function startServer (): Server {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: config.ServiceId }))
      return
    }

    if (req.method === 'POST' && req.url === '/notify') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        void (async () => {
          try {
            const { channel, text } = JSON.parse(body || '{}')
            const ts = await postToSlack(channel ?? '', String(text ?? ''))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, ts }))
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
        })()
      })
      return
    }

    res.writeHead(404)
    res.end()
  })

  server.listen(config.Port, () => {
    console.log(`[slack] HTTP server listening on :${config.Port}`)
  })
  return server
}
