import { type Card, type MasterTag } from '@hcengineering/card'
import { type NavigationSection } from '@hcengineering/ui-next'
import { groupByArray, type Hierarchy, type Ref } from '@hcengineering/core'
import chat, { type Channel, type Thread } from '@hcengineering/chat'
import { translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'

export async function cardsToChatSections (cards: Card[]): Promise<NavigationSection[]> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const { threads, channels, other } = splitCards(cards, hierarchy)
  const cardByClass = groupByArray(other, (it) => it._class)

  const result: NavigationSection[] = []

  if (threads.length > 0) {
    result.push(getSection(chat.masterTag.Thread, threads, hierarchy))
  }

  if (channels.length > 0) {
    result.push(getSection(chat.masterTag.Channel, channels, hierarchy))
  }

  const cardSessions: Array<[string, NavigationSection]> = []
  for (const [_class, cards] of cardByClass.entries()) {
    const section = getSection(_class, cards, hierarchy)
    const label = await translate(section.title, {})
    cardSessions.push([label, section])
  }

  cardSessions.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))

  result.push(...cardSessions.map(([, section]) => section))

  return result
}

function getSection (_class: Ref<MasterTag>, cards: Card[], hierarchy: Hierarchy): NavigationSection {
  const clazz = hierarchy.getClass(_class)

  return {
    id: _class,
    title: clazz.pluralLabel ?? clazz.label,
    items: cards
      .map((card) => ({
        id: card._id,
        label: card.title,
        icon: clazz.icon ?? chat.icon.Thread
      }))
      .sort((c1, c2) => c1.label.toLowerCase().localeCompare(c2.label.toLowerCase()))
  }
}

function splitCards (
  cards: Card[],
  hierarchy: Hierarchy
): {
    threads: Thread[]
    channels: Channel[]
    other: Card[]
  } {
  return cards.reduce<{
    threads: Thread[]
    channels: Channel[]
    other: Card[]
  }>(
    (acc, it) => {
      if (hierarchy.isDerived(it._class, chat.masterTag.Thread)) {
        acc.threads.push(it)
      } else if (hierarchy.isDerived(it._class, chat.masterTag.Channel)) {
        acc.channels.push(it)
      } else {
        acc.other.push(it)
      }
      return acc
    },
    { threads: [], channels: [], other: [] }
  )
}
