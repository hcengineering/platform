<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Doc } from '@hcengineering/core'

  import { getAttribute, getClient, KeyedAttribute, updateAttribute } from '@hcengineering/presentation'
  import { FullDescriptionBox } from '@hcengineering/text-editor'

  // export let objectId: Ref<Doc>
  // export let _class: Ref<Class<Doc>>
  export let object: Doc
  // export let space: Ref<Space>
  export let key: KeyedAttribute

  $: description = getAttribute(getClient(), object, key)
</script>

{#key description}
  <FullDescriptionBox
    label={key.attr.label}
    content={description}
    on:save={(res) => {
      if (res.detail != null) {
        updateAttribute(getClient(), object, object._class, key, res.detail)
      }
    }}
  />
{/key}
