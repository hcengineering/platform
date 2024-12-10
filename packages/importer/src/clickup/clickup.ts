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
import contact, { type Person, type PersonAccount } from '@hcengineering/contact'
import { type Ref, type Timestamp, type TxOperations } from '@hcengineering/core'
import { MarkupNodeType, traverseNode, type MarkupNode } from '@hcengineering/text'
import tracker from '@hcengineering/tracker'
import csv from 'csvtojson'
import { download } from '../importer/dowloader'
import {
  WorkspaceImporter,
  type ImportComment,
  type ImportIssue,
  type ImportProject,
  type ImportProjectType
} from '../importer/importer'
import { type Logger } from '../importer/logger'
import { BaseMarkdownPreprocessor } from '../importer/preprocessor'
import { type FileUploader } from '../importer/uploader'
interface ClickupTask {
  'Task ID': string
  'Task Name': string
  'Task Content': string
  Status: string
  'Parent ID': string
  Attachments: string
  Assignees: string
  Priority?: number
  'Space Name': string
  Checklists: string
  Comments: string
  'Time Estimated': number
  'Time Spent': number
}

interface ClickupComment {
  by: string
  date: Timestamp
  text: string
}

interface ClickupAttachment {
  title: string
  url: string
}

type ClickupChecklist = Record<string, string[]>

interface ImportIssueEx extends ImportIssue {
  clickupParentId?: string
  clickupProjectName?: string
}

class ClickupMarkdownPreprocessor extends BaseMarkdownPreprocessor {
  process (json: MarkupNode): MarkupNode {
    traverseNode(json, (node) => {
      if (node.type === MarkupNodeType.paragraph) {
        this.processMentions(node)
        return false
      }
      return true
    })
    return json
  }
}

interface TasksProcessResult {
  projects: ImportProject[]
  projectType: ImportProjectType
}

class ClickupImporter {
  private personsByName = new Map<string, Ref<Person>>()
  private accountsByEmail = new Map<string, Ref<PersonAccount>>()

  constructor (
    private readonly client: TxOperations,
    private readonly fileUploader: FileUploader,
    private readonly logger: Logger
  ) {}

  async importClickUpTasks (file: string): Promise<void> {
    const projectTypes: ImportProjectType[] = []
    const spaces: ImportProject[] = []

    const projectsData = await this.processClickupTasks(file)
    projectTypes.push(projectsData.projectType)
    spaces.push(...projectsData.projects)

    const importData = {
      projectTypes,
      spaces
    }

    this.logger.log('========================================')
    this.logger.log('IMPORT DATA STRUCTURE: ', JSON.stringify(importData, null, 4))
    this.logger.log('========================================')
    const postprocessor = new ClickupMarkdownPreprocessor(this.personsByName)
    await new WorkspaceImporter(this.client, this.logger, this.fileUploader, importData, postprocessor).performImport()
    this.logger.log('========================================')
    this.logger.log('IMPORT SUCCESS ')
  }

  private async processTasksCsv (file: string, process: (json: ClickupTask) => Promise<void> | void): Promise<void> {
    const jsonArray = await csv().fromFile(file)
    for (const json of jsonArray) {
      const clickupTask = json as ClickupTask
      await process(clickupTask)
    }
  }

  private async processClickupTasks (file: string): Promise<TasksProcessResult> {
    await this.fillPersonsByNames()
    await this.fillAccountsByEmails()

    const projects = new Set<string>()
    const statuses = new Set<string>()
    const importIssuesByClickupId = new Map<string, ImportIssueEx>()
    await this.processTasksCsv(file, async (clickupTask) => {
      const importIssue = (await this.convertToImportIssue(clickupTask)) as ImportIssueEx
      importIssue.clickupParentId = clickupTask['Parent ID']
      importIssue.clickupProjectName = clickupTask['Space Name']
      importIssuesByClickupId.set(clickupTask['Task ID'], importIssue)

      projects.add(clickupTask['Space Name'])
      statuses.add(clickupTask.Status)
    })

    this.logger.log('Projects: ' + JSON.stringify(projects))
    this.logger.log('Statuses: ' + JSON.stringify(statuses))

    const importProjectType = this.createClickupProjectType(Array.from(statuses))

    const importProjectsByName = new Map<string, ImportProject>()
    for (const projectName of projects) {
      const identifier = this.getProjectIdentifier(projectName)
      importProjectsByName.set(projectName, {
        class: tracker.class.Project,
        title: projectName,
        identifier,
        private: false,
        autoJoin: false,
        projectType: importProjectType,
        docs: []
      })
    }

    for (const [clickupId, issue] of importIssuesByClickupId) {
      if (!this.clickupBlankString(issue.clickupParentId)) {
        const parent = importIssuesByClickupId.get(issue.clickupParentId as string)
        if (parent === undefined) {
          throw new Error(`Parent not found: ${issue.clickupParentId} (for task: ${clickupId})`)
        }
        parent.subdocs.push(issue)
      } else if (!this.clickupBlankString(issue.clickupProjectName)) {
        const project = importProjectsByName.get(issue.clickupProjectName as string)
        if (project === undefined) {
          throw new Error(`Project not found: ${issue.clickupProjectName} (for task: ${clickupId})`)
        }
        project.docs.push(issue)
      } else {
        throw new Error(`Task cannot be imported: ${clickupId} (No parent)`)
      }
    }

    return {
      projects: Array.from(importProjectsByName.values()),
      projectType: importProjectType
    }
  }

  private clickupBlankString (str: string | undefined): boolean {
    if (str === undefined || str === null) return true
    return str.trim().length === 0 || str === 'null'
  }

  private async convertToImportIssue (clickup: ClickupTask): Promise<ImportIssue> {
    const status = {
      name: clickup.Status
    }

    const content = this.fixClickupString(clickup['Task Content'])
    const checklists = this.convertChecklistsToMarkdown(clickup.Checklists)

    const estimation = this.millisecondsToHours(clickup['Time Estimated'])
    const remainingTime = estimation - this.millisecondsToHours(clickup['Time Spent'])

    const comments = this.convertToImportComments(clickup.Comments)
    const attachments = await this.convertAttachmentsToComment(clickup.Attachments)

    const separator = content.trim() !== '' && checklists.trim() !== '' ? '\n\n---\n' : ''
    const description = `${content.trim()}${separator}${checklists.trim()}`

    let assignee
    const serviceComments: ImportComment[] = []
    if (clickup.Assignees !== undefined) {
      const assignees = clickup.Assignees.substring(1, clickup.Assignees.length - 1)
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)

      for (let i = 0; i < assignees.length && assignee === undefined; i++) {
        assignee = this.personsByName.get(assignees[i])
      }

      if (assignee === undefined && assignees.length > 0) {
        serviceComments.push(this.createAssigneesComment(assignees))
      }
    }

    return {
      class: tracker.class.Issue,
      title: clickup['Task Name'],
      descrProvider: () => {
        return Promise.resolve(description)
      },
      status,
      estimation,
      remainingTime,
      comments: comments.concat(attachments).concat(serviceComments),
      subdocs: [],
      assignee
    }
  }

  private createAssigneesComment (assignees: string[]): ImportComment {
    return {
      text: `*ClickUp assignees: ${assignees.join(', ')}*`
    }
  }

  private convertToImportComments (clickup: string): ImportComment[] {
    return JSON.parse(clickup).map((comment: ClickupComment) => {
      const author = this.accountsByEmail.get(comment.by)
      return {
        text: author !== undefined ? comment.text : `${comment.text}\n\n*(comment by ${comment.by})*`,
        date: new Date(comment.date).getTime(),
        author
      }
    })
  }

  private async convertAttachmentsToComment (clickup: string): Promise<ImportComment[]> {
    const res: ImportComment[] = []
    const attachments: ClickupAttachment[] = JSON.parse(clickup)
    for (const attachment of attachments) {
      res.push({
        text: `ClickUp attachment link: [${attachment.title}](${attachment.url})`,
        attachments: [
          {
            title: attachment.title,
            blobProvider: async () => {
              return await download(attachment.url)
            }
          }
        ]
      })
    }
    return res
  }

  private convertChecklistsToMarkdown (clickup: string): string {
    const checklists = JSON.parse(clickup) as ClickupChecklist
    let huly: string = '\n'
    for (const [key, values] of Object.entries(checklists)) {
      huly += `**${key}**\n`
      for (const value of values) {
        // no way to check if item is checked, this info doesn't exported from ClickUp 🤯
        huly += `* [ ] ${value} \n`
      }
      huly += '\n'
    }
    return huly
  }

  private async fillPersonsByNames (): Promise<void> {
    this.personsByName = (await this.client.findAll(contact.class.Person, {}))
      .map((person) => {
        return {
          _id: person._id,
          name: person.name.split(',').reverse().join(' ')
        }
      })
      .reduce((refByName, person) => {
        refByName.set(person.name, person._id)
        return refByName
      }, new Map())
  }

  private async fillAccountsByEmails (): Promise<void> {
    const accounts = await this.client.findAll(contact.class.PersonAccount, {})
    this.accountsByEmail = accounts.reduce((accountsByEmail, account) => {
      accountsByEmail.set(account.email, account._id)
      return accountsByEmail
    }, new Map())
  }

  private fixClickupString (content: string): string {
    return content === 'null' ? '' : content.replaceAll('\\n', '\n')
  }

  private millisecondsToHours (milliseconds: number): number {
    return milliseconds / (1000 * 60 * 60)
  }

  private getProjectIdentifier (projectName: string): string {
    return projectName.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_').substring(0, 4)
  }

  private createClickupProjectType (taskStatuses: string[]): ImportProjectType {
    const statuses = taskStatuses.map((name) => {
      return {
        name
      }
    })
    return {
      name: 'ClickUp project',
      description: 'For issues imported from ClickUp',
      taskTypes: [
        {
          name: 'ClickUp issue',
          statuses
        }
      ]
    }
  }
}

export { ClickupImporter }
