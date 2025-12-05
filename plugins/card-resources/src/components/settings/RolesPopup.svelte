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
  import { MasterTag, Role, Tag } from '@hcengineering/card'
  import core, { Ref } from '@hcengineering/core'
  import { ObjectPopup } from '@hcengineering/presentation'
  import card from '../../plugin'

  export let masterTag: MasterTag | Tag
  export let roles: Ref<Role>[]
</script>

<ObjectPopup
  _class={card.class.Role}
  ignoreObjects={roles}
  create={{
    label: core.string.Role,
    component: card.component.CreateRolePopup,
    props: { masterTag }
  }}
  on:close
>
  <svelte:fragment slot="item" let:item={doc}>
    <div class="overflow-label">
      {doc.name}
    </div>
  </svelte:fragment>
</ObjectPopup>
