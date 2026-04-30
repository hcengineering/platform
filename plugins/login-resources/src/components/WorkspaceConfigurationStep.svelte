<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import type { WorkspaceConfiguration } from '@hcengineering/account-client'
  import { type Data, type PluginConfiguration } from '@hcengineering/core'
  import type { Plugin } from '@hcengineering/platform'
  import { PluginConfigurationCard } from '@hcengineering/presentation'
  import { Button, Icon, IconInfo, Label, Scroller, StylishEdit, Toggle, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import login from '../plugin'
  import { getDefaultPluginConfigurations } from '../utils'

  export let configuration: WorkspaceConfiguration
  export let workspaceName: string

  const dispatch = createEventDispatcher<{ back: undefined, done: { configuration: WorkspaceConfiguration } }>()

  let modules: Data<PluginConfiguration>[] | null | undefined = undefined

  let withDemoContent: boolean = configuration.withDemoContent ?? true
  let disabled = new Set<Plugin>(configuration.disabledPlugins ?? [])

  $: trimmedName = (workspaceName ?? '').trim()
  $: canSubmit = trimmedName.length > 0

  onMount(async () => {
    modules = await getDefaultPluginConfigurations()
  })

  function setEnabled (pluginId: Plugin, enabled: boolean): void {
    const next = new Set(disabled)
    if (enabled) {
      next.delete(pluginId)
    } else {
      next.add(pluginId)
    }
    disabled = next
  }

  function buildResult (): WorkspaceConfiguration {
    const result: WorkspaceConfiguration = { withDemoContent }
    if (disabled.size > 0) {
      result.disabledPlugins = Array.from(disabled)
    }
    return result
  }

  function done (): void {
    if (!canSubmit) return
    workspaceName = trimmedName
    dispatch('done', { configuration: buildResult() })
  }

  function back (): void {
    dispatch('back')
  }
</script>

<div class="customizeStep flex-col">
  <Scroller padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
    <section class="block">
      <div class="name-input mt-1">
        <StylishEdit label={login.string.Workspace} bind:value={workspaceName} />
      </div>
    </section>

    <section class="block mt-6">
      <h3 class="fs-title">
        <Label label={login.string.InitialContent} />
      </h3>
      <label class="config-row mt-3">
        <span class="config-row__label">
          <Label label={login.string.CreateSampleProjects} />
        </span>
        <button
          type="button"
          class="config-row__info"
          aria-label={'Description'}
          use:tooltip={{ label: login.string.CreateSampleProjectsDesc, direction: 'top' }}
          on:click|preventDefault|stopPropagation
        >
          <Icon icon={IconInfo} size={'small'} />
        </button>
        <span class="config-row__spacer" />
        <Toggle bind:on={withDemoContent} />
      </label>
    </section>

    <section class="block mt-6">
      <h3 class="fs-title">
        <Label label={login.string.Modules} />
      </h3>
      {#if modules === undefined}
        <div class="my-3 secondary-textColor">
          <Label label={login.string.LoadingAccount} />
        </div>
      {:else if modules === null}
        <div class="my-3 secondary-textColor">
          <Label label={login.string.ModuleListUnavailable} />
        </div>
      {:else}
        <div class="my-3 secondary-textColor">
          <Label label={login.string.ModulesDesc} />
        </div>
        <div class="modules-grid mt-4">
          {#each modules as module}
            <PluginConfigurationCard
              label={module.label}
              description={module.description}
              icon={module.icon}
              enabled={!disabled.has(module.pluginId)}
              beta={module.beta}
              compact
              on:toggle={(e) => {
                setEnabled(module.pluginId, e.detail.enabled)
              }}
            />
          {/each}
        </div>
      {/if}
    </section>
  </Scroller>

  <div class="footer flex-row-reverse gap-around-2 p-4">
    <Button kind={'primary'} label={login.string.CreateWorkspace} disabled={!canSubmit} on:click={done} />
    <Button label={login.string.BackToCreate} on:click={back} />
  </div>
</div>

<style lang="scss">
  .customizeStep {
    height: 100%;
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
  }
  .footer {
    border-top: 1px solid var(--theme-divider-color);
  }
  .secondary-textColor {
    color: var(--theme-content-color);
    opacity: 0.7;
  }
  .config-row {
    display: flex;
    align-items: center;
    width: 100%;
    height: 3.25rem;
    padding: 0 0.875rem;
    gap: 0.625rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.5rem;
    color: var(--theme-content-color);
    cursor: pointer;
    transition: border-color 120ms ease;

    &:hover {
      border-color: var(--theme-button-border-hover, var(--theme-divider-color));
    }
  }
  .config-row__label {
    color: var(--theme-caption-color);
    font-weight: 500;
  }
  .config-row__spacer {
    flex-grow: 1;
  }
  .config-row__info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: var(--theme-darker-color);
    cursor: help;

    &:hover,
    &:focus-visible {
      color: var(--theme-content-color);
      background-color: var(--theme-divider-color);
      outline: none;
    }
  }

  .modules-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;

    @media (min-width: 40rem) {
      grid-template-columns: 1fr 1fr;
    }
  }
  .name-input {
    width: 100%;
  }
</style>
