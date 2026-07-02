<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import card, { CardSpace, MasterTag } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import { Ref, Markup } from '@hcengineering/core'
  import { EmptyMarkup } from '@hcengineering/text'

  import CreateCardPopupFull from './CreateCardPopupFull.svelte'
  import CreateCardPopupSimple from './CreateCardPopupSimple.svelte'
  import { getFirstCreatableSubtype, isBaseTypeWithSubtypes } from '../utils'

  export let title: string = ''
  export let type: Ref<MasterTag> = card.types.Document
  export let space: Ref<CardSpace> | undefined = undefined
  export let changeType: boolean = false
  export let allowChangeSpace: boolean = true
  export let description: Markup = EmptyMarkup

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: if (type != null && isBaseTypeWithSubtypes(hierarchy, type)) {
    type = getFirstCreatableSubtype(hierarchy, type) ?? type
    changeType = true
  }

  $: extension =
    type != null
      ? client
        .getModel()
        .findAllSync(card.mixin.CreateCardExtension, {})
        .find((it) => hierarchy.isDerived(type, it._id))
      : undefined
</script>

{#if extension != null}
  <CreateCardPopupFull {title} {type} {space} {changeType} {allowChangeSpace} {description} on:close />
{:else}
  <CreateCardPopupSimple {title} {type} {space} {description} on:close />
{/if}
