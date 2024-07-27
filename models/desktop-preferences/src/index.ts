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

import { Model, type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import notification from '@hcengineering/notification'

import desktopPreferences, { type DesktopNotificationPreference } from '@hcengineering/desktop-preferences'

export { desktopPreferencesId } from '@hcengineering/desktop-preferences'

@Model(desktopPreferences.class.DesktopNotificationPreference, preference.class.Preference)
export class TDesktopNotificationPreference extends TPreference implements DesktopNotificationPreference {
  showNotifications!: boolean
  playSound!: boolean
  bounceAppIcon!: boolean
  showUnreadCounter!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TDesktopNotificationPreference)

  builder.createDoc(
    notification.class.NotificationPreferencesGroup,
    core.space.Model,
    {
      label: desktopPreferences.string.SoundAndAppearance,
      icon: desktopPreferences.icon.NotificationMessage,
      presenter: desktopPreferences.component.DesktopPreferencesPresenter
    },
    desktopPreferences.ids.DesktopNotificationPreferencesGroup
  )
}
