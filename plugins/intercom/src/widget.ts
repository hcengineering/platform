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

/**
 * Initialize Intercom widget instance
 *
 * @see {@link https://developers.intercom.com/installing-intercom/docs/basic-javascript}
 *
 * @param appId - Intercom application Id
 * @param done - Callback called when the widget script is loaded
 */
export function loadScript (appId: string, done: () => void): void {
  ;(function () {
    const w = window
    const ic = w.Intercom
    if (typeof ic === 'function') {
      ic('reattach_activator')
      ic('update', w.intercomSettings)
    } else {
      const doc = document
      const i: any = function () {
        i.c(arguments)
      }
      i.q = []
      i.c = function (args: any) {
        i.q.push(args)
      }
      w.Intercom = i

      const loadScript = function (): void {
        const script = doc.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.src = `https://widget.intercom.io/widget/${appId}`
        script.onload = done

        const x = doc.getElementsByTagName('script')[0]
        x.parentNode?.insertBefore(script, x)
      }
      loadScript()
    }
  })()
}
