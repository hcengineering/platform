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

const BADGE_ICON_COMMON_PREFIX = 'app_icon_badge_'
const BADGE_ICON_COMMON_EXTENSION = '.png'

export interface BadgeIconInfo {
  fileName: string
  tooltip: string
}

export function getBadgeIconInfo (badgeCount: number, baseTitle: string): BadgeIconInfo {
  if (badgeCount <= 0) {
    return {
      fileName: '',
      tooltip: baseTitle
    }
  }

  if (badgeCount >= 99) {
    return {
      fileName: `${BADGE_ICON_COMMON_PREFIX}99plus${BADGE_ICON_COMMON_EXTENSION}`,
      tooltip: `${baseTitle}: ${badgeCount} unread`
    }
  }

  const fileName = badgeCount <= 9
    ? `${BADGE_ICON_COMMON_PREFIX}0${badgeCount}${BADGE_ICON_COMMON_EXTENSION}`
    : `${BADGE_ICON_COMMON_PREFIX}${badgeCount}${BADGE_ICON_COMMON_EXTENSION}`

  return {
    fileName,
    tooltip: `${baseTitle}: ${badgeCount} unread`
  }
}
