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

<div class="card-container">
  <slot />
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0.75rem 1.5rem;
    color: var(--dark-color);
    background-color: var(--theme-kanban-card-bg-color);
    border: 1px dotted var(--theme-kanban-card-border);
    border-radius: 0.75rem;
    cursor: pointer;

    &:hover {
      color: var(--theme-caption-color);
    }
  }
</style>
