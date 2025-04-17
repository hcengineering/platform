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
import card from '@hcengineering/card'
import contact, { Employee, type Person, type PersonAccount } from '@hcengineering/contact'
import documents, {
  ControlledDocument,
  DocumentCategory,
  DocumentMeta,
  DocumentState
} from '@hcengineering/controlled-documents'
import { type Class, type Doc, generateId, type Ref, type Space, type TxOperations } from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
import core from '@hcengineering/model-core'
import { MarkupMarkType, type MarkupNode, MarkupNodeType, traverseNode, traverseNodeMarks } from '@hcengineering/text'
import tracker, { type Issue, Project } from '@hcengineering/tracker'
import * as fs from 'fs'
import sizeOf from 'image-size'
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
  ImportDrawing,
  type ImportIssue,
  ImportOrgSpace,
  type ImportProject,
  type ImportProjectType,
  type ImportTeamspace,
  type ImportWorkspace,
  WorkspaceImporter
} from '../importer/importer'
import { type Logger } from '../importer/logger'
import { BaseMarkdownPreprocessor } from '../importer/preprocessor'
import { type FileUploader } from '../importer/uploader'
import { CardsProcessor } from './cards'
import { MetadataRegistry, MentionMetadata } from './registry'
import { readMarkdownContent, readYamlHeader } from './parsing'
export interface HulyComment {
  author: string
  text: string
  attachments?: string[]
}

export interface HulyIssueHeader {
  class: 'tracker:class:Issue'
  title: string
  status: string
  assignee?: string
  priority?: string
  estimation?: number // in hours
  remainingTime?: number // in hours
  comments?: HulyComment[]
}

export interface HulySpaceSettings {
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

export interface HulyProjectSettings extends HulySpaceSettings {
  class: 'tracker:class:Project'
  identifier: string
  id?: 'tracker:project:DefaultProject'
  projectType?: string
  defaultIssueStatus?: string
}

export interface HulyTeamspaceSettings extends HulySpaceSettings {
  class: 'document:class:Teamspace'
}

export interface HulyDocumentHeader {
  class: 'document:class:Document'
  title: string
}

export interface HulyWorkspaceSettings {
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

export interface HulyChangeControlHeader {
  description?: string
  reason?: string
  impact?: string
}

export interface HulyControlledDocumentHeader {
  class: 'documents:class:ControlledDocument'
  title: string
  template: string
  author: string
  owner: string
  abstract?: string
  reviewers?: string[]
  approvers?: string[]
  coAuthors?: string[]
  changeControl?: HulyChangeControlHeader
}

export interface HulyDocumentTemplateHeader {
  class: 'documents:mixin:DocumentTemplate'
  title: string
  category: string
  docPrefix: string
  author: string
  owner: string
  abstract?: string
  reviewers?: string[]
  approvers?: string[]
  coAuthors?: string[]
  changeControl?: HulyChangeControlHeader
}

export interface HulyOrgSpaceSettings extends HulySpaceSettings {
  class: 'documents:class:OrgSpace'
  qualified?: string
  manager?: string
  qara?: string
}

class HulyMarkdownPreprocessor extends BaseMarkdownPreprocessor {
  constructor (
    private readonly urlProvider: (id: string) => string,
    private readonly logger: Logger,
    private readonly metadataRegistry: MetadataRegistry,
    private readonly attachMetaByPath: Map<string, AttachmentMetadata>,
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

    const sourcePath = this.getSourcePath(id)
    if (sourcePath == null) return

    const href = decodeURI(src as string)
    const fullPath = path.resolve(path.dirname(sourcePath), href)
    const attachmentMeta = this.attachMetaByPath.get(fullPath)

    if (attachmentMeta === undefined) {
      this.logger.error(`Attachment image not found for ${fullPath}`)
      return
    }

    if (!this.metadataRegistry.hasRefMetadata(sourcePath)) {
      this.logger.error(`Source metadata not found for ${sourcePath}`)
      return
    }

    const sourceMeta = this.metadataRegistry.getRefMetadata(sourcePath)
    this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
    this.alterImageNode(node, attachmentMeta.id, attachmentMeta.name)
  }

  private processLinkMarks (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    traverseNodeMarks(node, (mark) => {
      if (mark.type !== MarkupMarkType.link) return

      const sourcePath = this.getSourcePath(id)
      if (sourcePath == null) return

      const href = decodeURI(mark.attrs?.href ?? '')
      const fullPath = path.resolve(path.dirname(sourcePath), href)

      if (this.metadataRegistry.hasRefMetadata(fullPath)) {
        const targetDocMeta = this.metadataRegistry.getRefMetadata(fullPath)
        this.alterMentionNode(node, targetDocMeta)
      } else if (this.attachMetaByPath.has(fullPath)) {
        const attachmentMeta = this.attachMetaByPath.get(fullPath)
        if (attachmentMeta !== undefined) {
          this.alterAttachmentLinkNode(node, attachmentMeta)
          if (this.metadataRegistry.hasRefMetadata(sourcePath)) {
            const sourceMeta = this.metadataRegistry.getRefMetadata(sourcePath)
            this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
          }
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

  private alterMentionNode (node: MarkupNode, targetMeta: MentionMetadata): void {
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

  private getSourcePath (id: Ref<Doc>): string | null {
    const sourcePath = this.metadataRegistry.getPath(id)
    if (sourcePath === undefined) {
      this.logger.error(`Source file path not found for ${id}`)
      return null
    }
    return sourcePath
  }

  private updateAttachmentMetadata (
    fullPath: string,
    attachmentMeta: AttachmentMetadata,
    id: Ref<Doc>,
    spaceId: Ref<Space>,
    sourceMeta: MentionMetadata
  ): void {
    this.attachMetaByPath.set(fullPath, {
      ...attachmentMeta,
      spaceId,
      parentId: id,
      parentClass: sourceMeta.class as Ref<Class<Doc<Space>>>
    })
  }
}

interface AttachmentMetadata {
  id: Ref<Attachment>
  name: string
  path: string
  parentId?: Ref<Doc>
  parentClass?: Ref<Class<Doc<Space>>>
  spaceId?: Ref<Space>
}

export class HulyFormatImporter {
  private personsByName = new Map<string, Ref<Person>>()
  private accountsByEmail = new Map<string, Ref<PersonAccount>>()
  private employeesByName = new Map<string, Ref<Employee>>()

  private readonly fileMetaByPath = new Map<string, AttachmentMetadata>()

  private readonly metadataRegistry = new MetadataRegistry()
  private readonly cardsProcessor: CardsProcessor

  constructor (
    private readonly client: TxOperations,
    private readonly fileUploader: FileUploader,
    private readonly logger: Logger
  ) {
    this.cardsProcessor = new CardsProcessor(this.metadataRegistry, this.logger)
  }

  private async initCaches (): Promise<void> {
    await this.cachePersonsByNames()
    await this.cacheAccountsByEmails()
    await this.cacheEmployeesByName()
  }

  async importFolder (folderPath: string): Promise<void> {
    await this.initCaches()
    const workspaceData = await this.processImportFolder(folderPath)

    await this.collectFileMetadata(folderPath)

    this.logger.log('========================================')
    this.logger.log('IMPORT DATA STRUCTURE: ' + JSON.stringify(workspaceData))
    this.logger.log('========================================')

    this.logger.log('Importing documents...')
    const preprocessor = new HulyMarkdownPreprocessor(
      this.fileUploader.getFileUrl,
      this.logger,
      this.metadataRegistry,
      this.fileMetaByPath,
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

    const attachments: ImportAttachment[] = await Promise.all(
      Array.from(this.fileMetaByPath.values())
        .filter((attachMeta) => attachMeta.parentId !== undefined)
        .map(async (attachMeta: AttachmentMetadata) => await this.processAttachment(attachMeta))
    )
    await new WorkspaceImporter(this.client, this.logger, this.fileUploader, { attachments }).performImport()

    this.logger.log('========================================')
    this.logger.log('IMPORT SUCCESS')
  }

  private async processAttachment (attachMeta: AttachmentMetadata): Promise<ImportAttachment> {
    const fileType = contentType(attachMeta.name)

    const attachment: ImportAttachment = {
      id: attachMeta.id,
      title: path.basename(attachMeta.path),
      blobProvider: async () => {
        const data = fs.readFileSync(attachMeta.path)
        const props = fileType !== false ? { type: fileType } : undefined
        return new Blob([data], props)
      },
      parentId: attachMeta.parentId,
      parentClass: attachMeta.parentClass,
      spaceId: attachMeta.spaceId
    }

    if (fileType !== false && fileType?.startsWith('image/')) {
      try {
        const imageDimensions = sizeOf(attachMeta.path)
        attachment.metadata = {
          originalWidth: imageDimensions.width ?? 0,
          originalHeight: imageDimensions.height ?? 0
        }
      } catch (error) {
        this.logger.error(`Failed to get image dimensions: ${attachMeta.path}`, error)
      }

      const pathDetails = path.parse(attachMeta.path)
      const childrenDir = path.join(pathDetails.dir, pathDetails.name.replace(pathDetails.ext, ''))
      if (fs.existsSync(childrenDir) && fs.statSync(childrenDir).isDirectory()) {
        attachment.drawings = await this.processDrawings(childrenDir)
      }
    }

    return attachment
  }

  private async processDrawings (folderPath: string): Promise<ImportDrawing[]> {
    this.logger.log(`Processing drawings in ${folderPath}...`)
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    const drawings: ImportDrawing[] = []
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name)
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const content = fs.readFileSync(fullPath, 'utf8')
        const json = JSON.parse(content)
        if (json.class !== 'drawing:class:Drawing') {
          this.logger.log(`Skipping ${fullPath}: not a drawing`)
          continue
        }

        drawings.push({
          contentProvider: async () => {
            return JSON.stringify(json.content)
          }
        })
      }
    }
    return drawings
  }

  private async processImportFolder (folderPath: string): Promise<ImportWorkspace> {
    const builder = new ImportWorkspaceBuilder(this.client)
    await builder.initCache()

    // Load workspace settings if exists
    const wsSettingsPath = path.join(folderPath, 'settings.yaml')
    if (fs.existsSync(wsSettingsPath)) {
      const wsSettingsFile = fs.readFileSync(wsSettingsPath, 'utf8')
      const wsSettings = yaml.load(wsSettingsFile) as HulyWorkspaceSettings

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
        const spaceConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as HulySpaceSettings

        if (spaceConfig?.class === undefined) {
          this.logger.error(`Skipping ${spaceName}: not a space - no class specified`)
          continue
        }

        switch (spaceConfig.class) {
          case tracker.class.Project: {
            const project = await this.processProject(spaceConfig as HulyProjectSettings)
            builder.addProject(spacePath, project)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processIssuesRecursively(builder, project.identifier, spacePath, spacePath)
            }
            break
          }

          case document.class.Teamspace: {
            const teamspace = await this.processTeamspace(spaceConfig as HulyTeamspaceSettings)
            builder.addTeamspace(spacePath, teamspace)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processDocumentsRecursively(builder, spacePath, spacePath)
            }
            break
          }

          case documents.class.OrgSpace: {
            const orgSpace = await this.processOrgSpace(spaceConfig as HulyOrgSpaceSettings)
            builder.addOrgSpace(spacePath, orgSpace)
            if (fs.existsSync(spacePath) && fs.statSync(spacePath).isDirectory()) {
              await this.processControlledDocumentsRecursively(builder, spacePath, spacePath)
            }
            break
          }

          case core.class.Enum:
          case core.class.Association:
          case card.class.MasterTag: {
            this.logger.log(`Skipping ${spaceName}: will be processed later`)
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

    const { docs, mixins, updates, files } = await this.cardsProcessor.processDirectory(folderPath)

    const ws = builder.build()
    ws.unifiedDocs = {
      docs: Array.from(docs.values()).flat(),
      mixins: Array.from(mixins.values()).flat(),
      updates: Array.from(updates.values()).flat(),
      files: Array.from(files.values())
    }
    return ws
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
      const issueHeader = (await readYamlHeader(issuePath)) as HulyIssueHeader

      if (issueHeader.class === undefined) {
        this.logger.error(`Skipping ${issueFile}: not an issue`)
        continue
      }

      if (issueHeader.class === tracker.class.Issue) {
        const numberMatch = issueFile.match(/^(\d+)\./)
        const issueNumber = numberMatch?.[1]

        this.metadataRegistry.setRefMetadata(issuePath, tracker.class.Issue, `${projectIdentifier}-${issueNumber}`)

        const issue: ImportIssue = {
          id: this.metadataRegistry.getRef(issuePath) as Ref<Issue>,
          class: tracker.class.Issue,
          title: issueHeader.title,
          number: parseInt(issueNumber ?? 'NaN'),
          descrProvider: async () => await readMarkdownContent(issuePath),
          status: { name: issueHeader.status },
          priority: issueHeader.priority,
          estimation: issueHeader.estimation,
          remainingTime: issueHeader.remainingTime,
          comments: await this.processComments(currentPath, issueHeader.comments),
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
      const docHeader = (await readYamlHeader(docPath)) as HulyDocumentHeader

      if (docHeader.class === undefined) {
        this.logger.error(`Skipping ${docFile}: not a document`)
        continue
      }

      if (docHeader.class === document.class.Document) {
        this.metadataRegistry.setRefMetadata(docPath, document.class.Document, docHeader.title)

        const doc: ImportDocument = {
          id: this.metadataRegistry.getRef(docPath) as Ref<Document>,
          class: document.class.Document,
          title: docHeader.title,
          descrProvider: async () => await readMarkdownContent(docPath),
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
      const docHeader = (await readYamlHeader(docPath)) as HulyControlledDocumentHeader | HulyDocumentTemplateHeader

      if (docHeader.class === undefined) {
        this.logger.error(`Skipping ${docFile}: not a document`)
        continue
      }

      if (
        docHeader.class !== documents.class.ControlledDocument &&
        docHeader.class !== documents.mixin.DocumentTemplate
      ) {
        throw new Error(`Unknown document class ${docHeader.class} in ${docFile}`)
      }

      const documentMetaId = this.metadataRegistry.getRef(docPath) as Ref<DocumentMeta>
      this.metadataRegistry.setRefMetadata(docPath, documents.class.DocumentMeta, docHeader.title)

      if (docHeader.class === documents.class.ControlledDocument) {
        const doc = await this.processControlledDocument(
          docHeader as HulyControlledDocumentHeader,
          docPath,
          this.metadataRegistry.getRef(docPath) as Ref<ControlledDocument>,
          documentMetaId
        )
        builder.addControlledDocument(spacePath, docPath, doc, parentDocPath)
      } else {
        const template = await this.processControlledDocumentTemplate(
          docHeader as HulyDocumentTemplateHeader,
          docPath,
          this.metadataRegistry.getRef(docPath) as Ref<ControlledDocument>,
          documentMetaId
        )
        builder.addControlledDocumentTemplate(spacePath, docPath, template, parentDocPath)
      }

      const subDir = path.join(currentPath, docFile.replace('.md', ''))
      if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
        await this.processControlledDocumentsRecursively(builder, spacePath, subDir, docPath)
      }
    }
  }

  private processComments (currentPath: string, comments: HulyComment[] = []): Promise<ImportComment[]> {
    return Promise.all(
      comments.map(async (comment) => {
        const attachments: ImportAttachment[] = []
        if (comment.attachments !== undefined) {
          for (const attachmentPath of comment.attachments) {
            const fullPath = path.resolve(currentPath, attachmentPath)
            const attachmentMeta = this.fileMetaByPath.get(fullPath)
            if (attachmentMeta !== undefined) {
              const importAttachment = await this.processAttachment(attachmentMeta)
              attachments.push(importAttachment)
            }
          }
        }
        return {
          text: comment.text,
          author: this.findAccountByEmail(comment.author),
          attachments
        }
      })
    )
  }

  private processProjectTypes (wsHeader: HulyWorkspaceSettings): ImportProjectType[] {
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

  private async processProject (projectHeader: HulyProjectSettings): Promise<ImportProject> {
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

  private async processTeamspace (spaceHeader: HulyTeamspaceSettings): Promise<ImportTeamspace> {
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

  private async processOrgSpace (spaceHeader: HulyOrgSpaceSettings): Promise<ImportOrgSpace> {
    return {
      class: documents.class.OrgSpace,
      title: spaceHeader.title,
      private: spaceHeader.private ?? false,
      archived: spaceHeader.archived ?? false,
      description: spaceHeader.description,
      owners: spaceHeader.owners?.map((email) => this.findAccountByEmail(email)) ?? [],
      members: spaceHeader.members?.map((email) => this.findAccountByEmail(email)) ?? [],
      qualified: spaceHeader.qualified !== undefined ? this.findAccountByEmail(spaceHeader.qualified) : undefined,
      manager: spaceHeader.manager !== undefined ? this.findAccountByEmail(spaceHeader.manager) : undefined,
      qara: spaceHeader.qara !== undefined ? this.findAccountByEmail(spaceHeader.qara) : undefined,
      docs: []
    }
  }

  private async processControlledDocument (
    header: HulyControlledDocumentHeader,
    docPath: string,
    id: Ref<ControlledDocument>,
    metaId: Ref<DocumentMeta>
  ): Promise<ImportControlledDocument> {
    const codeMatch = path.basename(docPath).match(/^\[([^\]]+)\]/)

    const author = this.findEmployeeByName(header.author)
    const owner = this.findEmployeeByName(header.owner)
    if (author === undefined || owner === undefined) {
      throw new Error(`Author or owner not found: ${header.author} or ${header.owner}`)
    }

    const templatePath = path.resolve(path.dirname(docPath), header.template)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`)
    }

    const templateId = this.metadataRegistry.getRef(templatePath) as Ref<ControlledDocument>

    return {
      id,
      metaId,
      class: documents.class.ControlledDocument,
      title: header.title,
      template: templateId,
      code: codeMatch?.[1],
      major: 0,
      minor: 1,
      state: DocumentState.Draft,
      author,
      owner,
      abstract: header.abstract,
      reviewers: header.reviewers?.map((email) => this.findEmployeeByName(email)) ?? [],
      approvers: header.approvers?.map((email) => this.findEmployeeByName(email)) ?? [],
      coAuthors: header.coAuthors?.map((email) => this.findEmployeeByName(email)) ?? [],
      descrProvider: async () => await readMarkdownContent(docPath),
      ccReason: header.changeControl?.reason,
      ccImpact: header.changeControl?.impact,
      ccDescription: header.changeControl?.description,
      subdocs: []
    }
  }

  private async processControlledDocumentTemplate (
    header: HulyDocumentTemplateHeader,
    docPath: string,
    id: Ref<ControlledDocument>,
    metaId: Ref<DocumentMeta>
  ): Promise<ImportControlledDocumentTemplate> {
    const author = this.findEmployeeByName(header.author)
    const owner = this.findEmployeeByName(header.owner)
    if (author === undefined || owner === undefined) {
      throw new Error(`Author or owner not found: ${header.author} or ${header.owner}`)
    }

    const codeMatch = path.basename(docPath).match(/^\[([^\]]+)\]/)
    return {
      id,
      metaId,
      class: documents.mixin.DocumentTemplate,
      title: header.title,
      docPrefix: header.docPrefix,
      code: codeMatch?.[1],
      major: 0,
      minor: 1,
      state: DocumentState.Draft,
      category: header.category as Ref<DocumentCategory>,
      author,
      owner,
      abstract: header.abstract,
      reviewers: header.reviewers?.map((email) => this.findEmployeeByName(email)) ?? [],
      approvers: header.approvers?.map((email) => this.findEmployeeByName(email)) ?? [],
      coAuthors: header.coAuthors?.map((email) => this.findEmployeeByName(email)) ?? [],
      descrProvider: async () => await readMarkdownContent(docPath),
      ccReason: header.changeControl?.reason,
      ccImpact: header.changeControl?.impact,
      ccDescription: header.changeControl?.description,
      subdocs: []
    }
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

  private async collectFileMetadata (folderPath: string): Promise<void> {
    const processDir = async (dir: string): Promise<void> => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await processDir(fullPath)
        } else if (entry.isFile()) {
          const attachmentId = generateId<Attachment>()
          this.fileMetaByPath.set(fullPath, { id: attachmentId, name: entry.name, path: fullPath })
        }
      }
    }

    await processDir(folderPath)
  }
}
