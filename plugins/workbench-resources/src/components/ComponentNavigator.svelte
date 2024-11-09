<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import {AnyComponent, Breadcrumb, Component, Header, Separator} from '@hcengineering/ui'
  
  import { IntlString, Asset } from '@hcengineering/platform'

  export let navigationComponent: AnyComponent
  export let navigationComponentProps: Record<string, any> | undefined
  export let navigationComponentLabel: IntlString
  export let navigationComponentIcon: Asset
  export let mainComponentLabel: IntlString
  export let mainComponentIcon: Asset

</script>

<div class="hulyComponent">
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <Header adaptive={'disabled'}>
        <Breadcrumb icon={navigationComponentIcon} label={navigationComponentLabel} size={'large'} />
      </Header>
      <Component
        is={navigationComponent}
        props={navigationComponentProps}
      />
    </div>
    <Separator name={'navigationSection'} index={0} color={'var(--theme-divider-color)'} />
    <div class="hulyComponent-content__column">
      <Header adaptive={'disabled'}>
        <Breadcrumb icon={mainComponentIcon} label={mainComponentLabel} size={'large'} />
      </Header>
      <slot />
    </div>
  </div>
</div>
