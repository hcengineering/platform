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
  import { Doc, Ref } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { createQuery } from '@hcengineering/presentation'

  import ChannelPresenter from './ChannelView.svelte'

  export let _id: Ref<DocNotifyContext>

  const objectQuery = createQuery()
  const contextQuery = createQuery()

  let notifyContext: DocNotifyContext | undefined = undefined
  let object: Doc | undefined = undefined

  $: contextQuery.query(notification.class.DocNotifyContext, { _id }, (res) => {
    notifyContext = res[0]
  })

  $: notifyContext &&
    objectQuery.query(notifyContext.attachedToClass, { _id: notifyContext.attachedTo }, (res) => {
      object = res[0]
    })
</script>

{#if notifyContext && object}
  <div class="antiComponent">
    <ChannelPresenter {notifyContext} {object} />
  </div>
{/if}
