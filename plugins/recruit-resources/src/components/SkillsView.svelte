<script lang="ts">
  import tags, { selectedTagElements, TagElement } from '@hcengineering/tags'
  import { Component, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import recruit from '../plugin'
  import { buildFilterKey, setFilters } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Filter } from '@hcengineering/view'

  function setFilterTag (tag: TagElement) {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const attribute = hierarchy.getAttribute(recruit.mixin.Candidate, 'skills')
    const key = buildFilterKey(hierarchy, recruit.mixin.Candidate, '_class', attribute)
    const filter = {
      key,
      value: [tag._id],
      props: { level: 0 },
      modes: [tags.filter.FilterTagsIn, tags.filter.FilterTagsNin],
      mode: tags.filter.FilterTagsIn,
      index: 1
    } as Filter
    setFilters([filter])
  }
  async function onTag (tag: TagElement): Promise<void> {
    selectedTagElements.set([tag._id])
    const loc = getCurrentResolvedLocation()
    loc.path[2] = 'recruit'
    loc.path[3] = 'talents'
    loc.path.length = 4
    navigate(loc)
    setTimeout(() => setFilterTag(tag), 50)
  }
</script>

<Component
  is={tags.component.TagsView}
  props={{
    targetClass: recruit.mixin.Candidate,
    title: recruit.string.SkillsLabel,
    icon: recruit.icon.Skills,
    item: recruit.string.SkillLabel,
    key: 'skills',
    сreateItemLabel: recruit.string.SkillCreateLabel,
    onTag
  }}
/>
