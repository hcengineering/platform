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
  import { Ref } from '@hcengineering/core'
  import { Asset } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { ObjectPresenterType } from '@hcengineering/view'
  import card from '../plugin'
  import CardPresenter from './CardPresenter.svelte'

  export let value: Ref<Card> | undefined
  export let kind: 'list' | undefined = undefined
  export let type: ObjectPresenterType = 'link'
  export let icon: Asset | AnySvelteComponent | undefined = undefined

  let doc: Card | undefined
  const query = createQuery()
  $: value &&
    query.query(
      card.class.Card,
      { _id: value },
      (res) => {
        ;[doc] = res
      },
      { limit: 1 }
    )
</script>

<CardPresenter value={doc} {kind} {type} {icon} />
