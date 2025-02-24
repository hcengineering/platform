<!--
//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Heading } from '@hcengineering/text-editor'
  import TableOfContentsContent from './TableOfContentsContent.svelte'

  export let items: Heading[] = []
  export let selected: Heading | undefined = undefined
  export let enumerated: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <TableOfContentsContent {items} {selected} {enumerated} on:close />
  <div class="menu-space" />
</div>
