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
  import core from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { Process, SelectedConst } from '@hcengineering/process'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import { findAttributePresenter } from '@hcengineering/view-resources'
  import { readonly } from 'svelte/store'

  export let contextValue: SelectedConst
  export let process: Process

  const client = getClient()
  $: attr = client.getModel().findAllSync(core.class.Attribute, { name: contextValue.key })[0]

  let presenter: AnyComponent | undefined = undefined
  $: presenter = findAttributePresenter(client, attr?.attributeOf ?? process.masterTag, contextValue.key)
</script>

{#if presenter !== undefined}
  <Component is={presenter} props={{ value: contextValue.value, readonly }} disabled />
{/if}
