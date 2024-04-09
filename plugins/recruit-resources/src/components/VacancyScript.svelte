<!--
//
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
//
-->

<script lang="ts">
  import core, { type Class, ClassifierKind, fillDefaults, type Obj, type Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/rank'
  import { type Vacancy } from '@hcengineering/recruit'
  import { Button, Icon, IconDelete, Label, Loading } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import recruit from '../plugin'
  import { addScriptTypedAttribute, makeScriptClassRef } from '../utils'
  import ScriptClassEditor from './script/ScriptClassEditor.svelte'
  import ScriptObjectEditor from './script/ScriptObjectEditor.svelte'
  import SectionEmpty from './SectionEmpty.svelte'

  export let object: Vacancy
  export let readonly: boolean
  export let preview: boolean

  type Script = Obj

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let scriptClassRef: Ref<Class<Script>>
  $: scriptClassRef = makeScriptClassRef(object._id)

  let scriptClass: Class<Script> | null | undefined
  const scriptClassQuery = createQuery()
  $: {
    scriptClassQuery.query(core.class.Class, { _id: scriptClassRef }, (result) => {
      scriptClass = result[0] ?? null
    })
  }

  let scriptPreview: Script | null = null
  $: if (preview && scriptClass !== null && scriptClass !== undefined) {
    scriptPreview = fillDefaults(
      hierarchy,
      {
        _class: scriptClassRef
      },
      scriptClassRef
    ) as Script
  } else {
    scriptPreview = null
  }

  async function create (): Promise<void> {
    if (readonly || (scriptClass !== null && scriptClass !== undefined)) {
      return
    }

    const ops = client.apply(scriptClassRef)

    await ops.createDoc<Class<Script>>(
      core.class.Class,
      core.space.Model,
      {
        label: recruit.string.Script,
        kind: ClassifierKind.CLASS,
        extends: core.class.Obj
        // TODO: Will we store filled scripts as separate docs?
        // domain: ...
      },
      scriptClassRef
    )

    const nameAttrRank = makeRank(undefined, undefined)
    await addScriptTypedAttribute(ops, scriptClassRef, hierarchy.getClass(core.class.TypeString), {
      title: 'Name',
      defaultValue: 'Name -',
      rank: nameAttrRank
    })

    await addScriptTypedAttribute(ops, scriptClassRef, hierarchy.getClass(core.class.TypeString), {
      title: 'Country',
      defaultValue: 'Country -',
      rank: makeRank(nameAttrRank, undefined)
    })

    await ops.commit()
  }

  async function remove (): Promise<void> {
    if (readonly || scriptClass === undefined || scriptClass === null) {
      return
    }
    const ops = client.apply(scriptClassRef)
    const attributes = await client.findAll(core.class.Attribute, { attributeOf: scriptClassRef })
    await Promise.all(attributes.map((attribute) => ops.remove(attribute)))
    await ops.remove(scriptClass)
    await ops.commit()
  }
</script>

<div class="antiSection clear-mins">
  <div class="antiSection-header">
    <div class="antiSection-header__icon">
      <Icon icon={recruit.icon.Script} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label label={recruit.string.Script} />
    </span>
    <div class="flex-row-center gap-2 reverse">
      {#if scriptClass === undefined}
        <Loading />
      {:else if scriptClass !== null}
        {#if !readonly}
          <Button
            kind="ghost"
            icon={view.icon.Eye}
            pressed={preview}
            on:click={() => {
              preview = !preview
            }}
          />

          <Button icon={IconDelete} kind="ghost" on:click={remove} />
        {/if}
      {/if}
    </div>
  </div>
  {#if scriptClass === undefined}
    <Loading />
  {:else if scriptClass === null}
    <SectionEmpty icon={recruit.icon.Script} label={recruit.string.NoScriptForVacancy}>
      {#if !readonly}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={create}>
          <Label label={recruit.string.CreateScript} />
        </span>
      {/if}
    </SectionEmpty>
  {:else if scriptPreview !== null}
    <ScriptObjectEditor
      value={scriptPreview}
      change={readonly
        ? null
        : async (value) => {
          scriptPreview = value
          return true
        }}
    />
  {:else}
    <ScriptClassEditor object={scriptClass} {readonly} />
  {/if}
</div>
