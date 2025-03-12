import { ScreenSource } from '@hcengineering/love'

/**
 * @public
 */
export interface Config {
  ACCOUNTS_URL: string
  AI_URL?: string
  ANALYTICS_COLLECTOR_URL?: string
  BRANDING_URL?: string
  CALENDAR_URL: string
  COLLABORATOR?: string
  COLLABORATOR_URL: string
  CONFIG_URL: string
  DESKTOP_UPDATES_CHANNEL?: string
  DESKTOP_UPDATES_URL?: string
  DISABLE_SIGNUP?: string
  FILES_URL: string
  FRONT_URL: string
  GITHUB_APP: string
  GITHUB_CLIENTID: string
  GITHUB_URL: string
  GMAIL_URL: string
  INITIAL_URL: string
  LINK_PREVIEW_URL?: string
  LIVEKIT_WS?: string
  LOVE_ENDPOINT?: string
  MODEL_VERSION?: string
  PRESENCE_URL?: string
  PREVIEW_CONFIG: string
  PRINT_URL?: string
  PUSH_PUBLIC_KEY: string
  REKONI_URL: string
  SIGN_URL?: string
  STATS_URL?: string
  TELEGRAM_BOT_URL?: string
  TELEGRAM_URL: string
  UPLOAD_CONFIG: string
  UPLOAD_URL: string
  VERSION?: string
  STREAM_URL?: string
  BACKUP_URL?: string
  PUBLIC_SCHEDULE_URL?: string
  EXPORT_URL?: string
}

export interface Branding {
  title?: string
  links?: {
    rel: string
    href: string
    type?: string
    sizes?: string
  }[]
  languages?: string
  lastNameFirst?: string
  defaultLanguage?: string
  defaultApplication?: string
  defaultSpace?: string
  defaultSpecial?: string
  initWorkspace?: string
}

export type BrandingMap = Record<string, Branding>

/**
 * @public
 */
export interface NotificationParams {
  title: string
  body: string
  silent: boolean
}

/**
 * @public
 */
export interface IPCMainExposed {
  setBadge: (badge: number) => void
  setTitle: (title: string) => void
  config: () => Promise<Config>
  branding: () => Promise<Branding>
  on: (event: string, op: (channel: any, args: any[]) => void) => void
  handleDeepLink: (callback: (url: string) => void) => void
  handleNotificationNavigation: (callback: () => void) => void
  handleUpdateDownloadProgress: (callback: (progress: number) => void) => void
  setFrontCookie: (host: string, name: string, value: string) => Promise<void>
  dockBounce: () => void
  sendNotification: (notififationParams: NotificationParams) => void
  getScreenAccess: () => Promise<boolean>
  getScreenSources: () => Promise<ScreenSource[]>
  handleAuth: (callback: (token: string) => void) => void

  cancelBackup: () => void
  startBackup: (token: string, endpoint: string, workspace: string) => void
}
