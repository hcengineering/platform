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
  import activity from '@anticrm/activity'
  import type { Doc } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import type { Asset } from '@anticrm/platform'
  import { ActionIcon,AnyComponent,AnySvelteComponent,Component,Icon,IconClose,IconExpand,IconMoreH,Scroller } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let title: string
  export let subtitle: string | undefined = undefined
  export let icon: Asset | AnySvelteComponent
  export let fullSize: boolean = true
  export let rightSection: AnyComponent | undefined = undefined
  export let object: Doc

  const dispatch = createEventDispatcher()
</script>

<div class="antiOverlay" on:click={() => { dispatch('close') }} />
<div class="antiDialogs antiComponent" class:fullSize>
  {#if fullSize}
    <div class="ad-section-50 divide">
      <div class="ac-header short mirror divide">
        <div class="ac-header__wrap-title">
          {#if icon }<div class="ac-header__icon"><Icon {icon} size={'large'}/></div>{/if}
          <div class="ac-header__wrap-description">
            <span class="ac-header__title">{title}</span>
            {#if subtitle }<span class="ac-header__description">{subtitle}</span>{/if}
          </div>
        </div>
        <Component is={notification.component.LastViewEditor} props={{ value: object }} />
      </div>
      {#if $$slots.subtitle}
        <div class="ac-subtitle">
          <div class="ac-subtitle-content">
            <slot name="subtitle" />
          </div>
        </div>
      {/if}
      <Scroller>
        <div class="p-10"><slot /></div>
      </Scroller>
    </div>
    <div class="ad-section-50">
      <Component is={rightSection ?? activity.component.Activity} props={{ object, fullSize }} />
    </div>
  {:else}
    <div class="ac-header short mirror-tool divide">
      <div class="ac-header__wrap-title">
        {#if icon }<div class="ac-header__icon"><Icon {icon} size={'large'}/></div>{/if}
        <div class="ac-header__wrap-description">
          <span class="ac-header__title">{title}</span>
          {#if subtitle }<span class="ac-header__description">{subtitle}</span>{/if}
        </div>
      </div>
      <Component is={notification.component.LastViewEditor} props={{ value: object }} />
    </div>
    {#if $$slots.subtitle}
      <div class="ac-subtitle">
        <div class="ac-subtitle-content">
          <slot name="subtitle" />
        </div>
      </div>
    {/if}
    <Component is={activity.component.Activity} props={{ object, fullSize }}>
      <slot />
    </Component>
  {/if}

  <div class="ad-tools">
    <div class="tool">
      <ActionIcon icon={IconExpand} size={'medium'} action={() => { fullSize = !fullSize }} />
    </div>
    <div class="tool">
      <ActionIcon icon={IconClose} size={'medium'} action={() => { dispatch('close') }} />
    </div>
  </div>
</div>
