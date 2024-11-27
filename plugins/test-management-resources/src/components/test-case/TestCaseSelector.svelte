<!--
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
-->

<script lang="ts">
  import { ComponentType } from 'svelte'

  import { Ref, Space } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonShape,
    ButtonSize,
    IconFolder,
    IconWithEmoji,
    Label,
    TooltipAlignment,
    showPopup
  } from '@hcengineering/ui'
  import view, { IconProps } from '@hcengineering/view'

  import TestCasePopup from './TestCasePopup.svelte'
  import testManagement from '../../plugin'

  export let objects: TestCase[]
  export let selectedObjects: TestCase[]
  export let label: IntlString = testManagement.string.TestCases
  export let value: Ref<Space> | undefined
  export let focusIndex = -1
  export let focus = false
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'center'
  export let shape: ButtonShape = undefined
  export let width: string | undefined = undefined
  export let readonly = false
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = view.ids.IconWithEmoji
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType = IconFolder

  let selected: (Space & IconProps) | undefined

  const showSpacesPopup = (ev: MouseEvent) => {
    showPopup(
      TestCasePopup,
      {
        objects,
        readonly
      },
      ev.target as HTMLElement,
      () => {}
    )
  }
</script>

<Button
  id="testcase.selector"
  {focus}
  {shape}
  {focusIndex}
  icon={testManagement.icon.TestCase}
  {size}
  {kind}
  {justify}
  {width}
  notSelected={value == null}
  showTooltip={{ label, direction: labelDirection }}
  on:click={showSpacesPopup}
>
  <span slot="content" class="overflow-label disabled text">
    {selectedObjects?.length ?? 0}
    <Label {label} />
  </span>
</Button>
