//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { getCurrentLocation, location, navigate } from '@hcengineering/ui'
import { onDestroy } from 'svelte'

interface Message {
  action: 'navigate' | 'theme'
  value: any
}

interface ThemeMessage extends Message {
  action: 'theme'
  value: string
}

interface NavigateMessage extends Message {
  action: 'navigate'
  value: NavigateMessageValue
}

interface NavigateMessageValue {
  path: string[]
  fragment?: string
}

interface Bridge {
  on: (eventName: string, callback: (data: any) => void) => any
  emit: (eventName: string, data: any) => void
}

type MobileNSWindow = Window &
  typeof globalThis & {
  nsWebViewBridge: Bridge
}

type SetTheme = (theme: string) => void

export function subscribeMobile (setTheme: SetTheme): void {
  const webView = window as MobileNSWindow
  if (webView.nsWebViewBridge !== undefined) {
    webView.nsWebViewBridge.on('message', (e) => handleMessage(e, setTheme))

    onDestroy(
      location.subscribe((loc) => {
        webView.nsWebViewBridge.emit('navigate', JSON.stringify(loc))
      })
    )
  }
}

function handleMessage (data: ThemeMessage | NavigateMessage, setTheme: SetTheme): void {
  if (data.action === 'navigate') {
    const location = getCurrentLocation()
    location.path.length = 3
    location.path[2] = data.value.path[0]
    if (data.value.path[1] !== undefined) {
      location.path[3] = data.value.path[1]
    }
    if (data.value.path[2] !== undefined) {
      location.path[4] = data.value.path[2]
    }
    location.fragment = data.value.fragment
    location.query = undefined
    navigate(location)
  } else if (data.action === 'theme') {
    setTheme(`theme-${data.value}`)
  }
}
