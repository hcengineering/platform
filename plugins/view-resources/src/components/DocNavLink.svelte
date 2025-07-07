<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required bgetObjectLinkFragmentr agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { concatLink, Doc, Hierarchy } from '@hcengineering/core'
  import presentation, { NavLink, getClient, createQuery, MessageBox } from '@hcengineering/presentation'
  import { AnyComponent, getPanelURI, locationToUrl, showPopup } from '@hcengineering/ui'
  import view from '../plugin'
  import { getObjectLinkFragment, restrictionStore } from '../utils'
  import { getMetadata } from '@hcengineering/platform'

  export let object: Doc | undefined
  export let disabled: boolean = false
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined
  export let noUnderline = disabled
  export let inline = false
  export let colorInherit: boolean = false
  export let component: AnyComponent = view.component.EditDoc
  export let props: Record<string, any> = {}
  export let shrink: number = 1
  export let accent: boolean = false
  export let noOverflow: boolean = false
  export let inlineReference: boolean = false
  export let transparent: boolean = false
  export let inlineBlock = false
  export let noSelect: boolean = true
  export let title: string | undefined = undefined

  const docQuery = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let broken: boolean = false

  let _disabled = disabled || $restrictionStore.disableNavigation
  $: _disabled = disabled || $restrictionStore.disableNavigation

  $: if (object?._class != null && object?._id != null && hierarchy.hasClass(object?._class)) {
    docQuery.query(object?._class, { _id: object?._id }, (r) => {
      broken = r.shift() === undefined
    })
  }

  let href: string | undefined =
    object !== undefined
      ? '#' + getPanelURI(component, object._id, Hierarchy.mixinOrClass(object), 'content')
      : undefined

  async function getHref (object: Doc): Promise<void> {
    if (_disabled) {
      href = undefined
      return
    }
    const panelComponent = hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)
    const comp = panelComponent?.component ?? component
    const loc = await getObjectLinkFragment(hierarchy, object, props, comp)
    const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin
    href = concatLink(frontUrl, locationToUrl(loc))
  }

  $: if (object !== undefined) getHref(object)

  function onBrokenLinkClick (event: MouseEvent): void {
    showPopup(MessageBox, {
      label: presentation.string.UnableToFollowMention,
      message: presentation.string.AccessDenied,
      canSubmit: false
    })
  }
</script>

{#if broken}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span class="antiMention" class:transparent class:broken on:click={onBrokenLinkClick}>
    <slot />
  </span>
{:else}
  <NavLink
    disabled={_disabled}
    {onClick}
    {noUnderline}
    {inline}
    {shrink}
    {href}
    {colorInherit}
    {accent}
    {noOverflow}
    {inlineReference}
    {transparent}
    {inlineBlock}
    {noSelect}
    {title}
  >
    <slot />
  </NavLink>
{/if}
