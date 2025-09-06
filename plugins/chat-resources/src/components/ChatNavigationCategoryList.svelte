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
  import card, { MasterTag } from '@hcengineering/card'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { SpecialView } from '@hcengineering/workbench-resources'
  import { getClient } from '@hcengineering/presentation'
  import view, { BuildModelKey, type ViewOptions } from '@hcengineering/view'

  export let type: Ref<MasterTag>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: clazz = hierarchy.hasClass(type) ? hierarchy.getClass(type) : undefined

  const defaultOptions: ViewOptions = {
    groupBy: ['parent'],
    orderBy: ['modifiedBy', SortingOrder.Descending]
  }

  const defaultConfig: (BuildModelKey | string)[] = [
    {
      key: '',
      props: {
        showParent: false,
        shrink: true
      }
    },
    {
      displayProps: {
        grow: true
      },
      key: ''
    },
    {
      displayProps: {
        fixed: 'left',
        key: 'tags',
        compression: true
      },
      key: '',
      label: card.string.Tags,
      presenter: card.component.CardTagsColored,
      props: {
        showType: false
      }
    },
    {
      key: '',
      presenter: card.component.LabelsPresenter,
      label: card.string.Labels,
      displayProps: { compression: true },
      props: { fullSize: true }
    },
    {
      key: 'modifiedOn', // 'createdOn',
      displayProps: { key: 'modifiedOn', fixed: 'left', dividerBefore: true }
    },
    {
      key: 'modifiedBy', // 'createdBy',
      displayProps: { key: 'modifiedBy', fixed: 'right', align: 'center' },
      props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
    }
  ]
</script>

{#if clazz}
  <SpecialView
    _class={type}
    icon={clazz.icon ?? card.icon.Card}
    label={clazz.label}
    defaultViewletDescriptor={view.viewlet.List}
    actionVisible={true}
    defaultViewOptions={defaultOptions}
    {defaultConfig}
  />
{/if}
