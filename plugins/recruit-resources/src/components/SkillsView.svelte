<script lang='ts'>
  import tags from '@anticrm/tags'
  import { Component } from '@anticrm/ui'
  import recruit from '../plugin'
</script>

<Component is={tags.component.TagsView} props={{ targetClass: recruit.mixin.Candidate, title: recruit.string.SkillsLabel, item: recruit.string.SkillLabel, key: 'skills', сreateItemLabel: recruit.string.SkillCreateLabel }}/>
