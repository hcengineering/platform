<!--
// Copyright © 2023 Anticrm Platform Contributors.
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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import support, { docsLink, reportBugLink, supportLink, privacyPolicyLink } from '@hcengineering/support'
  import {
    AnySvelteComponent,
    Button,
    Icon,
    IconArrowLeft,
    Label,
    ListView,
    Scroller,
    capitalizeFirstLetter,
    closePopup,
    formatKey,
    getCurrentResolvedLocation,
    navigate,
    topSP
  } from '@hcengineering/ui'
  import view, { Action, ActionCategory } from '@hcengineering/view'
  import workbench from '../plugin'
  import RightArrowIcon from './icons/Collapsed.svelte'
  import DocumentationIcon from './icons/Documentation.svelte'
  import KeyboardIcon from './icons/Keyboard.svelte'
  import { WorkbenchEvents } from '@hcengineering/workbench'
  import { Analytics } from '@hcengineering/analytics'

  let shortcuts = false
  let actions: Action[] = []
  let categories: ActionCategory[] = []
  let selection: number = 0

  const client = getClient()

  function navigateToSettings () {
    closePopup()
    const loc = getCurrentResolvedLocation()
    loc.path[2] = loc.path[3] = settingId
    loc.path.length = 4
    navigate(loc)
  }

  async function getActions () {
    categories = await getClient().findAll(view.class.ActionCategory, [])
    const rawActions = await client.findAll(view.class.Action, [])

    const openAction = rawActions.find(
      (action) => action.label === view.string.Open && action.category === view.category.General
    )
    const deleteAction = rawActions.find(
      (action) => action.label === view.string.Delete && action.category === view.category.General
    )

    actions = rawActions.filter(
      (action) =>
        action.keyBinding &&
        action.keyBinding.length !== 0 &&
        action.label !== view.string.Open &&
        action.label !== view.string.Delete
    )

    deleteAction && actions.unshift(deleteAction)
    openAction && actions.unshift(openAction)

    actions.sort((a, b) => a.category.localeCompare(b.category))
  }
  getActions()

  interface HelpCard {
    icon: Asset | AnySvelteComponent
    title: IntlString
    description: IntlString
    onClick: () => void
    disabled?: boolean
  }

  const cards: HelpCard[] = [
    {
      icon: DocumentationIcon,
      title: workbench.string.Documentation,
      description: workbench.string.OpenPlatformGuide,
      onClick: () => {
        window.open(docsLink, '_blank')
        Analytics.handleEvent(WorkbenchEvents.DocumentationOpened)
      }
    },
    {
      icon: view.icon.Setting,
      title: setting.string.Settings,
      description: workbench.string.AccessWorkspaceSettings,
      onClick: navigateToSettings
    },
    {
      icon: KeyboardIcon,
      title: workbench.string.KeyboardShortcuts,
      description: workbench.string.HowToWorkFaster,
      onClick: () => {
        shortcuts = true
        Analytics.handleEvent(WorkbenchEvents.KeyboardShortcutsOpened)
      }
    }
  ]
</script>

<div class="helpAndSupportPopup">
  <div class="header">
    {#if shortcuts}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="mr-4 cursor-pointer" on:click={() => (shortcuts = !shortcuts)}>
        <Icon icon={IconArrowLeft} size={'medium'} fill={'var(--content-color)'} />
      </div>
    {/if}
    <span class="fs-title overflow-label">
      <Label label={shortcuts ? workbench.string.KeyboardShortcuts : workbench.string.HelpCenter} />
    </span>
  </div>
  {#if !shortcuts}
    {#each cards as card}
      <div class="clear-mins card {!card.disabled ? 'cursor-pointer focused-button' : ''}">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="container" on:click={card.onClick}>
          <Icon icon={card.icon} size={'small'} fill={'var(--content-color)'} />
          <div class="content">
            <div class="fs-title">
              <Label label={card.title} />
            </div>
            <div class="text-sm content-dark-color"><Label label={card.description} /></div>
          </div>
          <div class="rightIcon">
            <Icon icon={RightArrowIcon} size={'small'} />
          </div>
        </div>
      </div>
    {/each}
    <div class="flex-grow" />
  {:else}
    <!-- Keyboard shortcuts -->
    <Scroller padding={'0 .5rem'} fade={topSP} noStretch checkForHeaders>
      <ListView count={actions.length} noScroll addClass={'rounded'} bind:selection>
        <svelte:fragment slot="category" let:item>
          {@const action = actions[item]}
          {#if item === 0 || (item > 0 && actions[item - 1].category !== action.category)}
            {#if action.category}
              {@const category = categories.find((cat) => cat._id === action.category)}
              {#if category?.label && category.label !== categories.find((cat) => cat._id === actions[item - 1]?.category)?.label}
                <div class="category-box font-semi-bold text-base categoryHeader clear-mins">
                  <Label label={category.label} />
                </div>
              {/if}
            {/if}
          {/if}
        </svelte:fragment>
        <svelte:fragment slot="item" let:item>
          {@const action = actions[item]}
          <div class="flex-row-center flex-between flex-grow ml-2 p-3 text-base clear-mins">
            <div class="mr-4 {selection === item ? 'caption-color' : 'dark-color'}">
              <Icon icon={action.icon ?? IconArrowLeft} size={'small'} />
            </div>
            <div class="flex-grow {selection === item ? 'caption-color' : 'content-color'}">
              <Label label={action.label} />
            </div>
            <div class="mr-2 text-md flex-row-center">
              {#if action.keyBinding}
                {#each action.keyBinding as key, i}
                  {#if i !== 0}
                    <div class="ml-2 mr-2 lower"><Label label={view.string.Or} /></div>
                  {/if}
                  <div class="flex-row-center">
                    {#each formatKey(key) as k, jj}
                      {#if jj !== 0}
                        <div class="ml-1 mr-1 lower"><Label label={view.string.Then} /></div>
                      {/if}
                      {#each k as kk}
                        <div class="flex-center text-sm key-box">
                          {capitalizeFirstLetter(kk.trim())}
                        </div>
                      {/each}
                    {/each}
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </svelte:fragment>
      </ListView>
    </Scroller>
  {/if}
  <div class="footer">
    <a href={privacyPolicyLink} target="_blank">
      <Button id="privacy-policy" kind={'ghost'} label={support.string.PrivacyPolicy} stopPropagation={false} />
    </a>
    <a href={reportBugLink} target="_blank">
      <Button id="report-a-bug" kind={'primary'} label={support.string.ReportBug} stopPropagation={false} />
    </a>
    <a href={supportLink}>
      <Button
        id="contact-us"
        icon={support.icon.Support}
        kind={'ghost'}
        label={support.string.ContactUs}
        stopPropagation={false}
      />
    </a>
  </div>
</div>

<style lang="scss">
  .card {
    margin: 1rem 1rem 0 1rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.75rem;
  }
  .container {
    display: flex;
    flex-direction: row;
    padding: 1rem;
    width: 100%;
  }
  .content {
    padding: 0 10px;
    width: 100%;
  }
  .rightIcon {
    align-self: center;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
    margin: 0 0.5rem 0.5rem;
    padding-top: 0.625rem;
  }
  .key-box {
    padding: 0 0.5rem;
    min-width: 1.5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
  .key-box + .key-box {
    margin-left: 0.5rem;
  }
  .category-box {
    position: sticky;
    padding: 0.5rem 1rem;
    top: 0;
    min-height: 2.5rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-comp-header-color);
    border-radius: 0.25rem;
  }
</style>
