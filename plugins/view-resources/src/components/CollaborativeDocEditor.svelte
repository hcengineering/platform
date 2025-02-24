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
  import contact from '@hcengineering/contact'
  import { Doc } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { KeyedAttribute } from '@hcengineering/presentation'
  import { CollaborativeAttributeSectionBox } from '@hcengineering/text-editor-resources'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { getCollaborationUser } from '../utils'

  export let object: Doc
  export let key: KeyedAttribute

  const user = getCollaborationUser()
  let userComponent: AnySvelteComponent | undefined
  void getResource(contact.component.CollaborationUserAvatar).then((component) => {
    userComponent = component
  })
</script>

{#key object._id}
  {#key key.key}
    <CollaborativeAttributeSectionBox {object} {key} {user} {userComponent} label={key.attr.label} />
  {/key}
{/key}
