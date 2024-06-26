<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Breadcrumb, Button, Header, Scroller, showPopup } from '@hcengineering/ui'
  import Label from '@hcengineering/ui/src/components/Label.svelte'
  import setting from '../plugin'
  import AddDomain from './AddDomain.svelte'

  const showCreateDialog = async () => {
    showPopup(AddDomain, { targetElement: null }, 'top')
  }
</script>

<div class="hulyComponent">
  <Header>
    <Breadcrumb icon={setting.icon.Security} label={setting.string.Security} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        <div class="mb-1 text-normal font-medium caption-color">
          <Label label={setting.string.PermittedEmailDomains} />
        </div>
        <div class="flex-col flex-gap-2 items-start">
          <Label label={setting.string.EmailDomainRegistrationMessage} />
          <Button label={setting.string.AddDomain} on:click={showCreateDialog} />
        </div>
      </div>
    </Scroller>
  </div>
</div>
