<!--
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
-->
<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { ButtonIcon, showPopup, closeTooltip, IconOptions } from '@hcengineering/ui'
  import view, { ViewOptionsModel, Viewlet } from '@hcengineering/view'
  import { ViewOptions as ViewOptionsEditor } from '@hcengineering/view-resources'
  import core, { Data } from '@hcengineering/core'

  export let viewlet: Data<Viewlet> | undefined = undefined
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'

  const client = getClient()

  let btn: HTMLButtonElement
  let pressed: boolean = false

  async function clickHandler (): Promise<void> {
    if (viewlet === undefined) {
      return
    }
    pressed = true
    closeTooltip()

    // Use one ancestor, viewlet class and all derived ones.
    const classes = [viewlet.attachTo].filter((it, idx, arr) => arr.indexOf(it) === idx)

    const customAttributes = classes
      .flatMap((c) => {
        const hierarchy = client.getHierarchy()
        return hierarchy.isMixin(c)
          ? [
              ...Array.from(hierarchy.getOwnAttributes(c).values()),
              ...Array.from(hierarchy.getOwnAttributes(hierarchy.getBaseClass(c)).values())
            ]
          : Array.from(client.getHierarchy().getOwnAttributes(c).values())
      })
      .filter(
        (attr) => attr.isCustom && !attr.isHidden && [core.class.RefTo, core.class.EnumOf].includes(attr.type._class)
      )
      .map((a) => a.name)
    const mergedModel: ViewOptionsModel = viewlet.viewOptions ?? {
      groupBy: [],
      orderBy: [],
      other: []
    }

    mergedModel.groupBy = Array.from(new Set([...mergedModel.groupBy, ...customAttributes]))
    mergedModel.groupBy = mergedModel.groupBy.filter((it, idx, arr) => arr.indexOf(it) === idx)
    mergedModel.orderBy = mergedModel.orderBy.filter((it, idx, arr) => arr.findIndex((q) => it[0] === q[0]) === idx)
    mergedModel.other = mergedModel.other.filter((it, idx, arr) => arr.findIndex((q) => q.key === it.key) === idx)

    showPopup(
      ViewOptionsEditor,
      { viewlet, config: mergedModel, viewOptions: viewlet.viewOptions },
      btn,
      () => {
        pressed = false
      },
      (result) => {
        if (result?.key === undefined) return
        if (viewlet !== undefined) {
          viewlet.viewOptions = { ...viewlet.viewOptions, ...result }
        }
      }
    )
  }
</script>

<ButtonIcon
  icon={IconOptions}
  disabled={viewlet === undefined}
  {kind}
  size={'small'}
  hasMenu
  {pressed}
  tooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
  dataId={'btn-viewOptions'}
  bind:element={btn}
  on:click={clickHandler}
/>
