//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { App, LogLevel } from '@slack/bolt'
import config from './config'
import { createTask, attachFile, isConnected } from './huly'

let app: App | undefined

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
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${config.SlackBotToken}` } })
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
 * Create and start the Slack Bolt app in Socket Mode.
 * Socket Mode opens an outbound websocket to Slack, so it works for local
 * development behind huly.local without any public URL or tunnel.
 */
export async function startBot (): Promise<App> {
  app = new App({
    token: config.SlackBotToken,
    signingSecret: config.SlackSigningSecret,
    appToken: config.SlackAppToken,
    socketMode: true,
    logLevel: LogLevel.INFO
  })

  // A message containing "huly" -> react with eyes and create a task from it.
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
    if (!/\bhuly\b/i.test(text)) return

    const isReply = m.thread_ts !== undefined && m.thread_ts !== m.ts

    if (!isReply) {
      // Top-level "huly ..." -> task from this message (minus the word "huly").
      const title = text.replace(/\bhuly\b/i, '').trim()
      await handleAsTask(client, m.channel, m.ts, m.ts, m.user ?? 'unknown', title, m.files ?? [])
      return
    }

    // "huly" in a thread reply -> task for the message directly ABOVE this comment.
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

  await app.start()
  console.log('[slack] Bolt app started in Socket Mode')
  return app
}

/**
 * Post a message into Slack from Huly (e.g. notifications).
 * Returns the message ts on success.
 */
export async function postToSlack (channel: string, text: string): Promise<string | undefined> {
  if (app === undefined) throw Error('Slack app not started')
  const target = channel !== '' ? channel : config.DefaultChannel
  if (target === '') {
    console.warn('[slack] postToSlack called with no channel and no SLACK_DEFAULT_CHANNEL')
    return undefined
  }
  const res = await app.client.chat.postMessage({ channel: target, text })
  return res.ts
}

export async function stopBot (): Promise<void> {
  await app?.stop()
  app = undefined
}
