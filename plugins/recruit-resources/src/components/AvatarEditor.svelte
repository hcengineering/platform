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
  import type { IntlString } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import { Label, Button, Grid, IconClose } from '@anticrm/ui'
  import recruit from '../plugin'

  import Avatar from '../../img/avatar.png'

  export let label: IntlString

  const dispatch = createEventDispatcher()
</script>

<div class="dialog-container">
  <div class="abs-lt-content label">
    <Label {label} />
  </div>
  <div class="abs-rt-content tool" on:click={() => { dispatch('close') }}>
    <IconClose size={'small'} />
  </div>

  <div class="avatar">
    <img src={Avatar} alt={'Avatar'} />
  </div>

  <div class="abs-lb-content actions">
    <Grid columnGap={.5}>
      <Button label={recruit.string.Edit} />
      <Button label={recruit.string.Delete} />
    </Grid>
  </div>
  <div class="abs-rb-content">
    <Button label={recruit.string.Save} />
  </div>
</div>

<style lang="scss">
  .dialog-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40rem;
    height: 23.75rem;
    background-color: var(--theme-bg-color);
    border-radius: 1.25rem;
    filter: drop-shadow(0 0 4rem rgba(0, 0, 0, .35));

    .label {
      font-weight: 500;
      font-size: 1rem;
      color: var(--theme-caption-color);
      user-select: none;
    }

    .avatar {
      position: relative;
      width: 13.75rem;
      height: 13.75rem;
      background-color: #fff;
      border-radius: 50%;
      overflow: hidden;

      &::after, &::before {
        content: '';
        position: absolute;
        z-index: 1;
      }
      &::after {
        top: .65rem;
        left: .65rem;
        bottom: .65rem;
        right: .65rem;
        border: 1px solid rgba(255, 255, 255, .6);
        border-radius: 50%;
      }
      &::before {
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        width: 13.75rem;
        height: 13.75rem;
        background-color: rgba(255, 255, 255, .2);
        clip-path: path('M110,0C49.2,0,0,49.2,0,110c0,60.8,49.2,110,110,110s110-49.2,110-110C220,49.2,170.8,0,110,0z M110,212 C53.7,212,8,166.3,8,110C8,53.7,53.7,8,110,8s102,45.7,102,102C212,166.3,166.3,212,110,212z');
        filter: blur(3px);
      }
    }

    .tool {
      opacity: .4;
      cursor: pointer;
      &:hover { opacity: 1; }
    }
  }
</style>