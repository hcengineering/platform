//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { startBot, stopBot, postToSlack } from './bot'
import { startServer } from './server'
import { connectHuly, closeHuly, startTaskWatcher, isConnected } from './huly'
import config from './config'

export async function start (): Promise<void> {
  const server = startServer()
  await startBot()

  // Connect to Huly for task creation.
  try {
    await connectHuly()
  } catch (err) {
    console.error('[huly] connection failed — task creation will be unavailable:', String(err))
  }

  // Watch for task assignments and post to the notification channel.
  let stopWatcher: () => void = () => {}
  if (isConnected() && config.NotifyChannel !== '') {
    stopWatcher = startTaskWatcher(async (text) => {
      await postToSlack(config.NotifyChannel, text)
    })
  } else if (config.NotifyChannel === '') {
    console.warn('[slack] SLACK_NOTIFY_CHANNEL not set — assignment notifications disabled')
  }

  const shutdown = (): void => {
    console.log('[slack] shutting down...')
    stopWatcher()
    server.close()
    void Promise.allSettled([stopBot(), closeHuly()]).finally(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
