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
  import { ScrollBox } from '@anticrm/ui'
  import KanbanPanelEmpty from './KanbanPanelEmpty.svelte'
  import KanbanPanel from './KanbanPanel.svelte'
  import KanbanCardEmpty from './KanbanCardEmpty.svelte'
  import KanbanCard from './KanbanCard.svelte'

  interface ICard {
    _id: number
    firstName: string
    lastName: string
    description: string
    state: number
  }

  let dragCard: ICard

  let states: Array<Object> = [
    { _id: 0, label: 'In progress', color: '#7C6FCD' },
    { _id: 1, label: 'Under review', color: '#6F7BC5' },
    { _id: 2, label: 'Interview', color: '#A5D179' },
    { _id: 3, label: 'Offer', color: '#77C07B' },
    { _id: 4, label: 'Assigned', color: '#F28469' }
  ]
  const cards: Array<ICard> = [
    { _id: 0, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 0 },
    { _id: 1, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 0 },
    { _id: 2, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 0 },
    { _id: 3, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 1 },
    { _id: 4, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 1 },
    { _id: 5, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 2 },
    { _id: 6, firstName: 'Chen', lastName: 'Rosamund', description: '8:30AM, July 12 Voltron, San Francisco', state: 3 },
  ]

</script>

<ScrollBox>
  {#each states as state}
    <KanbanPanel label={state.label} color={state.color} counter={4}
      on:dragover={(event) => {
        event.preventDefault()
      }}
      on:drop={(event) => {
        event.preventDefault()
        if (dragCard) {
          dragCard.state = state._id
          dragCard = undefined
        }
      }}
    >
    <KanbanCardEmpty label={'Create new application'} />
      {#each cards.filter((c) => c.state === state._id) as card}
        <KanbanCard {card} draggable={true}
          on:dragstart={() => {
            dragCard = card
          }}
          on:dragend={() => {
            dragCard = undefined
          }}
        />
      {/each}
    </KanbanPanel>
  {/each}
  <KanbanPanelEmpty label={'Add new column'} />
</ScrollBox>
