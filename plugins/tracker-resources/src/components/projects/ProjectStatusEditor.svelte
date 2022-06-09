<script lang="ts">
  import { Project } from '@anticrm/tracker'
  import ProjectStatusPresenter from './ProjectStatusPresenter.svelte'

  export let object: Project
</script>

<ProjectStatusPresenter value={object} shouldShowLabel />
