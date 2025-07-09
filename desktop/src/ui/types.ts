import { ScreenSource } from '@hcengineering/love'
import { Plugin } from '@hcengineering/platform'
import { IpcRendererEvent } from 'electron'

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
  CALDAV_SERVER_URL?: string
  EXPORT_URL?: string
  MAIL_URL?: string
  COMMUNICATION_API_ENABLED?: string
  BILLING_URL?: string
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

export const StandardMenuCommandOpenSettings = 'open-settings' as const
export const StandardMenuCommandSelectWorkspace = 'select-workspace' as const
export const StandardMenuCommandLogout = 'logout' as const
export type StandardMenuCommand = typeof StandardMenuCommandOpenSettings | typeof StandardMenuCommandSelectWorkspace | typeof StandardMenuCommandLogout

export interface NotificationParams {
  title: string
  body: string
  silent: boolean
  application: Plugin
}

const MenuBarActions = ['settings', 'select-workspace', 'logout', 'exit', 'undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'select-all', 'reload', 'force-reload', 'toggle-devtools'
  , 'zoom-in', 'zoom-out', 'restore-size', 'toggle-fullscreen'] as const;

export type MenuBarAction = typeof MenuBarActions[number];

export function isMenuBarAction(value: string): value is MenuBarAction {
  return MenuBarActions.includes(value as MenuBarAction);
}

export interface IPCMainExposed {
  setBadge: (badge: number) => void
  setTitle: (title: string) => void
  config: () => Promise<Config>
  branding: () => Promise<Branding>
  on: (event: string, op: (channel: any, args: any[]) => void) => void
  handleDeepLink: (callback: (url: string) => void) => void
  handleNotificationNavigation: (callback: (application: Plugin) => void) => void
  handleUpdateDownloadProgress: (callback: (progress: number) => void) => void
  setFrontCookie: (host: string, name: string, value: string) => Promise<void>
  dockBounce: () => void
  sendNotification: (notififationParams: NotificationParams) => void
  getScreenAccess: () => Promise<boolean>
  getScreenSources: () => Promise<ScreenSource[]>
  handleAuth: (callback: (token: string) => void) => void

  cancelBackup: () => void
  startBackup: (token: string, endpoint: string, workspace: string) => void

  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  onWindowStateChange: (callback: (event: IpcRendererEvent, newState: string) => void) => void
  isOsUsingDarkTheme: () => Promise<boolean>
  executeMenuBarAction: (action: MenuBarAction) => void
}

export function ipcMainExposed(): IPCMainExposed {
  return (window as any).electron as IPCMainExposed
}
