//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

export interface Config {
  /** HTTP port for the health-check / notification endpoint. */
  Port: number
  /** Slack bot token (xoxb-...). Bot User OAuth Token. */
  SlackBotToken: string
  /** Slack signing secret (used to verify HTTP requests; required by Bolt even in Socket Mode). */
  SlackSigningSecret: string
  /** Slack app-level token (xapp-...) — required for Socket Mode. */
  SlackAppToken: string
  /** Default Slack channel id to post Huly notifications to. */
  DefaultChannel: string
  /** Slack channel id where task-completion notifications are posted. */
  NotifyChannel: string
  /** Huly accounts service URL, e.g. http://huly.local:3000 (used by Huly integration hooks). */
  AccountsUrl: string
  /** Huly instance URL the api-client connects to (front), e.g. http://huly.local:8087 */
  HulyUrl: string
  /** Huly login email for the service account. */
  HulyEmail: string
  /** Huly login password for the service account. */
  HulyPassword: string
  /** Huly workspace name (from the URL: /workbench/<workspace>). */
  HulyWorkspace: string
  /** Emoji name (without colons) that, when added to a message, creates a task for it. */
  TaskTriggerEmoji: string
  /** Service identifier used in logs / queue. */
  ServiceId: string
}

const parseNumber = (str: string | undefined): number | undefined =>
  str !== undefined && str !== '' ? Number(str) : undefined

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4025,
    SlackBotToken: process.env.SLACK_BOT_TOKEN,
    SlackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    SlackAppToken: process.env.SLACK_APP_TOKEN,
    DefaultChannel: process.env.SLACK_DEFAULT_CHANNEL ?? '',
    NotifyChannel: process.env.SLACK_NOTIFY_CHANNEL ?? '',
    AccountsUrl: process.env.ACCOUNTS_URL ?? 'http://huly.local:3000',
    HulyUrl: process.env.HULY_URL ?? 'http://huly.local:8087',
    HulyEmail: process.env.HULY_EMAIL ?? '',
    HulyPassword: process.env.HULY_PASSWORD ?? '',
    HulyWorkspace: process.env.HULY_WORKSPACE ?? '',
    TaskTriggerEmoji: (process.env.TASK_TRIGGER_EMOJI ?? 'ticket').replace(/:/g, ''),
    ServiceId: process.env.SERVICE_ID ?? 'slack'
  }

  // Only these are strictly required for the bot to start.
  const required: Array<keyof Config> = ['SlackBotToken', 'SlackSigningSecret', 'SlackAppToken']
  const missing = required.filter((key) => params[key] === undefined || params[key] === '')

  if (missing.length > 0) {
    throw Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return params as Config
})()

export default config
