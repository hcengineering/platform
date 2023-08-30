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
  import type { IntlString } from '@hcengineering/platform'
  import { Button, IconClose, Label, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { deviceOptionsStore as deviceInfo, resizeObserver, IconBack } from '@hcengineering/ui'
  import IconForward from './icons/Forward.svelte'

  export let label: IntlString
  export let labelProps: any | undefined = undefined
  export let okAction: () => Promise<void> | void
  export let canSave: boolean = false
  export let okLabel: IntlString = presentation.string.Create
  export let onCancel: Function | undefined = undefined
  export let backAction: () => Promise<void> | void = () => {}
  export let isBack: boolean = false
  export let fullSize: boolean = false
  export let numberOfBlocks: number = 0
  export let thinHeader: boolean = false
  export let accentHeader: boolean = false
  export let hideSubheader: boolean = false
  export let hideContent: boolean = false
  export let hideAttachments: boolean = false
  export let hideFooter: boolean = false
  export let gap: string | undefined = undefined
  export let width: 'large' | 'medium' | 'small' | 'x-small' | 'menu' = 'large'
  export let noFade = false

  const dispatch = createEventDispatcher()

  let okProcessing = false
  $: headerDivide = hideContent && numberOfBlocks > 1
</script>

<form
  id={label}
  class="antiCard {$deviceInfo.isMobile ? 'mobile' : 'dialog'} {width}"
  class:full={fullSize}
  on:keydown
  on:submit|preventDefault={() => {}}
  use:resizeObserver={() => {
    dispatch('changeContent')
  }}
>
  <div
    class="antiCard-header"
    class:withSub={$$slots.subheader && !hideSubheader}
    class:thinHeader
    class:border-bottom-popup-divider={headerDivide}
  >
    <div class="antiCard-header__title-wrap">
      {#if $$slots.header}
        <slot name="header" />
        <span class="antiCard-header__divider"><IconForward size={'small'} /></span>
      {/if}
      {#if isBack}
        <Button icon={IconBack} kind={'ghost'} size={'small'} on:click={backAction} />
      {/if}
      <div class="antiCard-header__title" class:accentHeader>
        {#if $$slots.title}
          <slot name="title" {label} labelProps={labelProps ?? {}} />
        {:else}
          <Label {label} params={labelProps ?? {}} />
        {/if}
      </div>
    </div>
    <div class="ml-4 buttons-group small-gap content-dark-color">
      <Button
        id="card-close"
        focusIndex={10002}
        icon={IconClose}
        iconProps={{ size: 'medium', fill: 'var(--theme-dark-color)' }}
        kind={'ghost'}
        size={'small'}
        on:click={() => {
          if (onCancel) {
            onCancel()
          } else {
            dispatch('close')
          }
        }}
      />
    </div>
  </div>
  {#if $$slots.subheader && !hideSubheader}
    <div class="antiCard-subheader">
      <slot name="subheader" />
    </div>
  {/if}
  {#if !hideContent}
    <div class="antiCard-content">
      <Scroller padding={$$slots.pool ? '.5rem 1.5rem' : '.5rem 1.5rem 1.5rem'} {gap} {noFade}>
        <slot />
      </Scroller>
    </div>
  {/if}
  {#if $$slots.pool}
    <div class="antiCard-pool">
      <slot name="pool" />
    </div>
  {/if}
  {#if $$slots.blocks && numberOfBlocks}
    {#if numberOfBlocks === 1}
      <div class="antiCard-block">
        <slot name="blocks" block={0} />
      </div>
    {:else}
      <Scroller noFade={false}>
        {#each [...Array(numberOfBlocks).keys()] as block}
          <div class="antiCard-blocks" class:border-top-none={headerDivide && block === 0}>
            <slot name="blocks" {block} />
          </div>
        {/each}
      </Scroller>
    {/if}
  {/if}
  {#if $$slots.attachments && !hideAttachments}
    <div class="antiCard-attachments">
      <Scroller horizontal contentDirection={'horizontal'} {gap} noFade={false}>
        <div class="antiCard-attachments__container">
          <slot name="attachments" />
        </div>
      </Scroller>
    </div>
  {/if}
  {#if !hideFooter}
    <div class="antiCard-footer divide reverse">
      <div class="buttons-group text-sm flex-no-shrink">
        {#if $$slots.buttons}
          <slot name="buttons" />
        {/if}
        <Button
          loading={okProcessing}
          focusIndex={10001}
          disabled={!canSave}
          label={okLabel}
          kind={'accented'}
          size={'large'}
          on:click={() => {
            if (okProcessing) {
              return
            }
            okProcessing = true
            const r = okAction()
            if (r instanceof Promise) {
              r.then(() => {
                okProcessing = false
                dispatch('close')
              })
            } else {
              okProcessing = false
              dispatch('close')
            }
          }}
        />
      </div>
      <div class="buttons-group small-gap text-sm">
        <slot name="footer" />
        {#if $$slots.error}
          <div class="antiCard-footer__error">
            <slot name="error" />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</form>
