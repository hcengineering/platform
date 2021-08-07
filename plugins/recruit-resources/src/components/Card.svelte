<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { Avatar } from '@anticrm/presentation'
  import LabelStatus from './LabelStatus.svelte'
  import Tag from './Tag.svelte'
  import File from './icons/File.svelte'

  interface Person {
    firstName: string
    lastName: string
    email: string
    description: string
    city: string
    state: string
  }

  export let user: Person

</script>

<div class="card-container">
  <div class="status"><LabelStatus label={user.state} color={'var(--primary-button-enabled)'} /></div>
  <div class="avatar"><Avatar size={88} /></div>
  <div class="name">{user.lastName} {user.firstName}</div>
  <div class="description">{user.description}</div>
  <div class="city">{user.city}</div>
  <Tag icon={File} label={'Application'} />
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 24px;
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 12px;

    .status {
      display: flex;
      flex-direction: row-reverse;
      width: 100%;
      margin-bottom: 16px;
    }
    .avatar {
      height: 88px;
    }
    .name {
      margin: 16px 0 4px;
      font-weight: 500;
      font-size: 16px;
      line-height: 150%;
      color: var(--theme-caption-color);
    }
    .description, .city {
      font-size: 12px;
      color: var(--theme-content-dark-color);
    }
    .city {
      margin-bottom: 16px;
    }

    &:hover {
      background-color: var(--theme-bg-accent-hover);
      box-shadow: 0px 12px 40px rgba(0, 0, 0, .15);
    }
  }
</style>
