<!--
// Copyright © 2025s Hardcore Engineering Inc.
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
  import { MasterTag } from '@hcengineering/card'
  import { ClassAttributes } from '@hcengineering/setting-resources'
  import setting from '@hcengineering/setting-resources/src/plugin'
  import { ButtonIcon, showPopup } from '@hcengineering/ui'
  import card from '../../plugin'
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import core, { ClassPermission, Ref } from '@hcengineering/core'
  import view from '@hcengineering/view'

  export let masterTag: MasterTag

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let isRestricted: boolean =
    client.getModel().findObject(getPermissionRef(false)) !== undefined ||
    client.getModel().findObject(getPermissionRef(true)) !== undefined

  function getPermissionRef (forbidden: boolean): Ref<ClassPermission> {
    return `${masterTag._id}_${forbidden ? 'forbidden' : 'allowed'}` as Ref<ClassPermission>
  }

  function changeRestricted (): void {
    showPopup(
      MessageBox,
      {
        label: setting.string.Restricted,
        message: setting.string.RestrictedAttributeWarning,
        action: async () => {
          isRestricted = true
          const isMixin = hierarchy.isMixin(masterTag._id)
          const objectClass = hierarchy.getBaseClass(masterTag._id)
          const txClass = isMixin ? core.class.TxMixin : core.class.TxUpdateDoc
          await client.createDoc(
            core.class.ClassPermission,
            core.space.Model,
            {
              objectClass,
              txClass,
              txMatch: {
                [isMixin ? 'mixin' : 'objectClass']: masterTag._id
              },
              scope: 'space',
              forbid: false,
              label: view.string.AllowAttributeChanges,
              description: masterTag.label,
              targetClass: masterTag._id
            },
            getPermissionRef(false)
          )
          await client.createDoc(
            core.class.ClassPermission,
            core.space.Model,
            {
              objectClass,
              txClass,
              txMatch: {
                [isMixin ? 'mixin' : 'objectClass']: masterTag._id
              },
              scope: 'space',
              forbid: true,
              label: view.string.ForbidAttributeChanges,
              description: masterTag.label,
              targetClass: masterTag._id
            },
            getPermissionRef(true)
          )
        }
      },
      'top',
      (res) => {
        if (res !== undefined) {
          isRestricted = res
        }
      }
    )
  }
</script>

<ClassAttributes
  ofClass={card.class.Card}
  _class={masterTag._id}
  showHierarchy
  showHeader={false}
  disabled={false}
  isCard
>
  <div slot="header">
    <ButtonIcon
      kind={'secondary'}
      icon={card.icon.Lock}
      size={'small'}
      tooltip={{
        label: setting.string.Restricted
      }}
      disabled={isRestricted}
      on:click={changeRestricted}
    />
  </div>
</ClassAttributes>
