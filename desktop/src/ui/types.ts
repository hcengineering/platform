import { DownloadItem } from '@hcengineering/desktop-downloads'
import { ScreenSource } from '@hcengineering/love'
import { Plugin } from '@hcengineering/platform'
import { Ref, Class, Doc } from '@hcengineering/core'
import { IpcRendererEvent } from 'electron'

export interface Config {
  ACCOUNTS_URL: string
  AI_URL?: string
  ANALYTICS_COLLECTOR_URL?: string
  POSTHOG_API_KEY?: string
  POSTHOG_HOST?: string
  SENTRY_DSN?: string
  BRANDING_URL?: string
  CALENDAR_URL: string
  COLLABORATOR?: string
  COLLABORATOR_URL: string
  CONFIG_URL: string
  DESKTOP_UPDATES_CHANNEL?: string
  DESKTOP_UPDATES_URL?: string
  DISABLE_SIGNUP?: string
  HIDE_LOCAL_LOGIN?: string
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
  MODEL_VERSION: string
  PRESENCE_URL?: string
  PREVIEW_CONFIG?: string
  PRINT_URL?: string
  PUSH_PUBLIC_KEY: string
  REKONI_URL: string
  SIGN_URL?: string
  STATS_URL?: string
  TELEGRAM_BOT_URL?: string
  TELEGRAM_URL: string
  UPLOAD_CONFIG: string
  UPLOAD_URL: string
  VERSION: string
  STREAM_URL?: string
  BACKUP_URL?: string
  PUBLIC_SCHEDULE_URL?: string
  CALDAV_SERVER_URL?: string
  EXPORT_URL?: string
  MAIL_URL?: string
  COMMUNICATION_API_ENABLED?: string
  BILLING_URL?: string
  PASSWORD_STRICTNESS?: 'very_strict' | 'strict' | 'normal' | 'none'
  EXCLUDED_APPLICATIONS_FOR_ANONYMOUS?: string
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

export const CommandOpenSettings = 'open-settings' as const
export const CommandOpenInbox = 'open-inbox' as const
export const CommandOpenOffice = 'open-office' as const
export const CommandOpenPlanner = 'open-planner' as const
export const CommandSelectWorkspace = 'select-workspace' as const
export const CommandLogout = 'logout' as const
export const CommandOpenApplication = 'open-application' as const

export type Command = 
  typeof CommandOpenSettings | 
  typeof CommandOpenInbox | 
  typeof CommandOpenOffice | 
  typeof CommandOpenPlanner | 
  typeof CommandSelectWorkspace | 
  typeof CommandLogout |
  typeof CommandOpenApplication

export interface NotificationParams {
  title: string
  body: string
  silent: boolean
  application: Plugin
  cardId?: string
  objectId?: Ref<Doc>
  objectClass?: Ref<Class<Doc>>
}

export const MenuBarActions = ['settings', 'select-workspace', 'logout', 'exit', 'undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'select-all', 'reload', 'force-reload', 'toggle-devtools'
  , 'zoom-in', 'zoom-out', 'restore-size', 'toggle-fullscreen'] as const;

export type MenuBarAction = typeof MenuBarActions[number];

export interface JumpListSpares {
  applications: LaunchApplication[],
  settingsLabel: string,
  inboxLabel: string,
}

export interface LaunchApplication {
  title: string
  id: string
  alias: string
}

export interface IPCMainExposed {
  setBadge: (badge: number) => void
  setTitle: (title: string) => void
  config: () => Promise<Config>
  branding: () => Promise<Branding>
  on: (event: string, op: (channel: any, args: any[]) => void) => void
  handleDeepLink: (callback: (url: string) => void) => void
  handleNotificationNavigation: (callback: (notificationParams: NotificationParams) => void) => void
  handleUpdateDownloadProgress: (callback: (progress: number) => void) => void
  setFrontCookie: (host: string, name: string, value: string) => Promise<void>
  dockBounce: () => void
  sendNotification: (notififationParams: NotificationParams) => void
  getScreenAccess: () => Promise<boolean>
  getScreenSources: () => Promise<ScreenSource[]>
  handleAuth: (callback: (token: string) => void) => void
  handleDownloadItem: (callback: (item: DownloadItem) => void) => void

  cancelBackup: () => void
  startBackup: (token: string, endpoint: string, workspace: string) => void

  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  onWindowStateChange: (callback: (event: IpcRendererEvent, newState: string) => void) => void
  onWindowFocusLoss: (callback: () => void) => void
  
  isOsUsingDarkTheme: () => Promise<boolean>
  executeMenuBarAction: (action: MenuBarAction) => void

  rebuildJumpList: (spares: JumpListSpares) => void
}
