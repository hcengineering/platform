//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { analyticsCollectorId } from '@hcengineering/analytics-collector'
import { calendarId } from '@hcengineering/calendar'
import { chunterId } from '@hcengineering/chunter'
import { contactId } from '@hcengineering/contact'
import { coreId } from '@hcengineering/core'
import { documentId } from '@hcengineering/document'
import { driveId } from '@hcengineering/drive'
import { hrId } from '@hcengineering/hr'
import { leadId } from '@hcengineering/lead'
import { loveId } from '@hcengineering/love'
import { notificationId } from '@hcengineering/notification'
import { preferenceId } from '@hcengineering/preference'
import { recruitId } from '@hcengineering/recruit'
import { settingId } from '@hcengineering/setting'
import { timeId } from '@hcengineering/time'
import { trackerId } from '@hcengineering/tracker'
import { viewId } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

import analyticsCollectorEn from '@hcengineering/analytics-collector-assets/lang/en.json'
import calendarEn from '@hcengineering/calendar-assets/lang/en.json'
import chunterEn from '@hcengineering/chunter-assets/lang/en.json'
import contactEn from '@hcengineering/contact-assets/lang/en.json'
import coreEng from '@hcengineering/core/lang/en.json'
import documentEn from '@hcengineering/document-assets/lang/en.json'
import driveEn from '@hcengineering/drive-assets/lang/en.json'
import hrEn from '@hcengineering/hr-assets/lang/en.json'
import leadEn from '@hcengineering/lead-assets/lang/en.json'
import loveEn from '@hcengineering/love-assets/lang/en.json'
import notificationEn from '@hcengineering/notification-assets/lang/en.json'
import platformEng from '@hcengineering/platform/lang/en.json'
import preferenceEn from '@hcengineering/preference-assets/lang/en.json'
import recruitEn from '@hcengineering/recruit-assets/lang/en.json'
import settingEn from '@hcengineering/setting-assets/lang/en.json'
import timeEn from '@hcengineering/time-assets/lang/en.json'
import trackerEn from '@hcengineering/tracker-assets/lang/en.json'
import viewEn from '@hcengineering/view-assets/lang/en.json'
import workbenchEn from '@hcengineering/workbench-assets/lang/en.json'

import { addStringsLoader, platformId } from '@hcengineering/platform'

export function registerLoaders (): void {
  addStringsLoader(coreId, async (lang: string) => coreEng)
  addStringsLoader(platformId, async (lang: string) => platformEng)

  addStringsLoader(analyticsCollectorId, async (lang: string) => analyticsCollectorEn)
  addStringsLoader(calendarId, async (lang: string) => calendarEn)
  addStringsLoader(chunterId, async (lang: string) => chunterEn)
  addStringsLoader(contactId, async (lang: string) => contactEn)
  addStringsLoader(documentId, async (lang: string) => documentEn)
  addStringsLoader(driveId, async (lang: string) => driveEn)
  addStringsLoader(hrId, async (lang: string) => hrEn)
  addStringsLoader(leadId, async (lang: string) => leadEn)
  addStringsLoader(loveId, async (lang: string) => loveEn)
  addStringsLoader(notificationId, async (lang: string) => notificationEn)
  addStringsLoader(preferenceId, async (lang: string) => preferenceEn)
  addStringsLoader(recruitId, async (lang: string) => recruitEn)
  addStringsLoader(settingId, async (lang: string) => settingEn)
  addStringsLoader(timeId, async (lang: string) => timeEn)
  addStringsLoader(trackerId, async (lang: string) => trackerEn)
  addStringsLoader(viewId, async (lang: string) => viewEn)
  addStringsLoader(workbenchId, async (lang: string) => workbenchEn)
}
