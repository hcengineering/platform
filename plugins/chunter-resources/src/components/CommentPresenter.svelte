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
  import { AttachmentDocList } from '@hcengineering/attachment-resources'
  import type { Comment } from '@hcengineering/chunter'
  import { Person, PersonAccount, getName } from '@hcengineering/contact'
  import { Avatar, personAccountByIdStore, personByIdStore } from '@hcengineering/contact-resources'
  import { IdMap, Ref } from '@hcengineering/core'
  import { MessageViewer, getClient } from '@hcengineering/presentation'
  import { ShowMore, TimeSince } from '@hcengineering/ui'
  import { LinkPresenter, ObjectPresenter } from '@hcengineering/view-resources'

  export let value: Comment
  export let inline: boolean = false
  export let disabled = false
  export let inbox: boolean = false

  const client = getClient()

  async function getEmployee (
    value: Comment,
    employees: IdMap<Person>,
    accounts: IdMap<PersonAccount>
  ): Promise<Person | undefined> {
    const acc = accounts.get(value.modifiedBy as Ref<PersonAccount>)
    if (acc !== undefined) {
      const emp = employees.get(acc.person)
      return emp
    }
  }

  $: links = getLinks(value.message)

  function getLinks (content: string): HTMLLinkElement[] {
    const parser = new DOMParser()
    const parent = parser.parseFromString(content, 'text/html').firstChild?.childNodes[1] as HTMLElement
    return parseLinks(parent.childNodes)
  }

  function parseLinks (nodes: NodeListOf<ChildNode>): HTMLLinkElement[] {
    const res: HTMLLinkElement[] = []
    nodes.forEach((p) => {
      if (p.nodeType !== Node.TEXT_NODE) {
        if (p.nodeName === 'A') {
          res.push(p as HTMLLinkElement)
        }
        res.push(...parseLinks(p.childNodes))
      }
    })
    return res
  }
</script>

{#if inline}
  {#if !inbox}
    <ObjectPresenter _class={value.attachedToClass} objectId={value.attachedTo} accent noUnderline />
  {:else}
    <MessageViewer message={value.message} />
  {/if}
{:else}
  <div class="flex-row-top">
    {#await getEmployee(value, $personByIdStore, $personAccountByIdStore) then employee}
      <div class="avatar">
        <Avatar size={'medium'} avatar={employee?.avatar} name={employee?.name} />
      </div>
      <div class="flex-grow flex-col select-text">
        <div class="header">
          <div class="fs-title">
            {#if employee}{getName(client.getHierarchy(), employee)}{/if}
          </div>
          <div class="content-dark-color ml-4"><TimeSince value={value.modifiedOn} /></div>
        </div>
        <ShowMore fixed>
          <MessageViewer message={value.message} />
          <AttachmentDocList {value} />
          {#each links as link}
            <LinkPresenter {link} />
          {/each}
        </ShowMore>
      </div>
    {/await}
  </div>
{/if}

<style lang="scss">
  .avatar {
    margin-right: 1rem;
    min-width: 2.25rem;
  }
  .header {
    display: inline-flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.25rem;
  }
</style>
