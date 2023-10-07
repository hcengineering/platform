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
  import { Employee } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let lead: Employee
</script>

<div class="root">
  <div class="icon">
    <Avatar avatar={lead.avatar} size={'medium'} name={lead.name} />
  </div>
  <div class="textContainer">
    <div class="title">
      <Label label={tracker.string.ComponentLeadTitle} />
    </div>
    <div class="description">
      {lead.name}
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    width: 20rem;
  }

  .icon {
    display: inline-block;
    line-height: 0;
    flex-shrink: 0;
    font-size: 14px;
  }

  .textContainer {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    margin-top: -0.125rem;
    margin-left: 0.75rem;
  }

  .title {
    color: var(--theme-caption-color);
    font-weight: 500;
  }

  .description {
    display: flex;
    flex-flow: row wrap;
    min-width: 0;
    margin-top: 0.375rem;
  }
</style>
