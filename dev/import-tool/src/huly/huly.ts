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
import { type Doc, generateId, type Ref, type TxOperations } from '@hcengineering/core'
import { type Document } from '@hcengineering/document'
import { MarkupMarkType, type MarkupNode, MarkupNodeType, traverseNode, traverseNodeMarks } from '@hcengineering/text'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import {
  type ImportComment,
  type ImportDoc,
  type ImportDocument,
  type ImportIssue,
  type ImportPerson,
  type ImportProject,
  type ImportProjectType,
  type ImportSpace,
  type ImportTeamspace,
  type ImportWorkspace,
  type MarkdownPreprocessor,
  WorkspaceImporter
} from '../importer/importer'
import { type FileUploader } from '../importer/uploader'
import { type Issue } from '@hcengineering/tracker'
import { type Attachment } from '@hcengineering/attachment'

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

interface HulySpaceHeader {
  class: string
  title?: string
  private?: boolean
  autoJoin?: boolean
  owners?: string[]
  members?: string[]
}

interface HulyProjectHeader extends HulySpaceHeader {
  class: 'tracker.class.Project'
  identifier?: string
  projectType?: string
  defaultAssignee?: string
  defaultIssueStatus?: string
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

interface HulyTeamSpaceHeader extends HulySpaceHeader {
  class: 'document.class.TeamSpace'
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

class HulyMarkdownPreprocessor implements MarkdownPreprocessor {
  constructor (private readonly metadataByFilePath: Map<string, DocMetadata>, private readonly metadataById: Map<Ref<Doc>, DocMetadata>) {}

  process (json: MarkupNode, id: Ref<Doc>): MarkupNode {
    traverseNode(json, (node) => {
      if (node.type === MarkupNodeType.image) {
        const src = node.attrs?.src
        if (src !== undefined) {
          // const sourceMeta = this.metadataById.get(id)
          // if (sourceMeta == null) {
          //   console.warn(`Source metadata not found for ${id}`)
          //   return
          // }
          // const href = decodeURI(src as string)
          // const fullPath = path.resolve(path.dirname(sourceMeta.path), href)
          // const data = fs.readFileSync(fullPath)
          // const file = new File([data], sourceMeta.refTitle)
          // const mimeType = file.type

          // console.log('Image: ', src)
          // console.log('Image: ', fullPath)
          // const notionId = getFileId('', src as string)
          // const meta = documentMetaMap.get(notionId)
          // if (meta !== undefined) {
          //   alterImageNode(node, meta)
          // }
        }
      } else {
        traverseNodeMarks(node, (mark) => {
          if (mark.type === MarkupMarkType.link) {
            const sourceMeta = this.metadataById.get(id)
            if (sourceMeta == null) {
              console.warn(`Source metadata not found for ${id}`)
              return
            }
            const href = decodeURI(mark.attrs.href)
            const fullPath = path.resolve(path.dirname(sourceMeta.path), href)
            const targetMeta = this.metadataByFilePath.get(fullPath)
            if (targetMeta != null) {
              this.alterInternalLinkNode(node, targetMeta)
            }
          }
        })
      }
      return true
    })
    return json
  }

  private alterInternalLinkNode (node: MarkupNode, targetMeta: DocMetadata): void {
    node.type = MarkupNodeType.reference
    node.attrs = {
      id: targetMeta.id,
      label: targetMeta.refTitle,
      objectclass: targetMeta.class,
      text: '',
      content: ''
    }
  }
}

interface DocMetadata {
  id: Ref<Doc>
  class: string
  path: string
  refTitle: string
}

export class HulyImporter {
  private readonly metadataByFilePath = new Map<string, DocMetadata>()
  private readonly metadataById = new Map<Ref<Doc>, DocMetadata>()
  private readonly idByPath = new Map<string, string>()
  private readonly attachmentIdByPath = new Map<string, Ref<Attachment>>()

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

    const preprocessor = new HulyMarkdownPreprocessor(this.metadataByFilePath, this.metadataById)
    await new WorkspaceImporter(this.client, this.fileUploader, workspaceData, preprocessor).performImport()

    console.log('========================================')
    console.log('IMPORT SUCCESS')
  }

  private async processHulyFolder (folderPath: string): Promise<ImportWorkspace> {
    const wsConfig = await this.readYamlHeader(path.join(folderPath, 'README.md'))
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

  private async processSpaces (folderPath: string): Promise<ImportSpace<ImportDoc>[]> {
    const spaces: ImportSpace<ImportDoc>[] = []
    const folders = fs.readdirSync(folderPath)
      .filter(f => fs.statSync(path.join(folderPath, f)).isDirectory())

    for (const folder of folders) {
      const spacePath = path.join(folderPath, folder)
      const readmePath = path.join(spacePath, 'README.md')

      if (!fs.existsSync(readmePath)) {
        console.warn(`Skipping ${folder}: no README.md found`)
        continue
      }

      try {
        const spaceConfig = await this.readYamlHeader(readmePath)

        switch (spaceConfig.class) {
          case 'tracker.class.Project':
            spaces.push(await this.processProject(spacePath, folder, spaceConfig as HulyProjectHeader))
            break
          case 'document.class.TeamSpace':
            spaces.push(await this.processTeamspace(spacePath, folder, spaceConfig as HulyTeamSpaceHeader))
            break
          default:
            console.warn(`Unknown space type: ${spaceConfig.class} in ${folder}`)
        }
      } catch (error) {
        console.warn(`Invalid space configuration in ${folder}: ${error}`)
      }
    }

    // Process attachments after all documents and issues are processed
    await this.processAttachments(folderPath)

    return spaces
  }

  private async processProject (
    spacePath: string,
    name: string,
    projectHeader: HulyProjectHeader
  ): Promise<ImportProject> {
    if (projectHeader.projectType === undefined) {
      throw new Error(`Project type is not defined for ${name}`)
    }
    return {
      class: projectHeader.class,
      name: projectHeader.title ?? name,
      identifier: projectHeader.identifier ?? name.toLowerCase().replace(/\s+/g, '-'),
      private: projectHeader.private ?? false,
      autoJoin: projectHeader.autoJoin ?? true,
      projectType: this.findProjectType(projectHeader.projectType),
      docs: await this.processIssues(spacePath),
      defaultAssignee: projectHeader.defaultAssignee !== undefined
        ? { name: projectHeader.defaultAssignee, email: '' }
        : undefined,
      defaultIssueStatus: projectHeader.defaultIssueStatus !== undefined
        ? { name: projectHeader.defaultIssueStatus }
        : undefined,
      owners: projectHeader.owners?.map(name => ({ name, email: '' })),
      members: projectHeader.members?.map(name => ({ name, email: '' }))
    }
  }

  private async processTeamspace (
    spacePath: string,
    name: string,
    spaceHeader: HulyTeamSpaceHeader
  ): Promise<ImportTeamspace> {
    return {
      class: spaceHeader.class,
      name: spaceHeader.title ?? name,
      private: spaceHeader.private ?? false,
      autoJoin: spaceHeader.autoJoin ?? true,
      owners: spaceHeader.owners?.map(name => ({ name, email: '' })),
      members: spaceHeader.members?.map(name => ({ name, email: '' })),
      docs: await this.processDocuments(spacePath)
    }
  }

  private async processDocuments (spacePath: string): Promise<ImportDocument[]> {
    const documents: ImportDocument[] = []
    const docFiles = fs.readdirSync(spacePath)
      .filter(f => {
        console.log('File: ', f)
        return f.endsWith('.md') && f !== 'README.md'
      })

    for (const docFile of docFiles) {
      const docPath = path.join(spacePath, docFile)
      const docHeader = await this.readYamlHeader(docPath) as HulyDocumentHeader

      if (docHeader.class === 'document.class.Document') {
        const title = path.basename(docFile, '.md')

        const docMeta: DocMetadata = {
          id: generateId<Document>(),
          class: 'document:class:Document',
          path: docPath,
          refTitle: title
        }
        this.metadataById.set(docMeta.id, docMeta)
        this.metadataByFilePath.set(docPath, docMeta)
        const doc: ImportDocument = {
          id: docMeta.id as Ref<Document>,
          class: 'document:class:Document',
          descrProvider: async () => await this.readMarkdownContent(docPath),
          subdocs: await this.processSubDocuments(spacePath, docFile),
          title
        }

        documents.push(doc)
      }
    }

    return documents
  }

  private async processSubDocuments (spacePath: string, parentFile: string): Promise<ImportDocument[]> {
    const baseDir = path.join(spacePath, parentFile.replace('.md', '-subdocs'))
    if (!fs.existsSync(baseDir)) {
      return []
    }

    return await this.processDocuments(baseDir)
  }

  private async readYamlHeader (filePath: string): Promise<any> {
    console.log('Read YAML header from: ', filePath)
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
      .filter(f => f.endsWith('.md') && f !== 'README.md')

    for (const issueFile of issueFiles) {
      const issuePath = path.join(projectPath, issueFile)
      const issueHeader = await this.readYamlHeader(issuePath) as HulyIssueHeader

      if (issueHeader.class === 'tracker.class.Issue') {
        const refTitle = path.basename(issueFile, '.md')

        const meta: DocMetadata = {
          id: generateId<Issue>(),
          class: 'tracker:class:Issue',
          path: issuePath,
          refTitle
        }
        this.metadataById.set(meta.id, meta)
        this.metadataByFilePath.set(issuePath, meta)

        const issue: ImportIssue = {
          id: meta.id as Ref<Issue>,
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
    const persons = await this.client.findAll(contact.class.Person, {})
    this.personsByName = persons.reduce((map, person) => {
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

  private async processAttachments (folderPath: string): Promise<void> {
    const processDir = async (dir: string): Promise<void> => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await processDir(fullPath)
        } else if (entry.isFile()) {
          // Skip files that are already processed as documents or issues
          if (!this.metadataByFilePath.has(fullPath)) {
            const attachmentId = generateId<Attachment>()
            this.attachmentIdByPath.set(fullPath, attachmentId)
            console.log(`Found attachment: ${fullPath} -> ${attachmentId}`)
          }
        }
      }
    }

    await processDir(folderPath)
  }
}
