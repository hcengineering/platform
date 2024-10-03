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
import { getDay, type Timestamp } from '@hcengineering/core'
import { get } from 'svelte/store'
import { sortActivityMessages } from '@hcengineering/activity-resources'
import { type ActivityMessage, type DisplayActivityMessage } from '@hcengineering/activity'
import { type DocNotifyContext } from '@hcengineering/notification'

import { getClosestDate, readChannelMessages } from './utils'
import { type ChannelDataProvider } from './channelDataProvider'

const dateSelectorHeight = 30
const headerHeight = 52

function isDateRendered (date: Timestamp, uuid: string): boolean {
  const day = getDay(date)
  const id = `${uuid}-${day.toString()}`

  return document.getElementById(id) != null
}

export function getScrollToDateOffset (date: Timestamp, uuid: string): number | undefined {
  const day = getDay(date)
  const id = `${uuid}-${day.toString()}`
  const element = document.getElementById(id)

  if (element === null) return undefined

  const offsetTop = element?.offsetTop
  if (offsetTop === undefined) {
    return
  }

  return offsetTop - headerHeight - dateSelectorHeight / 2
}

export function jumpToDate (
  e: CustomEvent<{ date?: Timestamp }>,
  provider: ChannelDataProvider,
  uuid: string,
  scrollDiv?: HTMLElement | null
): {
    scrollOffset?: number
    dateToJump?: Timestamp
  } {
  const date = e.detail.date

  if (date === undefined || scrollDiv == null) {
    return {}
  }

  const closestDate = getClosestDate(date, get(provider.datesStore))
  if (closestDate === undefined) {
    return {}
  }

  if (isDateRendered(closestDate, uuid)) {
    const offset = getScrollToDateOffset(closestDate, uuid)
    return { scrollOffset: offset }
  } else {
    void provider.jumpToDate(closestDate)
    return { dateToJump: closestDate }
  }
}

export function getSelectedDate (
  provider: ChannelDataProvider,
  uuid: string,
  scrollDiv?: HTMLElement | null,
  contentDiv?: HTMLElement | null
): Timestamp | undefined {
  if (contentDiv == null || scrollDiv == null) return

  const containerRect = scrollDiv.getBoundingClientRect()
  const messagesElements = contentDiv?.getElementsByClassName('activityMessage')

  if (messagesElements === undefined) return

  const reversedDates = [...get(provider.datesStore)].reverse()
  const messages = get(provider.messagesStore)

  let selectedDate: Timestamp | undefined

  for (const message of messages) {
    const msgElement = messagesElements?.[message._id as any]
    if (msgElement == null) continue

    const createdOn = message.createdOn
    if (createdOn === undefined) continue

    const messageRect = msgElement.getBoundingClientRect()

    const isInView =
      messageRect.top > 0 &&
      messageRect.top < containerRect.bottom &&
      messageRect.bottom - headerHeight - 2 * dateSelectorHeight > 0 &&
      messageRect.bottom <= containerRect.bottom

    if (isInView) {
      selectedDate = reversedDates.find((date) => date <= createdOn)
      break
    }
  }

  if (selectedDate !== undefined) {
    const day = getDay(selectedDate)
    const dateId = `${uuid}-${day.toString()}`
    const dateElement = document.getElementById(dateId)

    let isElementVisible = false

    if (dateElement !== null) {
      const elementRect = dateElement.getBoundingClientRect()
      isElementVisible = elementRect.top + 10 >= containerRect.top && elementRect.bottom <= containerRect.bottom
    }

    if (isElementVisible) {
      selectedDate = undefined
    }
  }

  return selectedDate
}

export function messageInView (msgElement: Element, containerRect: DOMRect): boolean {
  const rect = msgElement.getBoundingClientRect()
  return rect.bottom > containerRect.top && rect.top < containerRect.bottom
}

const messagesToReadAccumulator: Set<DisplayActivityMessage> = new Set<DisplayActivityMessage>()
let messagesToReadAccumulatorTimer: any

export function readViewportMessages (
  messages: ActivityMessage[],
  context: DocNotifyContext,
  scrollDiv?: HTMLElement | null,
  contentDiv?: HTMLElement | null
): void {
  if (scrollDiv == null || contentDiv == null) return

  const scrollRect = scrollDiv.getBoundingClientRect()
  const messagesElements = contentDiv?.getElementsByClassName('activityMessage')

  for (const message of messages) {
    const msgElement = messagesElements?.[message._id as any]
    if (msgElement == null) continue

    if (messageInView(msgElement, scrollRect)) {
      messagesToReadAccumulator.add(message)
    }
  }

  clearTimeout(messagesToReadAccumulatorTimer)
  messagesToReadAccumulatorTimer = setTimeout(() => {
    const messagesToRead = [...messagesToReadAccumulator]
    messagesToReadAccumulator.clear()
    void readChannelMessages(sortActivityMessages(messagesToRead), context)
  }, 500)
}
