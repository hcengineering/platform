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
  import { combineName, findPerson, Person } from '@hcengineering/contact'
  import { Data, generateId } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import {
    createFocusManager,
    FocusHandler,
    Button,
    IconAttachment,
    IconFile,
    IconInfo,
    Label
  } from '@hcengineering/ui'
  import PersonPresenter from './PersonPresenter.svelte'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import ExcelJS from 'exceljs'

  const dispatch = createEventDispatcher()
  const client = getClient()

  let matches: Person[] = []
  let personsData: Data<Person>[] = []
  let incompleteData: boolean = false

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('contacts');
    sheet.columns = [
      {header: 'First Name', width: 20},
      {header: 'Last Name', width: 20},
      {header: 'Location', width: 20},
    ]
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type: 'xlsx'});

    const link = document.createElement('a');
    link.download = 'template.xlsx';
    link.href = URL.createObjectURL(blob);

    link.click();
    URL.revokeObjectURL(link.href);
  }

  const uploadTemplate = () => {
    matches = []
    personsData = []
    incompleteData = false

    const listener = async function self(e: any) {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(e.target?.files[0])

      const columnWhiteList = [
        'firstname',
        'lastname',
        'location'
      ]

      const columnMapping: { [key: string]: number } = {}

      workbook.worksheets[0].eachRow(async (row, rowNumber) => {
        try {
          if (rowNumber === 1) {
            row.eachCell(({ value }, colNumber) => {
              if (!value) return
              value = value.toString()

              const key: string = value?.trim().toLowerCase().replace(/\s/g, '')

              if (!columnWhiteList.includes(key)) return

              columnMapping[key] = colNumber
            })

            return
          }

          const firstName: string = row.getCell(columnMapping.firstname).value as string
          const lastName: string = row.getCell(columnMapping?.lastname).value as string
          const city: string = row.getCell(columnMapping?.location).value as string

          const personData = {
            name: combineName(firstName, lastName),
            city
          }

          const existingPerson = (await findPerson(client, personData.name, []))[0]

          if (existingPerson) {
            matches = [...matches, existingPerson]
          }

          if (existingPerson) return
          personsData = [...personsData, personData]

        } catch(e) {
          incompleteData = true
        }
      })

      inputFile.removeEventListener('change', self)
    }

    const inputFile: HTMLInputElement = document.createElement('input')
    inputFile.setAttribute('type', 'file')
    inputFile.addEventListener('change', listener)
    inputFile.click()
  }

  async function bulkCreatePerson () {
    await personsData.forEach(async (person) => {
      const id = generateId()
      await client.createDoc(contact.class.Person, contact.space.Contacts, person, id)
    })

    dispatch('close')
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={contact.string.BulkCreatePerson}
  okAction={bulkCreatePerson}
  canSave={!!personsData.length && !incompleteData}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  {#if matches.length > 0}
    <div class="flex-row-center error-color">
      <IconInfo size={'small'} />
      <span class="text-sm overflow-label ml-2">
        <Label label={contact.string.PersonAlreadyExists} />
      </span>
      {#each matches as match}
        <div class="ml-4 mb-4"><PersonPresenter value={match} /></div>
      {/each}
    </div>
  {/if}
  {#if incompleteData}
    <div class="flex-row-center error-color">
      <IconInfo size={'small'} />
      <span class="text-sm overflow-label ml-2">
        <Label label={contact.string.IncompleteData} />
      </span>
    </div>
  {/if}
  <div class="flex-row-center justify-between">
    <div class="flex-grow flex-col">
      <Button
        icon={IconFile}
        label={contact.string.BulkCreateTemplateDownload}
        kind={'primary'}
        on:click={downloadTemplate}
      />
    </div>
    <div class="buttons-divider mx-4" />
    <div class="flex-grow flex-col">
      <Button
        icon={IconAttachment}
        label={contact.string.BulkCreateTemplateUpload}
        kind={'primary'}
        disabled={!!personsData.length}
        on:click={uploadTemplate}
      />
    </div>
  </div>
</Card>
