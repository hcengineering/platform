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

import { type Attachment } from '@hcengineering/attachment'
import contact, { Employee, type Person, type PersonAccount } from '@hcengineering/contact'
import { type Class, type Doc, generateId, type Ref, type Space, type TxOperations } from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
import { MarkupMarkType, type MarkupNode, MarkupNodeType, traverseNode, traverseNodeMarks } from '@hcengineering/text'
import tracker, { type Issue, Project } from '@hcengineering/tracker'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { contentType } from 'mime-types'
import * as path from 'path'
import { ImportWorkspaceBuilder } from '../importer/builder'
import {
  type ImportAttachment,
  type ImportComment,
  ImportControlledDocument,
  ImportControlledDocumentTemplate,
  type ImportDocument,
  type ImportIssue,
  type ImportProject,
  type ImportProjectType,
  type ImportTeamspace,
  type ImportWorkspace,
  WorkspaceImporter,
  ImportOrgSpace
} from '../importer/importer'
import { type Logger } from '../importer/logger'
import { BaseMarkdownPreprocessor } from '../importer/preprocessor'
import { type FileUploader } from '../importer/uploader'
import documents, { DocumentState, DocumentCategory, ChangeControl, DocumentTemplate, ControlledDocument } from '@hcengineering/controlled-documents'

interface UnifiedComment {
  author: string
  text: string
}

interface UnifiedIssueHeader {
  class: 'tracker:class:Issue'
  title: string
  status: string
  assignee?: string
  priority?: string
  estimation?: number // in hours
  remainingTime?: number // in hours
  comments?: UnifiedComment[]
}

interface UnifiedSpaceSettings {
  class: 'tracker:class:Project' | 'document:class:Teamspace' | 'documents:class:OrgSpace'
  title: string
  private?: boolean
  autoJoin?: boolean
  archived?: boolean
  owners?: string[]
  members?: string[]
  description?: string
  emoji?: string
}

interface UnifiedProjectSettings extends UnifiedSpaceSettings {
  class: 'tracker:class:Project'
  identifier: string
  id?: 'tracker:project:DefaultProject'
  projectType?: string
  defaultIssueStatus?: string
}

interface UnifiedTeamspaceSettings extends UnifiedSpaceSettings {
  class: 'document:class:Teamspace'
}

interface UnifiedDocumentHeader {
  class: 'document:class:Document'
  title: string
}

interface UnifiedWorkspaceSettings {
  projectTypes?: Array<{
    name: string
    taskTypes?: Array<{
      name: string
      description?: string
      statuses: Array<{
        name: string
        description: string
      }>
    }>
  }>
}

interface UnifiedControlledDocumentHeader {
  class: 'documents:class:ControlledDocument'
  title: string
  code: string // TODO: what is this? code vs prefix?
  category: string // TODO: what is this? Refernce?
  author: string
  owner: string
  abstract?: string
  reviewers: string[]
  approvers: string[]
  coAuthors: string[]
  changeControl: string // todo: wtf
  template: string
}

interface UnifiedDocumentTemplateHeader {
  class: 'documents:mixin:DocumentTemplate'
  title: string
  code: string
  category: string
  author: string
  owner: string
  abstract?: string
  reviewers: string[]
  approvers: string[]
  coAuthors: string[]
  changeControl: string
  docPrefix: string
}

interface UnifiedOrgSpaceSettings extends UnifiedSpaceSettings {
  class: 'documents:class:OrgSpace'
  qualified?: string
  manager?: string
  qara?: string
}

class HulyMarkdownPreprocessor extends BaseMarkdownPreprocessor {
  constructor (
    private readonly urlProvider: (id: string) => string,
    private readonly logger: Logger,
    private readonly metadataByFilePath: Map<string, DocMetadata>,
    private readonly metadataById: Map<Ref<Doc>, DocMetadata>,
    private readonly attachMetadataByPath: Map<string, AttachmentMetadata>,
    personsByName: Map<string, Ref<Person>>
  ) {
    super(personsByName)
  }

  process (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): MarkupNode {
    traverseNode(json, (node) => {
      if (node.type === MarkupNodeType.image) {
        this.processImageNode(node, id, spaceId)
      } else {
        this.processLinkMarks(node, id, spaceId)
        this.processMentions(node)
      }
      return true
    })
    return json
  }

  private processImageNode (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    const src = node.attrs?.src
    if (src === undefined) return

    const sourceMeta = this.getSourceMetadata(id)
    if (sourceMeta == null) return

    const href = decodeURI(src as string)
    const fullPath = path.resolve(path.dirname(sourceMeta.path), href)
    const attachmentMeta = this.attachMetadataByPath.get(fullPath)

    if (attachmentMeta === undefined) {
      this.logger.error(`Attachment image not found for ${fullPath}`)
      return
    }

    this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
    this.alterImageNode(node, attachmentMeta.id, attachmentMeta.name)
  }

  private processLinkMarks (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    traverseNodeMarks(node, (mark) => {
      if (mark.type !== MarkupMarkType.link) return

      const sourceMeta = this.getSourceMetadata(id)
      if (sourceMeta == null) return

      const href = decodeURI(mark.attrs.href)
      const fullPath = path.resolve(path.dirname(sourceMeta.path), href)

      if (this.metadataByFilePath.has(fullPath)) {
        const targetDocMeta = this.metadataByFilePath.get(fullPath)
        if (targetDocMeta !== undefined) {
          this.alterInternalLinkNode(node, targetDocMeta)
        }
      } else if (this.attachMetadataByPath.has(fullPath)) {
        const attachmentMeta = this.attachMetadataByPath.get(fullPath)
        if (attachmentMeta !== undefined) {
          this.alterAttachmentLinkNode(node, attachmentMeta)
          this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
        }
      } else {
        this.logger.log('Unknown link type, leave it as is: ' + href)
      }
    })
  }

  private alterImageNode (node: MarkupNode, id: string, name: string): void {
    node.type = MarkupNodeType.image
    if (node.attrs !== undefined) {
      node.attrs = {
        'file-id': id,
        src: this.urlProvider(id),
        width: node.attrs.width ?? null,
        height: node.attrs.height ?? null,
        align: node.attrs.align ?? null,
        alt: name,
        title: name
      }
      const mimeType = this.getContentType(name)
      if (mimeType !== undefined) {
        node.attrs['data-file-type'] = mimeType
      }
    }
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

  private alterAttachmentLinkNode (node: MarkupNode, targetMeta: AttachmentMetadata): void {
    const stats = fs.statSync(targetMeta.path)
    node.type = MarkupNodeType.file
    node.attrs = {
      'file-id': targetMeta.id,
      'data-file-name': targetMeta.name,
      'data-file-size': stats.size,
      'data-file-href': targetMeta.path
    }
    const mimeType = this.getContentType(targetMeta.name)
    if (mimeType !== undefined) {
      node.attrs['data-file-type'] = mimeType
    }
  }

  private getContentType (fileName: string): string | undefined {
    const mimeType = contentType(fileName)
    return mimeType !== false ? mimeType : undefined
  }

  private getSourceMetadata (id: Ref<Doc>): DocMetadata | null {
    const sourceMeta = this.metadataById.get(id)
    if (sourceMeta == null) {
      this.logger.error(`Source metadata not found for ${id}`)
      return null
    }
    return sourceMeta
  }

  private updateAttachmentMetadata (
    fullPath: string,
    attachmentMeta: AttachmentMetadata,
    id: Ref<Doc>,
    spaceId: Ref<Space>,
    sourceMeta: DocMetadata
  ): void {
    this.attachMetadataByPath.set(fullPath, {
      ...attachmentMeta,
      spaceId,
      parentId: id,
      parentClass: sourceMeta.class as Ref<Class<Doc<Space>>>
    })
  }
}

interface DocMetadata {
  id: Ref<Doc>
  class: string
  path: string
  refTitle: string
}

interface AttachmentMetadata {
  id: Ref<Attachment>
  name: string
  path: string
  parentId?: Ref<Doc>
  parentClass?: Ref<Class<Doc<Space>>>
  spaceId?: Ref<Space>
}

export class UnifiedFormatImporter {
  private readonly metadataById = new Map<Ref<Doc>, DocMetadata>()
  private readonly metadataByFilePath = new Map<string, DocMetadata>()
  private readonly attachMetadataByPath = new Map<string, AttachmentMetadata>()

  private personsByName = new Map<string, Ref<Person>>()
  private accountsByEmail = new Map<string, Ref<PersonAccount>>()
  private employeesByName = new Map<string, Ref<Employee>>()

  constructor (
    private readonly client: TxOperations,
    private readonly fileUploader: FileUploader,
    private readonly logger: Logger
  ) {}

  private async initCaches (): Promise<void> {
    await this.cachePersonsByNames()
    await this.cacheAccountsByEmails()
    await this.cacheEmployeesByName()
  }

  async importFolder (folderPath: string): Promise<void> {
    await this.initCaches()
    const workspaceData = await this.processImportFolder(folderPath)

    this.logger.log('========================================')
    this.logger.log('IMPORT DATA STRUCTURE: ' + JSON.stringify(workspaceData))
    this.logger.log('========================================')

    this.logger.log('Importing documents...')
    const preprocessor = new HulyMarkdownPreprocessor(
      this.fileUploader.getFileUrl,
      this.logger,
      this.metadataByFilePath,
      this.metadataById,
      this.attachMetadataByPath,
      this.personsByName
    )
    await new WorkspaceImporter(
      this.client,
      this.logger,
      this.fileUploader,
      workspaceData,
      preprocessor
    ).performImport()

    this.logger.log('Importing attachments...')
    const attachments: ImportAttachment[] = Array.from(this.attachMetadataByPath.values())
      .filter((attachment) => attachment.parentId !== undefined)
      .map((attachment) => {
        return {
          id: attachment.id,
          title: path.basename(attachment.path),
          blobProvider: async () => {
            const data = fs.readFileSync(attachment.path)
            return new Blob([data])
          },
          parentId: attachment.parentId,
          parentClass: attachment.parentClass,
          spaceId: attachment.spaceId
        }
      })
    await new WorkspaceImporter(this.client, this.logger, this.fileUploader, { attachments }).performImport()

    this.logger.log('========================================')
    this.logger.log('IMPORT SUCCESS')
  }

  private async processImportFolder (folderPath: string): Promise<ImportWorkspace> {
    const builder = new ImportWorkspaceBuilder(this.client)
    await builder.initCache()

    // Load workspace settings if exists
    const wsSettingsPath = path.join(folderPath, 'settings.yaml')
    if (fs.existsSync(wsSettingsPath)) {
      const wsSettingsFile = fs.readFileSync(wsSettingsPath, 'utf8')
      const wsSettings = yaml.load(wsSettingsFile) as UnifiedWorkspaceSettings

      // Add project types
      for (const pt of this.processProjectTypes(wsSettings)) {
        builder.addProjectType(pt)
      }
    }

    // Process all yaml files first
    const yamlFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith('.yaml') && f !== 'settings.yaml')

    for (const yamlFile of yamlFiles) {
      const yamlPath = path.join(folderPath, yamlFile)
      const spaceName = path.basename(yamlFile, '.yaml')
      const spacePath = path.join(folderPath, spaceName)

      try {
        this.logger.log(`Processing ${spaceName}...`)
        const spaceConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as UnifiedSpaceSettings

        if (spaceConfig?.class === undefined) {
          this.logger.error(`Skipping ${spaceName}: not a space - no class specified`)
          continue
        }

        switch (spaceConfig.class) {
          case tracker.class.Project: {
            const project = await this.processProject(spaceConfig as UnifiedProjectSettings)
            builder.addProject(spacePath, project)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processIssuesRecursively(builder, project.identifier, spacePath, spacePath)
            }
            break
          }

          case document.class.Teamspace: {
            const teamspace = await this.processTeamspace(spaceConfig as UnifiedTeamspaceSettings)
            builder.addTeamspace(spacePath, teamspace)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processDocumentsRecursively(builder, spacePath, spacePath)
            }
            break
          }

          case documents.class.OrgSpace: {
            const orgSpace = await this.processOrgSpace(spaceConfig as UnifiedOrgSpaceSettings)
            builder.addOrgSpace(spacePath, orgSpace)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processControlledDocumentsRecursively(builder, spacePath, spacePath)
            }
            break
          }

          default: {
            throw new Error(`Unknown space class ${spaceConfig.class} in ${spaceName}`)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Invalid space configuration in ${spaceName}: ${message}`)
      }
    }

    await this.processAttachments(folderPath)

    return builder.build()
  }

  private async processIssuesRecursively (
    builder: ImportWorkspaceBuilder,
    projectIdentifier: string,
    projectPath: string,
    currentPath: string,
    parentIssuePath?: string
  ): Promise<void> {
    const issueFiles = fs.readdirSync(currentPath).filter((f) => f.endsWith('.md'))

    for (const issueFile of issueFiles) {
      const issuePath = path.join(currentPath, issueFile)
      const issueHeader = (await this.readYamlHeader(issuePath)) as UnifiedIssueHeader

      if (issueHeader.class === undefined) {
        this.logger.error(`Skipping ${issueFile}: not an issue`)
        continue
      }

      if (issueHeader.class === tracker.class.Issue) {
        const numberMatch = issueFile.match(/^(\d+)\./)
        const issueNumber = numberMatch?.[1]

        const meta: DocMetadata = {
          id: generateId<Issue>(),
          class: tracker.class.Issue,
          path: issuePath,
          refTitle: `${projectIdentifier}-${issueNumber}`
        }

        this.metadataById.set(meta.id, meta)
        this.metadataByFilePath.set(issuePath, meta)

        const issue: ImportIssue = {
          id: meta.id as Ref<Issue>,
          class: tracker.class.Issue,
          title: issueHeader.title,
          number: parseInt(issueNumber ?? 'NaN'),
          descrProvider: async () => await this.readMarkdownContent(issuePath),
          status: { name: issueHeader.status },
          priority: issueHeader.priority,
          estimation: issueHeader.estimation,
          remainingTime: issueHeader.remainingTime,
          comments: this.processComments(issueHeader.comments),
          subdocs: [], // Will be added via builder
          assignee: this.findPersonByName(issueHeader.assignee)
        }

        builder.addIssue(projectPath, issuePath, issue, parentIssuePath)

        // Process sub-issues if they exist
        const subDir = path.join(currentPath, issueFile.replace('.md', ''))
        if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
          await this.processIssuesRecursively(builder, projectIdentifier, projectPath, subDir, issuePath)
        }
      } else {
        throw new Error(`Unknown issue class ${issueHeader.class} in ${issueFile}`)
      }
    }
  }

  private findPersonByName (name?: string): Ref<Person> | undefined {
    if (name === undefined) {
      return undefined
    }
    const person = this.personsByName.get(name)
    if (person === undefined) {
      throw new Error(`Person not found: ${name}`)
    }
    return person
  }

  private findAccountByEmail (email: string): Ref<PersonAccount> {
    const account = this.accountsByEmail.get(email)
    if (account === undefined) {
      throw new Error(`Account not found: ${email}`)
    }
    return account
  }

  private findEmployeeByName (name: string): Ref<Employee> {
    const employee = this.employeesByName.get(name)
    if (employee === undefined) {
      throw new Error(`Employee not found: ${name}`)
    }
    return employee
  }

  private async processDocumentsRecursively (
    builder: ImportWorkspaceBuilder,
    teamspacePath: string,
    currentPath: string,
    parentDocPath?: string
  ): Promise<void> {
    const docFiles = fs.readdirSync(currentPath).filter((f) => f.endsWith('.md'))

    for (const docFile of docFiles) {
      const docPath = path.join(currentPath, docFile)
      const docHeader = (await this.readYamlHeader(docPath)) as UnifiedDocumentHeader

      if (docHeader.class === undefined) {
        this.logger.error(`Skipping ${docFile}: not a document`)
        continue
      }

      if (docHeader.class === document.class.Document) {
        const docMeta: DocMetadata = {
          id: generateId<Document>(),
          class: document.class.Document,
          path: docPath,
          refTitle: docHeader.title
        }

        this.metadataById.set(docMeta.id, docMeta)
        this.metadataByFilePath.set(docPath, docMeta)

        const doc: ImportDocument = {
          id: docMeta.id as Ref<Document>,
          class: document.class.Document,
          title: docHeader.title,
          descrProvider: async () => await this.readMarkdownContent(docPath),
          subdocs: [] // Will be added via builder
        }

        builder.addDocument(teamspacePath, docPath, doc, parentDocPath)

        // Process subdocuments if they exist
        const subDir = path.join(currentPath, docFile.replace('.md', ''))
        if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
          await this.processDocumentsRecursively(builder, teamspacePath, subDir, docPath)
        }
      } else {
        throw new Error(`Unknown document class ${docHeader.class} in ${docFile}`)
      }
    }
  }

  private async processControlledDocumentsRecursively (
    builder: ImportWorkspaceBuilder,
    spacePath: string,
    currentPath: string,
    parentDocPath?: string
  ): Promise<void> {
    const docFiles = fs.readdirSync(currentPath).filter((f) => f.endsWith('.md'))

    for (const docFile of docFiles) {
      const docPath = path.join(currentPath, docFile)
      const docHeader = (await this.readYamlHeader(docPath)) as UnifiedControlledDocumentHeader | UnifiedDocumentTemplateHeader

      if (docHeader.class === undefined) {
        this.logger.error(`Skipping ${docFile}: not a document`)
        continue
      }

      if (docHeader.class === documents.class.ControlledDocument) {
        const docMeta: DocMetadata = {
          id: generateId<ControlledDocument>(),
          class: documents.class.ControlledDocument,
          path: docPath,
          refTitle: docHeader.title
        }

        this.metadataById.set(docMeta.id, docMeta)
        this.metadataByFilePath.set(docPath, docMeta)

        const doc = await this.processControlledDocument(docHeader as UnifiedControlledDocumentHeader, docPath, docMeta.id as Ref<ControlledDocument>)
        builder.addControlledDocument(spacePath, docPath, doc, parentDocPath)

        const subDir = path.join(currentPath, docFile.replace('.md', ''))
        if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
          await this.processControlledDocumentsRecursively(builder, spacePath, subDir, docPath)
        }
      } else if (docHeader.class === documents.mixin.DocumentTemplate) {
        if (!this.metadataByFilePath.has(docPath)) {
          const meta: DocMetadata = {
            id: generateId<DocumentTemplate>(),
            class: documents.mixin.DocumentTemplate,
            path: docPath,
            refTitle: docHeader.title
          }
          this.metadataById.set(meta.id, meta)
          this.metadataByFilePath.set(docPath, meta)
        }
        const templateMeta = this.metadataByFilePath.get(docPath)
        const template = await this.processControlledDocumentTemplate(docHeader as UnifiedDocumentTemplateHeader, docPath, templateMeta?.id as Ref<DocumentTemplate>)
        builder.addControlledDocumentTemplate(spacePath, docPath, template, parentDocPath)

        const subDir = path.join(currentPath, docFile.replace('.md', ''))
        if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
          await this.processControlledDocumentsRecursively(builder, spacePath, subDir, docPath)
        }
      } else {
        throw new Error(`Unknown document class ${docHeader.class} in ${docFile}`)
      }
    }
  }

  private processComments (comments: UnifiedComment[] = []): ImportComment[] {
    return comments.map((comment) => {
      return {
        text: comment.text,
        author: this.findAccountByEmail(comment.author)
      }
    })
  }

  private processProjectTypes (wsHeader: UnifiedWorkspaceSettings): ImportProjectType[] {
    return (
      wsHeader.projectTypes?.map((pt) => ({
        name: pt.name,
        taskTypes: pt.taskTypes?.map((tt) => ({
          name: tt.name,
          description: tt.description,
          statuses: tt.statuses.map((st) => ({
            name: st.name,
            description: st.description
          }))
        }))
      })) ?? []
    )
  }

  private async processProject (projectHeader: UnifiedProjectSettings): Promise<ImportProject> {
    return {
      class: tracker.class.Project,
      id: projectHeader.id as Ref<Project>,
      title: projectHeader.title,
      identifier: projectHeader.identifier,
      private: projectHeader.private ?? false,
      autoJoin: projectHeader.autoJoin ?? true,
      archived: projectHeader.archived ?? false,
      description: projectHeader.description,
      emoji: projectHeader.emoji,
      defaultIssueStatus:
        projectHeader.defaultIssueStatus !== undefined ? { name: projectHeader.defaultIssueStatus } : undefined,
      owners:
        projectHeader.owners !== undefined ? projectHeader.owners.map((email) => this.findAccountByEmail(email)) : [],
      members:
        projectHeader.members !== undefined ? projectHeader.members.map((email) => this.findAccountByEmail(email)) : [],
      docs: []
    }
  }

  private async processTeamspace (spaceHeader: UnifiedTeamspaceSettings): Promise<ImportTeamspace> {
    return {
      class: document.class.Teamspace,
      title: spaceHeader.title,
      private: spaceHeader.private ?? false,
      autoJoin: spaceHeader.autoJoin ?? true,
      archived: spaceHeader.archived ?? false,
      description: spaceHeader.description,
      emoji: spaceHeader.emoji,
      owners: spaceHeader.owners !== undefined ? spaceHeader.owners.map((email) => this.findAccountByEmail(email)) : [],
      members:
        spaceHeader.members !== undefined ? spaceHeader.members.map((email) => this.findAccountByEmail(email)) : [],
      docs: []
    }
  }

  private async processOrgSpace (spaceHeader: UnifiedOrgSpaceSettings): Promise<ImportOrgSpace> {
    return {
      class: documents.class.OrgSpace,
      title: spaceHeader.title,
      private: spaceHeader.private ?? false,
      archived: spaceHeader.archived ?? false,
      description: spaceHeader.description,
      owners: spaceHeader.owners?.map(email => this.findAccountByEmail(email)) ?? [],
      members: spaceHeader.members?.map(email => this.findAccountByEmail(email)) ?? [],
      qualified: spaceHeader.qualified !== undefined ? this.findAccountByEmail(spaceHeader.qualified) : undefined,
      manager: spaceHeader.manager !== undefined ? this.findAccountByEmail(spaceHeader.manager) : undefined,
      qara: spaceHeader.qara !== undefined ? this.findAccountByEmail(spaceHeader.qara) : undefined,
      docs: []
    }
  }

  private async processControlledDocument (
    header: UnifiedControlledDocumentHeader,
    docPath: string,
    id?: Ref<ControlledDocument>
  ): Promise<ImportControlledDocument> {
    const numberMatch = path.basename(docPath).match(/^(\d+)\./)
    const seqNumber = numberMatch?.[1]

    const author = this.findEmployeeByName(header.author)
    const owner = this.findEmployeeByName(header.owner)
    if (author === undefined || owner === undefined) {
      throw new Error(`Author or owner not found: ${header.author} or ${header.owner}`)
    }

    const templatePath = path.resolve(path.dirname(docPath), header.template)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`)
    }

    if (!this.metadataByFilePath.has(templatePath)) {
      const templateMeta = {
        id: generateId<DocumentTemplate>(),
        class: documents.mixin.DocumentTemplate,
        path: templatePath,
        refTitle: path.basename(templatePath)
      }
      this.metadataByFilePath.set(templatePath, templateMeta)
      this.metadataById.set(templateMeta.id, templateMeta)
    }

    const template = this.metadataByFilePath.get(templatePath)
    if (template?.class !== documents.mixin.DocumentTemplate) {
      throw new Error(`Template is not a controlled document template: ${template?.class}`)
    }

    return {
      id: id as Ref<ControlledDocument>,
      class: documents.class.ControlledDocument,
      title: header.title,
      template: template?.id as Ref<DocumentTemplate>,
      code: header.code,
      seqNumber: parseInt(seqNumber ?? 'NaN'),
      major: 0,
      minor: 1,
      state: DocumentState.Draft,
      category: header.category as Ref<DocumentCategory>,
      author,
      owner,
      abstract: header.abstract,
      reviewers: header.reviewers.map(email => this.findEmployeeByName(email)),
      approvers: header.approvers.map(email => this.findEmployeeByName(email)),
      coAuthors: header.coAuthors.map(email => this.findEmployeeByName(email)),
      changeControl: header.changeControl as Ref<ChangeControl>,
      descrProvider: async () => await this.readMarkdownContent(docPath),
      subdocs: []
    }
  }

  private async processControlledDocumentTemplate (
    header: UnifiedDocumentTemplateHeader,
    docPath: string,
    id?: Ref<DocumentTemplate>
  ): Promise<ImportControlledDocumentTemplate> {
    const author = this.findEmployeeByName(header.author)
    const owner = this.findEmployeeByName(header.owner)
    if (author === undefined || owner === undefined) {
      throw new Error(`Author or owner not found: ${header.author} or ${header.owner}`)
    }

    const numberMatch = path.basename(docPath).match(/^(\d+)\./)
    const seqNumber = numberMatch?.[1]

    return {
      id: id as Ref<DocumentTemplate>,
      class: documents.mixin.DocumentTemplate,
      title: header.title,
      docPrefix: header.docPrefix,
      prefix: header.docPrefix, // todo: different prefix for template
      code: header.code,
      seqNumber: parseInt(seqNumber ?? 'NaN'),
      major: 0,
      minor: 1,
      state: DocumentState.Draft,
      category: header.category as Ref<DocumentCategory>,
      author,
      owner,
      abstract: header.abstract,
      reviewers: header.reviewers.map(email => this.findEmployeeByName(email)),
      approvers: header.approvers.map(email => this.findEmployeeByName(email)),
      coAuthors: header.coAuthors.map(email => this.findEmployeeByName(email)),
      changeControl: header.changeControl as Ref<ChangeControl>,
      descrProvider: async () => await this.readMarkdownContent(docPath),
      subdocs: []
    }
  }

  private async readYamlHeader (filePath: string): Promise<any> {
    this.logger.log('Read YAML header from: ' + filePath)
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

  private async cachePersonsByNames (): Promise<void> {
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

  private async cacheAccountsByEmails (): Promise<void> {
    const accounts = await this.client.findAll(contact.class.PersonAccount, {})
    this.accountsByEmail = accounts.reduce((map, account) => {
      map.set(account.email, account._id)
      return map
    }, new Map())
  }

  private async cacheEmployeesByName (): Promise<void> {
    this.employeesByName = (await this.client.findAll(contact.mixin.Employee, {}))
      .map((employee) => {
        return {
          _id: employee._id,
          name: employee.name.split(',').reverse().join(' ')
        }
      })
      .reduce((refByName, employee) => {
        refByName.set(employee.name, employee._id)
        return refByName
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
            this.attachMetadataByPath.set(fullPath, { id: attachmentId, name: entry.name, path: fullPath })
          }
        }
      }
    }

    await processDir(folderPath)
  }
}
