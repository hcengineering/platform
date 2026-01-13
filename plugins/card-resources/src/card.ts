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

import { getClient } from '@hcengineering/presentation'
import cardPlugin, { type Card, type CardSection } from '@hcengineering/card'
import { getResource } from '@hcengineering/platform'
import { type Heading } from '@hcengineering/text-editor'

export async function getCardSections (card: Card): Promise<CardSection[]> {
  const client = getClient()
  const sections: CardSection[] = client
    .getModel()
    .findAllSync(cardPlugin.class.CardSection, {})
    .sort((a, b) => a.order - b.order)

  const res: CardSection[] = []
  for (const section of sections) {
    if (section.checkVisibility !== undefined) {
      const isVisibleFn = await getResource(section.checkVisibility)
      const isVisible = await isVisibleFn(card)
      if (isVisible) {
        res.push(section)
      }
    } else {
      res.push(section)
    }
  }

  return res
}

export function getCardToc (sections: CardSection[], tocBySection: Record<string, Heading[]>): Heading[] {
  const newToc: Heading[] = []

  for (const section of sections) {
    const subToc = tocBySection[section._id]
    if (section.navigation.length > 0) {
      newToc.push(
        ...section.navigation.map((nav) => ({
          id: nav.id,
          titleIntl: nav.label,
          level: 0,
          group: section._id
        }))
      )
    } else {
      newToc.push({
        id: section._id,
        titleIntl: section.label,
        level: 0,
        group: section._id
      })
    }

    if (subToc !== undefined) {
      newToc.push(...subToc.map((it) => ({ ...it, group: section._id })))
    }
  }

  return newToc
}
