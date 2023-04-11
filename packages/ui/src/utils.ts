//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { generateId } from '@hcengineering/core'
import type { Metadata } from '@hcengineering/platform'
import { setMetadata } from '@hcengineering/platform'
import { Notification, NotificationPosition, NotificationSeverity, notificationsStore } from '.'
import { AnyComponent, AnySvelteComponent } from './types'

export function setMetadataLocalStorage<T> (id: Metadata<T>, value: T | null): void {
  if (value != null) {
    localStorage.setItem(id, typeof value === 'string' ? value : JSON.stringify(value))
  } else {
    localStorage.removeItem(id)
  }
  setMetadata(id, value)
}

export function fetchMetadataLocalStorage<T> (id: Metadata<T>): T | null {
  const data = localStorage.getItem(id)
  if (data === null) {
    return null
  }
  try {
    const value = JSON.parse(data)
    setMetadata(id, value)
    return value
  } catch {
    setMetadata(id, data as unknown as T)
    return data as unknown as T
  }
}

export function checkMobile (): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Mobile|Opera Mini/i.test(navigator.userAgent)
}

export function floorFractionDigits (n: number | string, amount: number): number {
  return Number(Number(n).toFixed(amount))
}

export function addNotification (
  title: string,
  subTitle: string,
  component: AnyComponent | AnySvelteComponent,
  params?: { [key: string]: any }
): void {
  const notification: Notification = {
    id: generateId(),
    title,
    subTitle,
    severity: NotificationSeverity.Success,
    position: NotificationPosition.BottomRight,
    component,
    closeTimeout: parseInt(localStorage.getItem('#platform.notification.timeout') ?? '10000'),
    params
  }

  notificationsStore.addNotification(notification)
}

/**
 * @public
 */
export function handler<T, EVT = MouseEvent> (target: T, op: (value: T, evt: EVT) => void): (evt: EVT) => void {
  return (evt: EVT) => {
    op(target, evt)
  }
}
