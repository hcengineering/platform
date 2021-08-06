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
  import { Grid } from '@anticrm/ui'
  import Comment from './Comment.svelte'
</script>

<Grid column={1} rowGap={24}>
  <Comment user={{firstName: 'Tim', lastName: 'Ferris'}}
    message={{createDate: Date.now(), text: 'The Dark Lord has Nine. But we have One, mightier than they: the White Rider. Hero  has passed through the fire and the abyss, and they shall fear him. mightier than they: the White Rider. Hero  has passed through the fire and the abyss, and they shall fear him.'}}
  />
  <Comment user={{firstName: 'Rosamund', lastName: 'Chen'}}
    message={{createDate: Date.now(), text: 'The Dark Lord has Nine. But we have One, mightier than they: the White Rider. Hero  has passed through the fire and the abyss, and they shall fear him. mightier than they: the White Rider. Hero  has passed through the fire and the abyss, and they shall fear him.'}}
  />
</Grid>
