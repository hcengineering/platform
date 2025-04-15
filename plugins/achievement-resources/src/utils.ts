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

import achievement from '@hcengineering/achievement'
import { type IntlString, type Asset } from '@hcengineering/platform'

interface PersonAchievement {
  icon: Asset
  tooltip: IntlString
}

// TODO: Remove and replace with actual person achievements, it is just for demonstration. Implement achievement service.
const possibleAchievements: PersonAchievement[] = [
  { icon: achievement.image.EarliestAdopter, tooltip: achievement.string.EarliestAdopter },
  { icon: achievement.image.Epic, tooltip: achievement.string.Epic },
  { icon: achievement.image.Legendary, tooltip: achievement.string.Legendary }
]

function hashStringToInt (str: string): number {
  if (str === undefined) return 0
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to a 32-bit integer
  }
  return hash
}

export function getPersonAchievements (personId: string): PersonAchievement[] {
  const personHash = hashStringToInt(personId)
  return possibleAchievements.filter((_, index) => {
    return personHash % (index + 1) === 0
  })
}
