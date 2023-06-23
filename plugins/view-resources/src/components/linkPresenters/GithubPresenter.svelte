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
  import { MessageViewer } from '@hcengineering/presentation'
  import { getPlatformColor, Label as LabelComponent, themeStore } from '@hcengineering/ui'
  import view from '../../plugin'

  export let href: string

  interface Assignee {
    login: string
    url: string
  }

  interface Label {
    name: string
  }

  interface Data {
    number: string
    body: string | undefined
    title: string
    assignees: Assignee[]
    labels: Label[]
  }

  async function getData (href: string): Promise<Data> {
    let params = href.replace(/(http.:\/\/)?(www.)?github.com\//, '')
    params = params.replace('/pull/', '/pulls/')
    const res = await (await fetch(`https://api.github.com/repos/${params}`)).json()
    return {
      number: res.number,
      body: format(res.body),
      title: res.title,
      assignees: res.assignees?.map((p: any) => {
        return {
          login: p.login,
          url: p.html_url
        }
      }),
      labels: res.labels
    }
  }

  function format (body: string | undefined): string | undefined {
    if (!body) return undefined
    return body
      .replace(/[\r?\n]+/g, '<br />')
      .replace(/```(.+?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
  }
</script>

<div class="flex mt-2">
  <div class="line" style="background-color: {getPlatformColor(7, $themeStore.dark)}" />
  {#await getData(href) then data}
    <div class="flex-col">
      <a class="fs-title mb-1" {href}>#{data.number} {data.title}</a>
      {#if data.body}
        <div>
          <MessageViewer message={data.body} />
        </div>
      {/if}
      <div class="flex-between">
        {#if data.assignees?.length}
          <div class="flex-col">
            <div class="fs-title"><LabelComponent label={view.string.Assignees} /></div>
            <div>
              {#each data.assignees as assignee}
                <a href={assignee.url}>@{assignee.login}</a>
              {/each}
            </div>
          </div>
        {/if}
        {#if data.labels?.length}
          <div class="flex-col">
            <div class="fs-title"><LabelComponent label={view.string.Labels} /></div>
            <div>
              {#each data.labels as label, i}
                {#if i}, {/if}
                {label.name}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/await}
</div>

<style lang="scss">
  .line {
    margin-right: 1rem;
    width: 0.4rem;
    border-radius: 0.25rem;
  }
</style>
