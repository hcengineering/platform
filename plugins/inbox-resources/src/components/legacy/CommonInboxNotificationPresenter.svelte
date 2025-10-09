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
  import core, { Doc, Markup } from '@hcengineering/core'
  import { CommonInboxNotification } from '@hcengineering/notification'
  import { getEmbeddedLabel, IntlString, translateCB } from '@hcengineering/platform'
  import { Icon, Label, themeStore, tooltip } from '@hcengineering/ui'
  import { Person } from '@hcengineering/contact'
  import { getClient, LiteMessageViewer } from '@hcengineering/presentation'
  import { classIcon, DocNavLink } from '@hcengineering/view-resources'

  import PreviewTemplate from '../preview/PreviewTemplate.svelte'

  export let value: CommonInboxNotification

  const client = getClient()

  let content: Markup = ''
  let person: Person | undefined = undefined

  $: void updateContent(value.message, value.messageHtml)

  async function updateContent (message?: IntlString, messageHtml?: Markup): Promise<void> {
    if (messageHtml !== undefined) {
      content = messageHtml
    } else if (message !== undefined) {
      translateCB(message, value.props, $themeStore.language, (res) => {
        content = res
      })
    }
  }

  let headerObject: Doc | undefined = undefined

  $: value.headerObjectId &&
    value.headerObjectClass &&
    client.findOne(value.headerObjectClass, { _id: value.headerObjectId }).then((doc) => {
      headerObject = doc
    })

  let tooltipLabel: IntlString | undefined = undefined

  $: if (headerObject !== undefined) {
    tooltipLabel = value.header ?? client.getHierarchy().getClass(headerObject._class).label
  } else if (person !== undefined) {
    tooltipLabel = getEmbeddedLabel(person.name)
  } else {
    tooltipLabel = core.string.System
  }
</script>

<PreviewTemplate
  kind="default"
  color="primary"
  bind:person
  socialId={value.createdBy ?? value.modifiedBy}
  date={new Date(value.createdOn ?? value.modifiedOn)}
  fixHeight={true}
>
  <svelte:fragment slot="content">
    <span class="row overflow-label">
      {#if headerObject}
        {@const icon = value.headerIcon ?? classIcon(client, headerObject._class)}
        <div class="header">
          {#if icon}
            <span class="icon" use:tooltip={{ label: tooltipLabel }}>
              <Icon {icon} size="small" />
            </span>
          {/if}

          <DocNavLink object={headerObject} colorInherit>
            <Label
              label={value.header ?? client.getHierarchy().getClass(headerObject._class).label}
              params={value.intlParams}
            />
            :
          </DocNavLink>
        </div>
      {/if}
      <LiteMessageViewer message={content} colorInherit />
    </span>
  </svelte:fragment>
</PreviewTemplate>

<style lang="scss">
  .row {
    display: inline-flex;
    align-items: flex-start;
    gap: 0.25rem;
    max-height: 1.125rem;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    max-width: 1rem;
    min-width: 1rem;
  }
  .header {
    display: flex;
    align-items: center;
    gap: var(--spacing-0_5);
    font-weight: 500;
    color: var(--global-primary-TextColor);
  }
</style>
