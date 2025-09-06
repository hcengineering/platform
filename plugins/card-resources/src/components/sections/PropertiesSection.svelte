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
  import { Card } from '@hcengineering/card'
  import { Doc, Mixin } from '@hcengineering/core'
  import { getDocMixins } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'

  import CardAttributeEditor from '../CardAttributeEditor.svelte'

  export let readonly: boolean = false
  export let doc: Card

  const dispatch = createEventDispatcher()

  let mixins: Array<Mixin<Doc>> = []
  $: mixins = getDocMixins(doc)
  onMount(() => {
    dispatch('loaded')
  })
</script>

<div class="properties">
  <CardAttributeEditor value={doc} {mixins} {readonly} ignoreKeys={['title', 'content', 'parent']} />
</div>

<style lang="scss">
  .properties {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 1rem;
  }
</style>
