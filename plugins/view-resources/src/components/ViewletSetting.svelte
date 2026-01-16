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
  import core, { AnyAttribute, Association, AssociationQuery, Class, Client, Doc, Ref, Type } from '@hcengineering/core'
  import { Asset, getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { createQuery, getAttributePresenterClass, getClient, hasResource } from '@hcengineering/presentation'
  import { DropdownLabelsIntl, Loading, resizeObserver } from '@hcengineering/ui'
  import { BuildModelKey, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import view from '../plugin'
  import { buildConfigLookup, getKeyLabel } from '../utils'
  import ViewletClassSettings from './ViewletClassSettings.svelte'

  export let viewlet: Viewlet
  export let defaultConfig: (BuildModelKey | string)[] | undefined = undefined

  const dispatch = createEventDispatcher()

  let preferences: ViewletPreference[] = []
  const preferenceQuery = createQuery()

  let selected = viewlet._id

  let viewlets: Viewlet[] = []

  $: client
    .findAll(view.class.Viewlet, {
      attachTo: {
        $in: client
          .getHierarchy()
          .getDescendants(viewlet.attachTo)
          .filter((it) => !client.getHierarchy().isMixin(it) || it === viewlet.attachTo)
      },
      variant: viewlet.variant ? viewlet.variant : { $exists: false },
      descriptor: viewlet.descriptor
    })
    .then((res) => {
      viewlets = res
    })

  $: if (viewlet && viewlets.length > 0) {
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: { $in: Array.from(viewlets.map((it) => it._id)) }
      },
      (res) => {
        preferences = res
        loading = false
      }
    )
  } else {
    preferenceQuery.unsubscribe()
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  let loading = true

  interface Config {
    value: string | BuildModelKey | undefined
    type: 'divider' | 'attribute'
  }

  interface AttributeConfig extends Config {
    type: 'attribute'
    enabled: boolean
    label: IntlString
    _class: Ref<Class<Doc>>
    icon: Asset | undefined
    order?: number
  }

  function getObjectConfig (_class: Ref<Class<Doc>>, param: string): AttributeConfig {
    const clazz = hierarchy.getClass(_class)
    return {
      type: 'attribute',
      value: param,
      label: clazz.label,
      enabled: true,
      icon: clazz.icon,
      _class
    }
  }

  function getAssoctiationLabel (client: Client, param: string): IntlString {
    const model = client.getModel()
    const associations = param.split('$associations.')
    const resultLabels = associations
      .map((r) => {
        const parts = r.split('_')
        if (parts.length !== 2) return ''
        const assoc = model.findObject(parts[0] as Ref<Association>)
        if (assoc === undefined) return ''
        return parts[1] === '1' ? assoc.nameA : assoc.nameB
      })
      .filter((it) => it.length > 0)

    return getEmbeddedLabel(resultLabels.join(' › '))
  }

  function getBaseConfig (viewlet: Viewlet): Config[] {
    const config = defaultConfig ?? viewlet.config
    const lookup = buildConfigLookup(hierarchy, viewlet.attachTo, config, viewlet.options?.lookup)
    const result: Config[] = []
    const clazz = hierarchy.getClass(viewlet.attachTo)
    let wasOptional = false

    for (const param of config) {
      if (typeof param === 'string') {
        if (viewlet.configOptions?.hiddenKeys?.includes(param)) continue
        if (param.length === 0) {
          result.push(getObjectConfig(viewlet.attachTo, param))
        } else if (param.startsWith('$associations.')) {
          const assocConfig: AttributeConfig = {
            type: 'attribute',
            value: param,
            enabled: true,
            label: getAssoctiationLabel(client, param),
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(assocConfig)
        } else {
          const paramValue = param.startsWith('custom') ? { key: param, displayProps: { optional: true } } : param
          const attrCfg: AttributeConfig = {
            type: 'attribute',
            value: paramValue,
            enabled: true,
            label: getKeyLabel(client, viewlet.attachTo, param, lookup),
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(attrCfg)
        }
      } else {
        if (viewlet.configOptions?.hiddenKeys?.includes(param.key)) continue
        if (param.displayProps?.grow === true) {
          result.push({
            type: 'divider',
            value: param
          })
        } else {
          if (param.displayProps?.optional === true && !wasOptional) {
            wasOptional = true
            result.push({
              type: 'divider',
              value: ''
            })
          }
          const attrCfg: AttributeConfig = {
            type: 'attribute',
            value: param,
            label: param.label ?? getKeyLabel(client, viewlet.attachTo, param.key, lookup),
            enabled: true,
            _class: viewlet.attachTo,
            icon: clazz.icon
          }
          result.push(attrCfg)
        }
      }
    }
    return result
  }

  function getValue (name: string, type: Type<any>, attrClass: Ref<Class<Doc>>): string {
    const presenter = hierarchy.classHierarchyMixin(attrClass, view.mixin.AttributePresenter)?.presenter
    if (presenter !== undefined) {
      return name
    }
    if (hierarchy.isDerived(type._class, core.class.RefTo)) {
      return '$lookup.' + name
    }
    return name
  }

  function processAttribute (attribute: AnyAttribute, result: Config[], useMixinProxy = false): void {
    if (attribute.hidden === true || attribute.label === undefined) return
    if (viewlet.configOptions?.hiddenKeys?.includes(attribute.name)) return
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) return
    const { attrClass, category } = getAttributePresenterClass(hierarchy, attribute.type)
    const value = getValue(attribute.name, attribute.type, attrClass)
    for (const res of result) {
      const key = typeof res.value === 'string' ? res.value : res.value?.key
      if (key === undefined) return
      if (key === attribute.name) return
      if (key === value) return
    }
    const mixin =
      category === 'object'
        ? view.mixin.ObjectPresenter
        : category === 'collection'
          ? view.mixin.CollectionPresenter
          : view.mixin.AttributePresenter
    const presenter = hierarchy.classHierarchyMixin(
      attrClass,
      mixin,
      (m) => hasResource(m.presenter) ?? false
    )?.presenter
    if (presenter === undefined) return
    const clazz = hierarchy.getClass(attribute.attributeOf)
    const extraProps = viewlet.configOptions?.extraProps
    if (useMixinProxy) {
      const newValue: AttributeConfig = {
        type: 'attribute',
        value: attribute.attributeOf + '.' + attribute.name,
        label: attribute.label,
        enabled: false,
        _class: attribute.attributeOf,
        icon: clazz.icon
      }
      if (!isExist(result, newValue)) {
        result.push(newValue)
      }
    } else {
      const isCustomAttribute = attribute.name.startsWith('custom')
      const attributeValue = isCustomAttribute ? { key: value, displayProps: { optional: true } } : value

      const newValue: AttributeConfig = {
        type: 'attribute',
        value: extraProps != null ? { ...extraProps, key: value } : attributeValue,
        label: attribute.label,
        enabled: false,
        _class: attribute.attributeOf,
        icon: clazz.icon
      }
      if (!isExist(result, newValue)) {
        result.push(newValue)
      }
    }
  }

  function isAttribute (val: Config): val is AttributeConfig {
    return val.type === 'attribute'
  }

  function isExist (result: Config[], newValue: Config): boolean {
    for (const res of result) {
      if (!isAttribute(res)) continue
      if (!isAttribute(newValue)) continue
      if (res._class !== newValue._class) continue
      if (typeof res.value === 'string') {
        if (res.value === newValue.value) return true
      }
    }
    return false
  }

  function getParentsString (parents: AssociationQuery[]): string {
    return parents.map(([assocId, direction]) => `$associations.${assocId}_${direction === 1 ? 'a' : 'b'}`).join('.')
  }

  function processAssociation (
    association: Association,
    direction: 'a' | 'b',
    result: Config[],
    preference: ViewletPreference | undefined,
    parents: AssociationQuery[]
  ): void {
    const associationName = `$associations.${association._id}_${direction}`
    const resultName = parents.length > 0 ? `${getParentsString(parents)}.${associationName}` : associationName

    const name = direction === 'a' ? association.nameA : association.nameB
    const targetClass = direction === 'a' ? association.classA : association.classB

    if (name.trim().length === 0) return
    const model = client.getModel()

    const resultLabels = parents
      .map((r) => {
        const assoc = model.findObject(r[0])
        if (assoc === undefined) return ''
        return r[1] === 1 ? assoc.nameA : assoc.nameB
      })
      .filter((it) => it.length > 0)
    resultLabels.push(name)
    const fullLabel = resultLabels.join(' › ')

    const clazz = hierarchy.getClass(targetClass)
    const newValue: AttributeConfig = {
      type: 'attribute',
      value: resultName,
      label: getEmbeddedLabel(fullLabel),
      enabled: false,
      _class: targetClass,
      icon: clazz.icon
    }

    if (!isExist(result, newValue)) {
      result.push(newValue)
    }

    if (preference === undefined) return
    const exists = preference.config.find((p) => {
      const key = typeof p === 'string' ? p : p.key
      return key === resultName
    })
    if (exists) {
      addAssociations(result, targetClass, preference, [...parents, [association._id, direction === 'a' ? 1 : -1]])
    }
  }

  function getConfig (viewlet: Viewlet, preference: ViewletPreference | undefined): Config[] {
    const result = getBaseConfig(viewlet)

    if (viewlet.configOptions?.strict !== true) {
      const allAttributes = hierarchy.getAllAttributes(viewlet.attachTo)
      for (const [, attribute] of allAttributes) {
        processAttribute(attribute, result)
      }

      const desc = hierarchy.getDescendants(viewlet.attachTo)
      for (const d of desc) {
        if (!hierarchy.isMixin(d)) continue
        hierarchy.getOwnAttributes(d).forEach((attr) => {
          processAttribute(attr, result, true)
        })
      }

      addAssociations(result, viewlet.attachTo, preference)
    }

    return preference === undefined ? result : setStatus(result, preference)
  }

  function addAssociations (
    result: Config[],
    _class: Ref<Class<Doc>>,
    preference: ViewletPreference | undefined,
    parents: AssociationQuery[] = []
  ): void {
    const ancestors = new Set(hierarchy.getAncestors(_class))
    const parent = hierarchy.getParentClass(_class)
    const parentMixins = hierarchy
      .getDescendants(parent)
      .map((p) => hierarchy.getClass(p))
      .filter((p) => hierarchy.isMixin(p._id) && p.extends && ancestors.has(p.extends))

    parentMixins.forEach((it) => {
      hierarchy.getOwnAttributes(it._id).forEach((attr) => {
        processAttribute(attr, result, true)
      })
    })

    const allClasses = [...ancestors, ...parentMixins.map((it) => it._id)]

    const associationsB = client.getModel().findAllSync(core.class.Association, { classA: { $in: allClasses } })
    const associationsA = client.getModel().findAllSync(core.class.Association, { classB: { $in: allClasses } })

    associationsB.forEach((a) => {
      processAssociation(a, 'b', result, preference, parents)
    })
    associationsA.forEach((a) => {
      processAssociation(a, 'a', result, preference, parents)
    })
  }

  async function save (viewletId: Ref<Viewlet>, items: Array<Config | AttributeConfig>): Promise<void> {
    const configValues = items.filter(
      (p) =>
        p.value !== undefined &&
        ((p.type === 'divider' && typeof p.value === 'object' && p.value.displayProps?.grow) ||
          (p.type === 'attribute' && (p as AttributeConfig).enabled))
    )
    const config = configValues.map((p) => {
      const value = p.value as string | BuildModelKey
      if (typeof value === 'string' && value.startsWith('custom')) {
        return { key: value, displayProps: { optional: true } }
      }
      return value
    })
    const preference = preferences.find((p) => p.attachedTo === viewletId)
    if (preference !== undefined) {
      await client.update(preference, {
        config
      })
    } else {
      await client.createDoc(view.class.ViewletPreference, core.space.Workspace, {
        attachedTo: viewletId,
        config
      })
    }
  }

  async function restoreDefault (viewletId: Ref<Viewlet>): Promise<void> {
    const preference = preferences.find((p) => p.attachedTo === viewletId)
    if (preference !== undefined) {
      await client.remove(preference)
    }
  }

  function setStatus (result: Config[], preference: ViewletPreference): Config[] {
    for (const key of result) {
      if (!isAttribute(key)) continue
      const index = preference.config.findIndex((p) => deepEqual(p, key.value))
      key.enabled = index !== -1
      key.order = index !== -1 ? index : undefined
    }
    if (viewlet.configOptions?.sortable) {
      result.sort((a, b) => {
        if (!isAttribute(a) || !isAttribute(b)) return 0
        if (a.order === undefined && b.order === undefined) return 0
        if (a.order === undefined) return 1
        if (b.order === undefined) return -1
        return a.order - b.order
      })
    }
    return result
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#if loading}
        <Loading />
      {:else}
        {#if viewlets.length > 1}
          <div class="p-1">
            <DropdownLabelsIntl
              kind={'ghost'}
              items={viewlets.map((it) => ({ id: it._id, label: hierarchy.getClass(it.attachTo).label }))}
              {selected}
              on:selected={(evt) => {
                selected = evt.detail
              }}
              width={'100%'}
            />
          </div>
        {/if}
        {@const selectedViewlet = viewlets.find((it) => it._id === selected)}
        {@const selectedPreferece = preferences.find((it) => it.attachedTo === selected)}
        {#if selectedViewlet}
          {@const citems = getConfig(selectedViewlet, selectedPreferece)}
          <ViewletClassSettings
            {viewlet}
            items={citems}
            on:restoreDefaults={() => {
              restoreDefault(selected)
            }}
            on:save={(evt) => {
              save(selected, evt.detail)
            }}
          />
        {/if}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
