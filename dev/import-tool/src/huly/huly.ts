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
import { type Ref, type TxOperations } from '@hcengineering/core'
import { type MarkupNode } from '@hcengineering/text'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'
import {
  WorkspaceImporter,
  type ImportComment,
  type ImportIssue,
  type ImportProject,
  type ImportProjectType,
  type ImportPerson,
  type ImportWorkspace,
  type MarkdownPreprocessor
} from '../importer/importer'
import { type FileUploader } from '../importer/uploader'

interface HulyComment {
  author: string
  date: string
  text: string
}

interface HulyIssueHeader {
  class: string
  title: string
  assignee: string
  status: string
  priority: string
  estimation: number
  remainingTime: number
  component: string
  milestone: string
  comments?: HulyComment[]
}

interface HulyProjectHeader {
  class: string
  projectType: string
  identifier: string
  private: boolean
  autoJoin: boolean
  defaultAssignee?: string
  defaultIssueStatus?: string
  owners?: string[]
  members?: string[]
  components?: Array<{
    title: string
    lead: string
    description: string
  }>
  milestones?: Array<{
    title: string
    status: string
    targetDate: string
    description: string
  }>
}

interface HulyWorkspaceHeader {
  persons?: Array<{
    name: string
    email: string
    role: string
  }>
  projectTypes?: Array<{
    name: string
    taskTypes?: Array<{
      name: string
      description: string
      statuses: Array<{
        name: string
        description: string
      }>
    }>
  }>
}

class HulyMarkdownPreprocessor implements MarkdownPreprocessor {
  constructor (private readonly personsByName: Map<string, Ref<Person>>) {}

  process (json: MarkupNode): MarkupNode {
    // Process markdown if needed
    return json
  }
}

export class HulyImporter {
  private readonly personsByName = new Map<string, Ref<Person>>()
  private readonly accountsByEmail = new Map<string, Ref<PersonAccount>>()

  constructor (
    private readonly client: TxOperations,
    private readonly fileUploader: FileUploader
  ) {}

  async importHulyFolder (folderPath: string): Promise<void> {
    await this.fillPersonsByNames()
    await this.fillAccountsByEmails()

    const workspaceData = await this.processHulyFolder(folderPath)

    console.log('========================================')
    console.log('IMPORT DATA STRUCTURE: ', JSON.stringify(workspaceData, null, 4))
    console.log('========================================')

    const postprocessor = new HulyMarkdownPreprocessor(this.personsByName)
    await new WorkspaceImporter(this.client, this.fileUploader, workspaceData, postprocessor).performImport()

    console.log('========================================')
    console.log('IMPORT SUCCESS')
  }

  private async processHulyFolder (folderPath: string): Promise<ImportWorkspace> {
    // Read workspace configuration
    const wsConfig = await this.readYamlHeader(path.join(folderPath, 'README-ws.md'))
    const workspaceHeader = wsConfig as HulyWorkspaceHeader

    // Process persons
    const persons = this.processPersons(workspaceHeader)

    // Process project types
    const projectTypes = this.processProjectTypes(workspaceHeader)

    // Process projects
    const spaces = await this.processProjects(folderPath)

    return {
      persons,
      projectTypes,
      spaces
    }
  }

  private async readYamlHeader (filePath: string): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (match != null) {
      return yaml.load(match[1])
    }
    return {}
  }

  private async readMarkdownContent (filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = content.match(/^---\n[\s\S]*?\n---\n(.*)$/s)
    return match != null ? match[1] : content
  }

  private processPersons (wsHeader: HulyWorkspaceHeader): ImportPerson[] {
    return wsHeader.persons?.map(person => ({
      name: person.name,
      email: person.email
    })) ?? []
  }

  private processProjectTypes (wsHeader: HulyWorkspaceHeader): ImportProjectType[] {
    return wsHeader.projectTypes?.map(pt => ({
      name: pt.name,
      taskTypes: pt.taskTypes?.map(tt => ({
        name: tt.name,
        description: tt.description,
        statuses: tt.statuses.map(st => ({
          name: st.name,
          description: st.description
        }))
      }))
    })) ?? []
  }

  private async processProjects (folderPath: string): Promise<ImportProject[]> {
    const projects: ImportProject[] = []
    const projectFolders = fs.readdirSync(folderPath)
      .filter(f => fs.statSync(path.join(folderPath, f)).isDirectory())
      .filter(f => f !== 'files')

    for (const projectFolder of projectFolders) {
      const projectPath = path.join(folderPath, projectFolder)
      const projectConfig = await this.readYamlHeader(path.join(projectPath, 'README-prj.md'))
      const projectHeader = projectConfig as HulyProjectHeader

      const project: ImportProject = {
        class: 'tracker.class.Project',
        name: projectFolder,
        identifier: projectHeader.identifier,
        private: projectHeader.private,
        autoJoin: projectHeader.autoJoin,
        projectType: this.findProjectType(projectHeader.projectType),
        docs: await this.processIssues(projectPath),
        defaultAssignee: projectHeader.defaultAssignee
          ? { name: projectHeader.defaultAssignee, email: '' }
          : undefined,
        defaultIssueStatus: projectHeader.defaultIssueStatus
          ? { name: projectHeader.defaultIssueStatus }
          : undefined,
        owners: projectHeader.owners?.map(name => ({ name, email: '' })),
        members: projectHeader.members?.map(name => ({ name, email: '' }))
      }

      projects.push(project)
    }

    return projects
  }

  private async processIssues (projectPath: string): Promise<ImportIssue[]> {
    const issues: ImportIssue[] = []
    const issueFiles = fs.readdirSync(projectPath)
      .filter(f => f.endsWith('.md') && f !== 'README-prj.md')

    for (const issueFile of issueFiles) {
      const issuePath = path.join(projectPath, issueFile)
      const issueHeader = await this.readYamlHeader(issuePath) as HulyIssueHeader

      const issue: ImportIssue = {
        class: 'tracker.class.Issue',
        title: issueHeader.title,
        descrProvider: async () => await this.readMarkdownContent(issuePath),
        status: { name: issueHeader.status },
        estimation: issueHeader.estimation,
        remainingTime: issueHeader.remainingTime,
        comments: this.processComments(issueHeader.comments),
        subdocs: await this.processSubIssues(projectPath, issueFile),
        assignee: this.personsByName.get(issueHeader.assignee)
      }

      issues.push(issue)
    }

    return issues
  }

  private async processSubIssues (projectPath: string, parentFile: string): Promise<ImportIssue[]> {
    const baseDir = path.join(projectPath, parentFile.replace('.md', '-subdocs'))
    if (!fs.existsSync(baseDir)) {
      return []
    }

    return await this.processIssues(baseDir)
  }

  private processComments (comments: HulyComment[] = []): ImportComment[] {
    return comments.map(comment => ({
      text: comment.text,
      author: this.accountsByEmail.get(comment.author),
      date: new Date(comment.date).getTime()
    }))
  }

  private findProjectType (name: string): ImportProjectType {
    return {
      name,
      taskTypes: []
    }
  }

  private async fillPersonsByNames (): Promise<void> {
    this.personsByName = (await this.client.findAll(contact.class.Person, {}))
      .reduce((map, person) => {
        map.set(person.name, person._id)
        return map
      }, new Map())
  }

  private async fillAccountsByEmails (): Promise<void> {
    const accounts = await this.client.findAll(contact.class.PersonAccount, {})
    this.accountsByEmail = accounts.reduce((map, account) => {
      map.set(account.email, account._id)
      return map
    }, new Map())
  }
}
