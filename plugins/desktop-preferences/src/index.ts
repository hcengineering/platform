//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Ref, Class, Data } from '@hcengineering/core'
import { Preference } from '@hcengineering/preference'
import { NotificationPreferencesGroup } from '@hcengineering/notification'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export interface DesktopNotificationPreference extends Preference {
  showNotifications: boolean
  playSound: boolean
  bounceAppIcon: boolean
  showUnreadCounter: boolean
}

/**
 * @public
 */
export type DesktopNotificationPreferenceData = Omit<Data<DesktopNotificationPreference>, 'attachedTo'>

/**
 * @public
 */
export type PreferenceKey = keyof DesktopNotificationPreferenceData

/**
 * @public
 */
export const defaultNotificationPreference: DesktopNotificationPreferenceData = {
  showNotifications: true,
  playSound: false,
  bounceAppIcon: false,
  showUnreadCounter: true
}

/**
 * @public
 */
export const desktopPreferencesId = 'desktop-preferences' as Plugin

export default plugin(desktopPreferencesId, {
  class: {
    DesktopNotificationPreference: '' as Ref<Class<DesktopNotificationPreference>>
  },
  component: {
    DesktopPreferencesPresenter: '' as AnyComponent
  },
  icon: {
    NotificationMessage: '' as Asset
  },
  string: {
    ShowNotifications: '' as IntlString,
    SoundAndAppearance: '' as IntlString,
    PlaySound: '' as IntlString,
    BounceAppIcon: '' as IntlString,
    ShowBadge: '' as IntlString,
    HaveGotANotification: '' as IntlString,
    TotalNotificationsCount: '' as IntlString
  },
  ids: {
    DesktopNotificationPreferencesGroup: '' as Ref<NotificationPreferencesGroup>
  }
})
