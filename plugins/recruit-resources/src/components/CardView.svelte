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
  import Card from './Card.svelte'
  import CardEmpty from './CardEmpty.svelte'

  interface Person {
    firstName: string
    lastName: string
    email: string
    description: string
    city: string
    state: string
  }

  const cards: Array<Person> = [
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Offered' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Hired' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Interview' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Submission' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Offered' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Hired' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Interview' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Submission' },
    { firstName: 'Chen', lastName: 'Rosamund', email: 'rosamund@gmail.com', description: 'Software Engineer', city: 'San Francisco', state: 'Offered' }
  ]

</script>

<ScrollBox vertical>
  <div class="cards-container">
    <CardEmpty label={'Create new task'} />
    {#each cards as card}
      <Card user={card} />
    {/each}
  </div>
</ScrollBox>

<style lang="scss">
  .cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, auto));
    grid-auto-rows: minmax(280px, auto);
    grid-gap: 24px;
  }
</style>
