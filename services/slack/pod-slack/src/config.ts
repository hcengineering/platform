//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

export interface Config {
  /** HTTP port Bolt listens on (serves /slack/install, /slack/oauth_redirect, /slack/events). */
  Port: number
  /** Slack app Client ID (Basic Information -> App Credentials). */
  SlackClientId: string
  /** Slack app Client Secret. */
  SlackClientSecret: string
  /** Slack signing secret (verifies inbound requests). */
  SlackSigningSecret: string
  /** Random secret used to sign the OAuth state parameter. */
  SlackStateSecret: string
  /** Public HTTPS base URL where this service is reachable (e.g. https://slack.company.com). */
  PublicUrl: string
  /** Channel id where task-completion / update notifications are posted. */
  NotifyChannel: string
  /** File path where Slack installations (per-team tokens) are persisted. */
  InstallStorePath: string
  /** Emoji name (no colons) that creates a task for a message when reacted. */
  TaskTriggerEmoji: string

  /** Huly instance URL the api-client connects to (front). */
  HulyUrl: string
  /** Huly service-account email. */
  HulyEmail: string
  /** Huly service-account password. */
  HulyPassword: string
  /** Huly workspace slug tasks are created in. */
  HulyWorkspace: string

  /** Service identifier used in logs. */
  ServiceId: string
}

const parseNumber = (str: string | undefined): number | undefined =>
  str !== undefined && str !== '' ? Number(str) : undefined

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4025,
    SlackClientId: process.env.SLACK_CLIENT_ID,
    SlackClientSecret: process.env.SLACK_CLIENT_SECRET,
    SlackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    SlackStateSecret: process.env.SLACK_STATE_SECRET,
    PublicUrl: process.env.PUBLIC_URL ?? '',
    NotifyChannel: process.env.SLACK_NOTIFY_CHANNEL ?? '',
    InstallStorePath: process.env.INSTALL_STORE_PATH ?? './installations.json',
    TaskTriggerEmoji: (process.env.TASK_TRIGGER_EMOJI ?? 'ticket').replace(/:/g, ''),
    HulyUrl: process.env.HULY_URL ?? 'http://huly.local:8087',
    HulyEmail: process.env.HULY_EMAIL ?? '',
    HulyPassword: process.env.HULY_PASSWORD ?? '',
    HulyWorkspace: process.env.HULY_WORKSPACE ?? '',
    ServiceId: process.env.SERVICE_ID ?? 'slack'
  }

  const required: Array<keyof Config> = [
    'SlackClientId',
    'SlackClientSecret',
    'SlackSigningSecret',
    'SlackStateSecret'
  ]
  const missing = required.filter((key) => params[key] === undefined || params[key] === '')
  if (missing.length > 0) {
    throw Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return params as Config
})()

export default config
