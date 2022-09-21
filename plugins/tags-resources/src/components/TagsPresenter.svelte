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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, Icon, tooltip } from '@hcengineering/ui'
  import { getCollectionCounter } from '@hcengineering/view-resources'
  import tagsId from '../plugin'
  import TagsPresentationPopup from './TagsPresentationPopup.svelte'

  export let value: Doc
  export let _class: Ref<Class<Doc>>
  export let key: string
  export let icon: Asset | AnySvelteComponent = tagsId.icon.Tags

  const client = getClient()

  $: attr = client.getHierarchy().getAttribute(_class, key)
  $: tags = getCollectionCounter(client.getHierarchy(), value, { key, attr }) ?? 0
</script>

{#if tags > 0}
  <div
    use:tooltip={{
      label: attr.label,
      component: TagsPresentationPopup,
      props: { object: value, _class, key: { key, attr } }
    }}
    class="sm-tool-icon"
  >
    <span class="icon"><Icon {icon} size="small" /></span>&nbsp;{tags}
  </div>
{/if}
