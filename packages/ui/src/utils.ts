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
import type { IntlString, Metadata } from '@hcengineering/platform'
import { setMetadata } from '@hcengineering/platform'
import autolinker from 'autolinker'
import { writable } from 'svelte/store'
import { NotificationPosition, NotificationSeverity, notificationsStore, type Notification } from '.'
import { deviceSizes, type AnyComponent, type AnySvelteComponent, type WidthType } from './types'

/**
 * @public
 * @function setMetadataLocalStorage
 * 
 * Sets the metadata in local storage and in the platform.
 * 
 * @param id - The id of the metadata.
 * @param value - The value of the metadata.
 */
export function setMetadataLocalStorage<T> (id: Metadata<T>, value: T | null): void {
  if (value != null) {
    localStorage.setItem(id, typeof value === 'string' ? value : JSON.stringify(value))
  } else {
    localStorage.removeItem(id)
  }
  setMetadata(id, value)
}

/**
 * @public
 * @function fetchMetadataLocalStorage
 * 
 * Fetches the metadata from local storage and attempts to set it in the platform.
 * 
 * @param id - The id of the metadata.
 * @returns The value of the metadata.
 */
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

/**
 * @public
 * @function checkMobile
 * 
 * Checks if the user agent is a mobile device.
 * 
 * @returns True if the user agent is a mobile device, false otherwise.
 */
export function checkMobile (): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Mobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * @public
 * @function isSafari
 * 
 * Checks if the user agent is Safari.
 * 
 * @returns True if the user agent is Safari, false otherwise.
 */
export function isSafari (): boolean {
  return navigator.userAgent.toLowerCase().includes('safari/')
}

/**
 * @public
 * @function checkAdaptiveMatching
 * 
 * Checks if the size is within the limit.
 * 
 * @param size - The size to check.
 * @param limit - The limit to check against.
 * @returns True if the size is within the limit, false otherwise.
 */
export function checkAdaptiveMatching (size: WidthType | null, limit: WidthType): boolean {
  const range = new Set(deviceSizes.slice(0, deviceSizes.findIndex((ds) => ds === limit) + 1))
  return size !== null ? range.has(size) : false
}

// TODO: Fix naming, since it doesn't floor (floorFractionDigits(2.5) === 3.0)
export function floorFractionDigits (n: number | string, amount: number): number {
  return Number(Number(n).toFixed(amount))
}

/**
 * @public
 * @function addNotification
 * 
 * Adds a notification.
 * 
 * @param title - The title of the notification.
 * @param subTitle - The subtitle of the notification.
 * @param component - The component of the notification.
 * @param params - The parameters of the notification.
 */
export function addNotification (
  title: string,
  subTitle: string,
  component: AnyComponent | AnySvelteComponent,
  params?: Record<string, any>
): void {
  const closeTimeout = parseInt(localStorage.getItem('#platform.notification.timeout') ?? '10000')
  const notification: Notification = {
    id: generateId(),
    title,
    subTitle,
    severity: NotificationSeverity.Success,
    position: NotificationPosition.BottomRight,
    component,
    closeTimeout,
    params
  }

  if (closeTimeout !== 0) {
    notificationsStore.addNotification(notification)
  }
}

/**
 * @public
 * @function handler
 * 
 * Creates a handler for an event.
 * 
 * @param target - The target of the event.
 * @param op - The operation to perform when the event occurs.
 * @returns The handler for the event.
 */
export function handler<T, EVT = MouseEvent> (target: T, op: (value: T, evt: EVT) => void): (evt: EVT) => void {
  return (evt: EVT) => {
    op(target, evt)
  }
}

/**
 * @public
 * @function tableToCSV
 * 
 * Converts a table to CSV.
 * 
 * @param tableId - The id of the table.
 * @param separator - The separator to use in the CSV.
 * @returns The CSV representation of the table.
 */
export function tableToCSV (tableId: string, separator = ','): string {
  const rows = document.querySelectorAll('table#' + tableId + ' tr')
  // Construct csv
  const csv: string[] = []
  for (let i = 0; i < rows.length; i++) {
    const row: string[] = []
    const cols = rows[i].querySelectorAll('td, th')
    for (let j = 0; j < cols.length; j++) {
      let data = (cols[j] as HTMLElement).innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
      data = data.replace(/"/g, '""')
      row.push('"' + data + '"')
    }
    csv.push(row.join(separator))
  }
  return csv.join('\n')
}

/**
 * @public
 */
export const networkStatus = writable<number>(0)

let attractorMx: number | undefined
let attractorMy: number | undefined

/**
 * @function mouseAttractor
 * 
 * Perform mouse movement checks and call method if movement is detected.
 * 
 * @param op - The operation to perform when the mouse moves.
 * @param diff - The difference in mouse position to consider as a movement.
 * @returns The mouse attractor.
 */
export function mouseAttractor (op: () => void, diff = 2): (evt: MouseEvent) => void {
  return (evt: MouseEvent) => {
    if (attractorMy !== undefined && attractorMx !== undefined) {
      const dx = evt.screenX - attractorMx
      const dy = evt.screenY - attractorMy
      if (Math.sqrt(dx * dx + dy * dy) > diff) {
        op()
        attractorMx = undefined
        attractorMy = undefined
      }
    } else {
      attractorMx = evt.screenX
      attractorMy = evt.screenY
    }
  }
}

/**
 * @function replaceURLs
 * Replaces URLs with Links in a given block of text/HTML
 *
 * @example
 * replaceURLs("Check out google.com")
 * returns: "Check out <a href='http://google.com' target='_blank' rel='noopener noreferrer'>google.com</a>"
 *
 * @export
 * @param {string} text - the text to replace URLs in
 * @returns {string} - string with replaced URLs
 */
export function replaceURLs (text: string): string {
  try {
    return autolinker.link(text, {
      urls: true,
      phone: false,
      email: false,
      sanitizeHtml: true,
      stripPrefix: false
    })
  } catch (err: any) {
    console.error(err)
    return text
  }
}

/**
 * @function parseURL
 * Parse first URL from the given text or html
 *
 * @example
 * replaceURLs("github.com")
 * returns: "http://github.com"
 *
 * @export
 * @param {string} text - text to parse the URL from
 * @returns {string} - string with parsed URL
 */
export function parseURL (text: string): string {
  const matches = autolinker.parse(text, { urls: true })
  return matches.length > 0 ? matches[0].getAnchorHref() : ''
}

/**
 * @public
 * @interface IModeSelector
 * 
 * Interface for managing modes in an application.
 * 
 * @template Mode - The type of the mode, default is string.
 * 
 * @property mode - The current mode.
 * @property config - Array of tuples. Each tuple contains mode, its internationalized string, and additional config.
 * @property onChange - Called when the mode changes. The new mode is passed as an argument to this function.
 */
export interface IModeSelector<Mode extends string = string> {
  mode: Mode
  config: Array<[Mode, IntlString, object]>
  onChange: (mode: Mode) => void
}

/**
 * @public
 * @function capitalizeFirstLetter
 * 
 * Capitalizes the first letter of a string.
 */
export function capitalizeFirstLetter (str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * @constant isMac
 * 
 * A constant that checks if the user agent is a Macintosh.
 */
const isMac = /Macintosh/i.test(navigator.userAgent)

/**
 * @public
 * @function formatKey
 * 
 * Formats a key.
 * 
 * @param key - The key to format.
 * @returns The formatted key.
 */
export function formatKey (key: string): string[][] {
  const thens = key.split('->')
  const result: string[][] = []
  for (const r of thens) {
    result.push(
      r.split('+').map((it) =>
        it
          .replace(/key/g, '')
          .replace(/Meta|meta/g, isMac ? '⌘' : 'Ctrl')
          .replace(/ArrowUp/g, '↑')
          .replace(/ArrowDown/g, '↓')
          .replace(/ArrowLeft/g, '←')
          .replace(/ArrowRight/g, '→')
          .replace(/Backspace/g, '⌫')
          .toLocaleLowerCase()
      )
    )
  }
  return result
}

/**
 * @function fromCodePoint
 * 
 * Converts code points to a string.
 * 
 * @param vals - The code points to convert.
 * @returns The string representation of the code points.
 */
export function fromCodePoint (...vals: number[]): string {
  return String.fromCodePoint(...vals.map((p) => Math.abs(p) % 0x10ffff))
}

/**
 * @class DelayedCaller
 * 
 * A class that calls a function after a delay.
 * 
 * @property {() => void} op - The operation/function to be called after a delay. 
 * @property {number} delay - The delay in milliseconds before the operation is called. Defaults to 10.
 * 
 * @method call - Calls the operation after a delay.
 * @param {() => void} op - The operation/function to be called after a delay. 
 * @returns {void}
 */
export class DelayedCaller {
  op?: () => void
  constructor (readonly delay: number = 10) {}
  call (op: () => void): void {
    const needTimer = this.op === undefined
    this.op = op
    if (needTimer) {
      setTimeout(() => {
        this.op?.()
        this.op = undefined
      }, this.delay)
    }
  }
}

// Indicates if testing is enabled.
export const testing = (localStorage.getItem('#platform.testing.enabled') ?? 'false') === 'true'


// A writable store that holds the root bar extensions.
export const rootBarExtensions = writable<Array<['left' | 'right', AnyComponent]>>([])
