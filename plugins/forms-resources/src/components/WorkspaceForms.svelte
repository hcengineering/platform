<!--
// Copyright © 2026 TraceX SAS.
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
  import card, { type CardSpace, type MasterTag } from '@hcengineering/card'
  import { concatLink } from '@hcengineering/core'
  import { formsId, type FormConfiguration } from '@hcengineering/forms'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { createQuery, getCurrentWorkspaceUrl } from '@hcengineering/presentation'
  import { Breadcrumb, Button, Header, Label, Loading, Scroller, getCurrentLocation, navigate } from '@hcengineering/ui'
  import forms from '../plugin'

  let configurations: FormConfiguration[] = []
  let types: MasterTag[] = []
  let spaces: CardSpace[] = []
  let loaded = false
  const query = createQuery()
  const typesQuery = createQuery()
  const spacesQuery = createQuery()
  const front = getMetadata(presentation.metadata.FrontUrl) || window.location.origin

  query.query(
    forms.class.FormConfiguration,
    {},
    (docs) => {
      configurations = docs
      loaded = true
    },
    { sort: { modifiedOn: -1 } }
  )
  typesQuery.query(card.class.MasterTag, { removed: { $ne: true } }, (docs) => {
    types = docs
  })
  spacesQuery.query(card.class.CardSpace, {}, (docs) => {
    spaces = docs
  })

  $: rows = configurations.flatMap((configuration) => {
    const masterTag = types.find((type) => type._id === configuration.masterTag)
    if (masterTag === undefined) return []
    return [
      {
        configuration,
        masterTag,
        space: spaces.find((space) => space._id === configuration.targetSpace),
        link: concatLink(
          front,
          `${formsId}/${encodeURIComponent(getCurrentWorkspaceUrl())}/${encodeURIComponent(configuration._id)}`
        )
      }
    ]
  })

  function configure (masterTag: MasterTag): void {
    const loc = getCurrentLocation()
    loc.path[3] = 'types'
    loc.path[4] = masterTag._id
    loc.path.length = 5
    loc.fragment = undefined
    navigate(loc)
  }
</script>

<div class="hulyComponent">
  <Header adaptive="disabled">
    <Breadcrumb icon={card.icon.Card} label={forms.string.Forms} size="large" isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller padding="var(--spacing-3)">
      {#if !loaded}<Loading />
      {:else if rows.length === 0}<p><Label label={forms.string.NoConfiguredForms} /></p>
      {:else}
        <table>
          <thead
            ><tr>
              <th scope="col"><Label label={card.string.MasterTag} /></th>
              <th scope="col"><Label label={forms.string.TargetSpace} /></th>
              <th scope="col"><Label label={forms.string.FormMode} /></th>
              <th scope="col"><Label label={forms.string.PublicationStatus} /></th>
              <th scope="col"><Label label={forms.string.FormLink} /></th>
            </tr></thead
          >
          <tbody>
            {#each rows as row (row.configuration._id)}
              <tr>
                <td
                  ><Button kind="link" justify="left" on:click={() => configure(row.masterTag)}>
                    <span slot="content"><Label label={row.masterTag.label} /></span>
                  </Button></td
                >
                <td>{#if row.configuration.mode === 'private-auto'}<Label label={forms.string.AutoSpace} />
                  {:else}{row.space?.name ?? '—'}{/if}</td>
                <td><Label label={row.configuration.mode === 'private-auto' ? forms.string.PrivateAutoForm :
                  row.configuration.mode === 'private-fixed' ? forms.string.PrivateFixedForm : forms.string.PublicForm} /></td>
                <td><Label label={row.configuration.enabled ? forms.string.Published : forms.string.Unpublished} /></td>
                <td
                  >{#if row.configuration.enabled}
                    <a href={row.link} target="_blank" rel="noreferrer"><Label label={forms.string.FormLink} /></a>
                  {:else}—{/if}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </Scroller>
  </div>
</div>

<style lang="scss">
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  th,
  td {
    padding: var(--spacing-1_5);
    text-align: left;
    border-bottom: 1px solid var(--theme-divider-color);
  }
  th {
    color: var(--global-secondary-TextColor);
    font-weight: 500;
  }
  a {
    color: var(--theme-accent-color);
  }
  p {
    margin: 0;
    color: var(--global-secondary-TextColor);
  }
</style>
