//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { App, LogLevel } from '@slack/bolt'
import { WebClient } from '@slack/web-api'
import config from './config'
import { createTask, attachFile, isConnected } from './huly'
import { fileInstallationStore, firstBotToken } from './installationStore'

let app: App | undefined

const SLACK_SCOPES = [
  'app_mentions:read',
  'channels:history',
  'channels:read',
  'groups:history',
  'chat:write',
  'commands',
  'reactions:read',
  'reactions:write',
  'files:read'
]

/**
 * Turn a Slack message into a Huly task: eyes reaction, create task, attach
 * any images, confirm in-thread, and notify the dedicated channel.
 * `ts` is the message the task is created for (top-level msg, or a thread parent).
 */
async function handleAsTask (
  client: any,
  channel: string,
  reactTs: string,
  replyThreadTs: string,
  user: string,
  text: string,
  files: any[]
): Promise<void> {
  // Put the eyes reaction on the message that triggered us.
  try {
    await client.reactions.add({ channel, timestamp: reactTs, name: 'eyes' })
  } catch (err) {
    console.warn('[slack] could not add reaction:', String(err))
  }

  const ts = replyThreadTs

  if (!isConnected()) {
    await client.chat.postMessage({ channel, thread_ts: ts, text: ':warning: Not connected to Huly — check the service config.' })
    return
  }

  const title = text.trim() !== '' ? text.trim() : 'Task from Slack'

  try {
    const t = await createTask(title)

    let attached = 0
    for (const f of files) {
      const url = f.url_private_download ?? f.url_private
      if (url === undefined) continue
      try {
        const token = (client as any).token as string | undefined
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
        const ctype = resp.headers.get('content-type') ?? ''
        if (ctype.includes('text/html')) {
          console.warn('[slack] file download returned HTML — bot likely missing the files:read scope')
          await client.chat.postMessage({ channel, thread_ts: ts, text: ":warning: I couldn't read that file — the bot needs the *files:read* scope (add it and reinstall)." })
          continue
        }
        const buf = Buffer.from(await resp.arrayBuffer())
        await attachFile(t, buf, f.name ?? 'file', f.mimetype ?? 'application/octet-stream', f.size ?? buf.length)
        attached++
      } catch (e) {
        console.warn('[slack] attachment failed:', String(e))
      }
    }

    const suffix = attached > 0 ? ` _(+${attached} attachment${attached > 1 ? 's' : ''})_` : ''
    await client.chat.postMessage({ channel, thread_ts: ts, text: `:white_check_mark: Created task *${t.identifier}* — _${t.title}_${suffix}` })

    if (config.NotifyChannel !== '') {
      await postToSlack(config.NotifyChannel, `:new: *${t.identifier}* created by <@${user}>: _${t.title}_${suffix}`)
    }
  } catch (err) {
    console.error('[slack] task creation failed:', err)
    await client.chat.postMessage({ channel, thread_ts: ts, text: `:x: Couldn't create the task: ${String(err)}` })
  }
}

/** Fetch a single message by ts, whether it's a channel message or a thread reply. */
async function fetchMessage (client: any, channel: string, ts: string): Promise<any | undefined> {
  try {
    const h = await client.conversations.history({ channel, latest: ts, oldest: ts, inclusive: true, limit: 1 })
    const found = (h.messages ?? []).find((x: any) => x.ts === ts)
    if (found !== undefined) return found
  } catch (e) {
    console.warn('[slack] history lookup failed:', String(e))
  }
  try {
    const r = await client.conversations.replies({ channel, ts })
    return (r.messages ?? []).find((x: any) => x.ts === ts)
  } catch (e) {
    console.warn('[slack] replies lookup failed:', String(e))
  }
  return undefined
}

/**
 * Create and start the Slack Bolt app in OAuth mode over HTTP (Events API).
 * Install:   GET  {PublicUrl}/slack/install         ("Connect / Add to Slack")
 * Callback:  GET  {PublicUrl}/slack/oauth_redirect   (OAuth redirect URL)
 * Events:    POST {PublicUrl}/slack/events           (Events + interactivity)
 * The bot token for each workspace is obtained during install and stored via
 * the installation store — nothing is hardcoded.
 */
export async function startBot (): Promise<App> {
  app = new App({
    signingSecret: config.SlackSigningSecret,
    clientId: config.SlackClientId,
    clientSecret: config.SlackClientSecret,
    stateSecret: config.SlackStateSecret,
    scopes: SLACK_SCOPES,
    installationStore: fileInstallationStore,
    installerOptions: {
      directInstall: true, // /slack/install redirects straight to Slack's consent screen
      callbackOptions: {
        // Shown after the user clicks "Allow" — confirms and links back to Huly.
        success: (installation, _options, _req, res) => {
          const team = installation.team?.name ?? 'your workspace'
          const back = config.HulyUrl !== '' ? config.HulyUrl : '#'
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            `<!doctype html><html><head><meta charset="utf-8"><title>Connected</title></head>` +
            `<body style="font-family:sans-serif;text-align:center;padding:64px">` +
            `<h2>✅ Slack connected</h2>` +
            `<p><b>${team}</b> is now linked to Huly. You can close this tab.</p>` +
            `<p><a href="${back}" style="display:inline-block;margin-top:16px;padding:10px 18px;` +
            `background:#4a154b;color:#fff;border-radius:6px;text-decoration:none">Return to Huly</a></p>` +
            `</body></html>`
          )
        },
        failure: (error, _options, _req, res) => {
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(
            `<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:64px">` +
            `<h2>❌ Slack connection failed</h2><p>${String(error)}</p></body></html>`
          )
        }
      }
    },
    logLevel: LogLevel.INFO,
    customRoutes: [
      {
        path: '/health',
        method: ['GET'],
        handler: (_req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', service: config.ServiceId }))
        }
      }
    ]
  })

  app.message(async ({ message, client }) => {
    const subtype = (message as any).subtype
    // Skip the bot's own messages and non-user events (edits, deletes, joins),
    // but allow "file_share" so image/file posts work.
    if ((message as any).bot_id !== undefined) return
    if (subtype !== undefined && subtype !== 'file_share') return
    const m = message as any

    // Never turn the notifications channel's own messages into tasks.
    if (config.NotifyChannel !== '' && m.channel === config.NotifyChannel) return

    const text: string = m.text ?? ''
    const isReply = m.thread_ts !== undefined && m.thread_ts !== m.ts

    if (!isReply) {
      // Top-level message -> always create a task from it (no keyword needed).
      await handleAsTask(client, m.channel, m.ts, m.ts, m.user ?? 'unknown', text, m.files ?? [])
      return
    }

    // Thread reply -> only act if it mentions "huly"; task for the message ABOVE.
    if (!/\bhuly\b/i.test(text)) return
    try {
      const res: any = await client.conversations.replies({ channel: m.channel, ts: m.thread_ts })
      const msgs: any[] = res.messages ?? []
      const idx = msgs.findIndex((x) => x.ts === m.ts)
      const above = idx > 0 ? msgs[idx - 1] : msgs[0]
      if (above === undefined) return
      await handleAsTask(
        client,
        m.channel,
        m.ts, // eyes on the comment that mentioned huly
        m.thread_ts, // confirmation posts in the thread
        above.user ?? m.user ?? 'unknown',
        above.text ?? '',
        above.files ?? []
      )
    } catch (e) {
      console.warn('[slack] could not fetch thread messages:', String(e))
    }
  })

  // React to ANY message with the trigger emoji -> create a task for that message.
  app.event('reaction_added', async ({ event, client }) => {
    if (event.reaction !== config.TaskTriggerEmoji) return
    if ((event.item as any)?.type !== 'message') return
    const channel = (event.item as any).channel
    const ts = (event.item as any).ts
    if (config.NotifyChannel !== '' && channel === config.NotifyChannel) return

    const msg = await fetchMessage(client, channel, ts)
    if (msg === undefined) {
      console.warn('[slack] could not fetch reacted message')
      return
    }
    const replyTs = msg.thread_ts ?? ts
    await handleAsTask(client, channel, ts, replyTs, msg.user ?? event.user, msg.text ?? '', msg.files ?? [])
  })

  await app.start(config.Port)
  console.log(`[slack] Bolt app (OAuth) listening on :${config.Port}`)
  console.log(`[slack] install at ${config.PublicUrl !== '' ? config.PublicUrl : `http://localhost:${config.Port}`}/slack/install`)
  return app
}

/**
 * Post a message into Slack from Huly (e.g. notifications). In OAuth mode there
 * is no single default token, so we use the stored installation's bot token.
 * Returns the message ts on success.
 */
export async function postToSlack (channel: string, text: string): Promise<string | undefined> {
  const target = channel !== '' ? channel : config.NotifyChannel
  if (target === '') return undefined
  const token = firstBotToken()
  if (token === undefined) {
    console.warn('[slack] postToSlack: no installation yet — connect a workspace first')
    return undefined
  }
  const res = await new WebClient(token).chat.postMessage({ channel: target, text })
  return res.ts as string | undefined
}

export async function stopBot (): Promise<void> {
  await app?.stop()
  app = undefined
}
