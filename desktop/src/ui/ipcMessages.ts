//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export const IpcMessage = {
  AutoLaunchSettingChanged: 'auto-launch-setting-changed',
  GetAutoLaunchEnabled: 'get-auto-launch-enabled',
  MinimizeToTraySettingChanged: 'minimize-to-tray-setting-changed',
  GetMinimizeToTrayEnabled: 'get-minimize-to-tray-enabled',
  RebuildUserJumpList: 'rebuild-user-jump-list',
  StartBackup: 'start-backup',
  CancelBackup: 'cancel-backup',
  GetScreenSources: 'get-screen-sources',
  GetScreenAccess: 'get-screen-access',
  SetFrontCookie: 'set-front-cookie',
  HandleDownloadItem: 'handle-download-item',
  SetBadge: 'set-badge',
  SetTitle: 'set-title',
  DockBounce: 'dock-bounce',
  SendNotification: 'send-notification',
  WindowMinimize: 'window-minimize',
  WindowMaximize: 'window-maximize',
  WindowClose: 'window-close',
  WindowStateChanged: 'window-state-changed',
  WindowFocusLoss: 'window-focus-loss',
  GetIsOsUsingDarkTheme: 'get-is-os-using-dark-theme',
  MenuAction: 'menu-action',
  GetMainConfig: 'get-main-config',
  SetCombinedConfig: 'set-combined-config',
  GetHost: 'get-host',
  HandleDeepLink: 'handle-deep-link',
  OnDeepLinkHandler: 'on-deep-link-handler',
  HandleNotificationNavigation: 'handle-notification-navigation',
  HandleUpdateDownloadProgress: 'handle-update-download-progress',
  HandleAuth: 'handle-auth'
} as const
