import { ScreenSource } from '@hcengineering/love'

/**
 * @public
 */
export interface Config {
  ACCOUNTS_URL: string
  COLLABORATOR?: string
  COLLABORATOR_URL: string
  FRONT_URL: string
  FILES_URL: string
  UPLOAD_URL: string
  MODEL_VERSION?: string
  VERSION?: string
  TELEGRAM_URL: string
  GMAIL_URL: string
  CALENDAR_URL: string
  REKONI_URL: string
  INITIAL_URL: string
  GITHUB_APP: string
  GITHUB_CLIENTID: string
  GITHUB_URL: string
  CONFIG_URL: string
  LOVE_ENDPOINT?: string
  LIVEKIT_WS?: string
  SIGN_URL?: string
  PRINT_URL?: string
  PUSH_PUBLIC_KEY: string
  ANALYTICS_COLLECTOR_URL?: string
  AI_URL?: string
  DISABLE_SIGNUP?: string
  DEFAULT_LOGIN_METHOD?: string
  BRANDING_URL?: string
  PREVIEW_CONFIG: string
  UPLOAD_CONFIG: string
  DESKTOP_UPDATES_URL?: string
  DESKTOP_UPDATES_CHANNEL?: string
  TELEGRAM_BOT_URL?: string

  STATS_URL?: string
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
