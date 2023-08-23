<!--
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
-->
<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Button, ButtonKind, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { ViewOptions, ViewOptionsModel, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { focusStore } from '../selection'
  import { setViewOptions } from '../viewOptions'
  import ViewOptionsEditor from './ViewOptions.svelte'
  import core from '@hcengineering/core'

  export let viewlet: Viewlet | undefined
  export let kind: ButtonKind = 'regular'
  export let viewOptions: ViewOptions

  const dispatch = createEventDispatcher()
  const client = getClient()

  let btn: HTMLButtonElement

  async function clickHandler (event: MouseEvent): Promise<void> {
    if (viewlet === undefined) {
      return
    }
    const h = client.getHierarchy()
    const config = await client.findAll(view.class.Viewlet, {
      attachTo: { $in: h.getDescendants(viewlet.attachTo) },
      variant: viewlet.variant ? viewlet.variant : { $exists: false },
      descriptor: viewlet.descriptor
    })

    // Use one ancestor, viewlet class and all derived ones.
    const classes = [viewlet.attachTo, ...config.map((it) => it.attachTo)].filter(
      (it, idx, arr) => arr.indexOf(it) === idx
    )

    const extraViewlets = await client.findAll(view.class.Viewlet, {
      attachTo: { $in: classes },
      descriptor: viewlet.descriptor,
      variant: viewlet.variant ? viewlet.variant : { $exists: false }
    })

    const customAttributes = classes
      .flatMap((c) => Array.from(client.getHierarchy().getOwnAttributes(c).values()))
      .filter(
        (attr) => attr.isCustom && !attr.isHidden && [core.class.RefTo, core.class.EnumOf].includes(attr.type._class)
      )
      .map((a) => a.name)
    const mergedModel: ViewOptionsModel = {
      groupBy: [],
      orderBy: [],
      other: [],
      groupDepth: viewlet.viewOptions?.groupDepth
    }

    if (classes.length > 1) {
      mergedModel.groupBy.push('_class')
    }
    for (const ev of extraViewlets) {
      mergedModel.groupBy.push(...(ev.viewOptions?.groupBy ?? []))
      mergedModel.orderBy.push(...(ev.viewOptions?.orderBy ?? []))
      mergedModel.other.push(...(ev.viewOptions?.other ?? []))
    }
    mergedModel.groupBy = Array.from(new Set([...mergedModel.groupBy, ...customAttributes]))
    mergedModel.groupBy = mergedModel.groupBy.filter((it, idx, arr) => arr.indexOf(it) === idx)
    mergedModel.orderBy = mergedModel.orderBy.filter((it, idx, arr) => arr.indexOf(it) === idx)
    mergedModel.other = mergedModel.other.filter((it, idx, arr) => arr.findIndex((q) => q.key === it.key) === idx)

    showPopup(
      ViewOptionsEditor,
      { viewlet, config: mergedModel, viewOptions },
      eventToHTMLElement(event),
      undefined,
      (result) => {
        if (result?.key === undefined) return
        if (viewlet) {
          viewOptions = { ...viewOptions, [result.key]: result.value }

          // Clear selection on view settings change.
          focusStore.set({})

          dispatch('viewOptions', viewOptions)
          setViewOptions(viewlet, viewOptions)
        }
      }
    )
  }
</script>

{#if viewlet?.viewOptions !== undefined}
  <Button
    icon={view.icon.ViewButton}
    label={view.string.View}
    {kind}
    adaptiveShrink={'sm'}
    showTooltip={{ label: view.string.CustomizeView, direction: 'bottom' }}
    bind:input={btn}
    on:click={clickHandler}
  />
{/if}
