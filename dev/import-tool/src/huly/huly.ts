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
import document from '@hcengineering/document'

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

interface HulyDocumentHeader {
  class: string
  title?: string
}

interface ImportDocument {
  class: string
  title?: string
  content: string
  subdocs?: ImportDocument[]
}

interface HulySpaceHeader {
  class: string
  title?: string
  identifier?: string
  private?: boolean
  autoJoin?: boolean
  defaultAssignee?: string
  defaultIssueStatus?: string
  owners?: string[]
  members?: string[]
  projectType?: string
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

class HulyMarkdownPreprocessor implements MarkdownPreprocessor {
  constructor (private readonly personsByName: Map<string, Ref<Person>>) {}

  process (json: MarkupNode): MarkupNode {
    // Process markdown if needed
    return json
  }
}

export class HulyImporter {
  private personsByName = new Map<string, Ref<Person>>()
  private accountsByEmail = new Map<string, Ref<PersonAccount>>()

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
    const wsConfig = await this.readYamlHeader(path.join(folderPath, 'README-ws.md'))
    const workspaceHeader = wsConfig as HulyWorkspaceHeader

    const persons = this.processPersons(workspaceHeader)
    const projectTypes = this.processProjectTypes(workspaceHeader)
    
    // Process both projects and document spaces
    const spaces = await this.processSpaces(folderPath)

    return {
      persons,
      projectTypes,
      spaces
    }
  }

  private async processSpaces (folderPath: string): Promise<ImportProject[]> {
    const spaces: ImportProject[] = []
    const folders = fs.readdirSync(folderPath)
      .filter(f => fs.statSync(path.join(folderPath, f)).isDirectory())
      .filter(f => f !== 'files')

    for (const folder of folders) {
      const spacePath = path.join(folderPath, folder)
      const readmePath = path.join(spacePath, 'README.md')
      
      if (!fs.existsSync(readmePath)) {
        console.warn(`Skipping ${folder}: no README.md found`)
        continue
      }

      const spaceConfig = await this.readYamlHeader(readmePath)
      const spaceHeader = spaceConfig as HulySpaceHeader

      switch (spaceHeader.class) {
        case 'tracker.class.Project':
          spaces.push(await this.processProject(spacePath, folder, spaceHeader))
          break
        case 'document.class.TeamSpace':
          spaces.push(await this.processDocumentSpace(spacePath, folder, spaceHeader))
          break
        default:
          console.warn(`Unknown space type: ${spaceHeader.class} in ${folder}`)
      }
    }

    return spaces
  }

  private async processProject(
    spacePath: string, 
    name: string, 
    projectHeader: HulySpaceHeader
  ): Promise<ImportProject> {
    return {
      class: projectHeader.class,
      name: projectHeader.title ?? name,
      identifier: projectHeader.identifier ?? name.toLowerCase().replace(/\s+/g, '-'),
      private: projectHeader.private ?? false,
      autoJoin: projectHeader.autoJoin ?? true,
      projectType: projectHeader.projectType 
        ? this.findProjectType(projectHeader.projectType)
        : undefined,
      docs: await this.processIssues(spacePath),
      defaultAssignee: projectHeader.defaultAssignee 
        ? { name: projectHeader.defaultAssignee, email: '' }
        : undefined,
      defaultIssueStatus: projectHeader.defaultIssueStatus
        ? { name: projectHeader.defaultIssueStatus }
        : undefined,
      owners: projectHeader.owners?.map(name => ({ name, email: '' })),
      members: projectHeader.members?.map(name => ({ name, email: '' }))
    }
  }

  private async processDocumentSpace(
    spacePath: string, 
    name: string, 
    spaceHeader: HulySpaceHeader
  ): Promise<ImportProject> {
    return {
      class: spaceHeader.class,
      name: spaceHeader.title ?? name,
      identifier: spaceHeader.identifier ?? name.toLowerCase().replace(/\s+/g, '-'),
      private: spaceHeader.private ?? false,
      autoJoin: spaceHeader.autoJoin ?? true,
      owners: spaceHeader.owners?.map(name => ({ name, email: '' })),
      members: spaceHeader.members?.map(name => ({ name, email: '' })),
      docs: await this.processDocuments(spacePath)
    }
  }

  private async processDocuments(spacePath: string): Promise<ImportDocument[]> {
    const documents: ImportDocument[] = []
    const docFiles = fs.readdirSync(spacePath)
      .filter(f => f.endsWith('.md') && !f.startsWith('README'))

    for (const docFile of docFiles) {
      const docPath = path.join(spacePath, docFile)
      const docHeader = await this.readYamlHeader(docPath) as HulyDocumentHeader
      
      if (docHeader.class === 'document.class.Document') {
        const content = await this.readMarkdownContent(docPath)
        const title = docHeader.title ?? path.basename(docFile, '.md')

        const doc: ImportDocument = {
          class: docHeader.class,
          title,
          content,
          subdocs: await this.processSubDocuments(spacePath, docFile)
        }

        documents.push(doc)
      }
    }

    return documents
  }

  private async processSubDocuments(spacePath: string, parentFile: string): Promise<ImportDocument[]> {
    const baseDir = path.join(spacePath, parentFile.replace('.md', '-subdocs'))
    if (!fs.existsSync(baseDir)) {
      return []
    }

    return await this.processDocuments(baseDir)
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
