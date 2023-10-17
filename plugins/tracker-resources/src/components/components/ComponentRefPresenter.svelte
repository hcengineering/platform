<!--
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
-->
<script lang="ts">
  import { AggregateValue, Ref } from '@hcengineering/core'
  import ComponentPresenter from './ComponentPresenter.svelte'
  import { Component } from '@hcengineering/tracker'

  import { componentStore } from '../../component'

  export let value: Ref<Component> | AggregateValue | undefined
  export let kind: 'list' | undefined = undefined
  export let disabled: boolean = false
  export let accent: boolean = false

  $: componentValue = $componentStore.get(
    typeof value === 'string' ? value : (value?.values?.[0]?._id as Ref<Component>)
  )
</script>

<ComponentPresenter value={componentValue} {kind} {disabled} {accent} on:accent-color />
