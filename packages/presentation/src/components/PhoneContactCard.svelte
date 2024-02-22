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
  export let data: Record<string, string> = {}
</script>

<div class="flex-col ml-4 mt-4 mb-4 mr-4 flex-gap-1">
  <table class="ml-4 mt-2">
    <thead>
    <tr>
      <th>Index</th>
      <th>Value</th>
    </tr>
    </thead>
    <tbody>
    {#each Object.entries(data) as [key, value], index}
      <tr>
        <td>{index + 1}</td>
        <td>
          {#if typeof value === 'object'}
            <table>
              {#each Object.entries(value) as [name, item]}
                <tr>
                  <td>{name}</td>
                  <td>{item}</td>
                </tr>
              {/each}
            </table>
          {:else}
            {value}
          {/if}
        </td>
      </tr>
    {/each}
    </tbody>
  </table>
</div>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        border: 1px solid #fff;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #fff;
    }
</style>
