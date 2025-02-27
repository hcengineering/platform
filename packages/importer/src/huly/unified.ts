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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { type Attachment } from '@hcengineering/attachment'
import contact, { Employee, SocialIdentity, type Person } from '@hcengineering/contact'
import {
  AccountUuid,
  buildSocialIdString,
  type Class,
  type Doc,
  generateId,
  PersonId,
  type Ref,
  SocialIdType,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
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
import documents, {
  DocumentState,
  DocumentCategory,
  ControlledDocument,
  DocumentMeta
} from '@hcengineering/controlled-documents'

export interface UnifiedComment {
  author: string
  text: string
  attachments?: string[]
}

export interface UnifiedIssueHeader {
  class: 'tracker:class:Issue'
  title: string
  status: string
  assignee?: string
  priority?: string
  estimation?: number // in hours
  remainingTime?: number // in hours
  comments?: UnifiedComment[]
}

export interface UnifiedSpaceSettings {
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

export interface UnifiedProjectSettings extends UnifiedSpaceSettings {
  class: 'tracker:class:Project'
  identifier: string
  id?: 'tracker:project:DefaultProject'
  projectType?: string
  defaultIssueStatus?: string
}

export interface UnifiedTeamspaceSettings extends UnifiedSpaceSettings {
  class: 'document:class:Teamspace'
}

export interface UnifiedDocumentHeader {
  class: 'document:class:Document'
  title: string
}

export interface UnifiedWorkspaceSettings {
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

export interface UnifiedChangeControlHeader {
  description?: string
  reason?: string
  impact?: string
}

export interface UnifiedControlledDocumentHeader {
  class: 'documents:class:ControlledDocument'
  title: string
  template: string
  author: string
  owner: string
  abstract?: string
  reviewers?: string[]
  approvers?: string[]
  coAuthors?: string[]
  changeControl?: UnifiedChangeControlHeader
}

export interface UnifiedDocumentTemplateHeader {
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
  changeControl?: UnifiedChangeControlHeader
}

export interface UnifiedOrgSpaceSettings extends UnifiedSpaceSettings {
  class: 'documents:class:OrgSpace'
  qualified?: string
  manager?: string
  qara?: string
}

class HulyMarkdownPreprocessor extends BaseMarkdownPreprocessor {
  constructor (
    private readonly urlProvider: (id: string) => string,
    private readonly logger: Logger,
    private readonly pathById: Map<Ref<Doc>, string>,
    private readonly refMetaByPath: Map<string, ReferenceMetadata>,
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

    const sourceMeta = this.refMetaByPath.get(sourcePath)
    if (sourceMeta === undefined) {
      this.logger.error(`Source metadata not found for ${sourcePath}`)
      return
    }

    this.updateAttachmentMetadata(fullPath, attachmentMeta, id, spaceId, sourceMeta)
    this.alterImageNode(node, attachmentMeta.id, attachmentMeta.name)
  }

  private processLinkMarks (node: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): void {
    traverseNodeMarks(node, (mark) => {
      if (mark.type !== MarkupMarkType.link) return

      const sourcePath = this.getSourcePath(id)
      if (sourcePath == null) return

      const href = decodeURI(mark.attrs.href)
      const fullPath = path.resolve(path.dirname(sourcePath), href)

      if (this.refMetaByPath.has(fullPath)) {
        const targetDocMeta = this.refMetaByPath.get(fullPath)
        if (targetDocMeta !== undefined) {
          this.alterInternalLinkNode(node, targetDocMeta)
        }
      } else if (this.attachMetaByPath.has(fullPath)) {
        const attachmentMeta = this.attachMetaByPath.get(fullPath)
        if (attachmentMeta !== undefined) {
          this.alterAttachmentLinkNode(node, attachmentMeta)
          const sourceMeta = this.refMetaByPath.get(sourcePath)
          if (sourceMeta !== undefined) {
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

  private alterInternalLinkNode (node: MarkupNode, targetMeta: ReferenceMetadata): void {
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
    const sourcePath = this.pathById.get(id)
    if (sourcePath == null) {
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
    sourceMeta: ReferenceMetadata
  ): void {
    this.attachMetaByPath.set(fullPath, {
      ...attachmentMeta,
      spaceId,
      parentId: id,
      parentClass: sourceMeta.class as Ref<Class<Doc<Space>>>
    })
  }
}

interface ReferenceMetadata {
  id: Ref<Doc>
  class: string
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
  private readonly importerEmailPlaceholder = 'newuser@huly.io'
  private readonly importerNamePlaceholder = 'New User'
  private readonly pathById = new Map<Ref<Doc>, string>()
  private readonly refMetaByPath = new Map<string, ReferenceMetadata>()
  private readonly fileMetaByPath = new Map<string, AttachmentMetadata>()
  private readonly ctrlDocTemplateIdByPath = new Map<string, Ref<ControlledDocument>>()

  private personsByName = new Map<string, Ref<Person>>()
  private employeesByName = new Map<string, Ref<Employee>>()
  private accountsByEmail = new Map<string, AccountUuid>()

  constructor (
    private readonly client: TxOperations,
    private readonly fileUploader: FileUploader,
    private readonly logger: Logger,
    private readonly importerSocialId?: PersonId,
    private readonly importerPerson?: Ref<Person>
  ) {}

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
      this.pathById,
      this.refMetaByPath,
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

        const meta: ReferenceMetadata = {
          id: generateId<Issue>(),
          class: tracker.class.Issue,
          refTitle: `${projectIdentifier}-${issueNumber}`
        }
        this.pathById.set(meta.id, issuePath)
        this.refMetaByPath.set(issuePath, meta)

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

    if (name === this.importerNamePlaceholder && this.importerPerson != null) {
      return this.importerPerson
    }
    const person = this.personsByName.get(name)
    if (person === undefined) {
      throw new Error(`Person not found: ${name}`)
    }
    return person
  }

  private getSocialIdByEmail (email: string): PersonId {
    if (email === this.importerEmailPlaceholder && this.importerSocialId != null) {
      return this.importerSocialId
    }

    return buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  }

  private findAccountByEmail (email: string): AccountUuid {
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
        const docMeta: ReferenceMetadata = {
          id: generateId<Document>(),
          class: document.class.Document,
          refTitle: docHeader.title
        }

        this.pathById.set(docMeta.id, docPath)
        this.refMetaByPath.set(docPath, docMeta)

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
      const docHeader = (await this.readYamlHeader(docPath)) as
        | UnifiedControlledDocumentHeader
        | UnifiedDocumentTemplateHeader

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

      const documentMetaId = generateId<DocumentMeta>()
      const refMeta: ReferenceMetadata = {
        id: documentMetaId,
        class: documents.class.DocumentMeta,
        refTitle: docHeader.title
      }
      this.refMetaByPath.set(docPath, refMeta)

      if (docHeader.class === documents.class.ControlledDocument) {
        const docId = generateId<ControlledDocument>()
        this.pathById.set(docId, docPath)

        const doc = await this.processControlledDocument(
          docHeader as UnifiedControlledDocumentHeader,
          docPath,
          docId,
          documentMetaId
        )
        builder.addControlledDocument(spacePath, docPath, doc, parentDocPath)
      } else {
        if (!this.ctrlDocTemplateIdByPath.has(docPath)) {
          const templateId = generateId<ControlledDocument>()
          this.ctrlDocTemplateIdByPath.set(docPath, templateId)
          this.pathById.set(templateId, docPath)
        }

        const templateId = this.ctrlDocTemplateIdByPath.get(docPath)
        if (templateId === undefined) {
          throw new Error(`Template ID not found: ${docPath}`)
        }

        const template = await this.processControlledDocumentTemplate(
          docHeader as UnifiedDocumentTemplateHeader,
          docPath,
          templateId,
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

  private processComments (currentPath: string, comments: UnifiedComment[] = []): Promise<ImportComment[]> {
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
          author: this.getSocialIdByEmail(comment.author),
          attachments
        }
      })
    )
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
      owners: spaceHeader.owners?.map((email) => this.findAccountByEmail(email)) ?? [],
      members: spaceHeader.members?.map((email) => this.findAccountByEmail(email)) ?? [],
      qualified: spaceHeader.qualified !== undefined ? this.findAccountByEmail(spaceHeader.qualified) : undefined,
      manager: spaceHeader.manager !== undefined ? this.findAccountByEmail(spaceHeader.manager) : undefined,
      qara: spaceHeader.qara !== undefined ? this.findAccountByEmail(spaceHeader.qara) : undefined,
      docs: []
    }
  }

  private async processControlledDocument (
    header: UnifiedControlledDocumentHeader,
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

    if (!this.ctrlDocTemplateIdByPath.has(templatePath)) {
      const templateId = generateId<ControlledDocument>()
      this.ctrlDocTemplateIdByPath.set(templatePath, templateId)
      this.pathById.set(templateId, templatePath)
    }

    const templateId = this.ctrlDocTemplateIdByPath.get(templatePath)
    if (templateId === undefined) {
      throw new Error(`Template ID not found: ${templatePath}`)
    }

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
      descrProvider: async () => await this.readMarkdownContent(docPath),
      ccReason: header.changeControl?.reason,
      ccImpact: header.changeControl?.impact,
      ccDescription: header.changeControl?.description,
      subdocs: []
    }
  }

  private async processControlledDocumentTemplate (
    header: UnifiedDocumentTemplateHeader,
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
      descrProvider: async () => await this.readMarkdownContent(docPath),
      ccReason: header.changeControl?.reason,
      ccImpact: header.changeControl?.impact,
      ccDescription: header.changeControl?.description,
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

  private async cacheAccountsByEmails (): Promise<void> {
    const employees = await this.client.findAll(
      contact.mixin.Employee,
      { active: true },
      { lookup: { _id: { socialIds: contact.class.SocialIdentity } } }
    )

    this.accountsByEmail = employees.reduce((map, employee) => {
      employee.$lookup?.socialIds?.forEach((socialId) => {
        if ((socialId as SocialIdentity).type === SocialIdType.EMAIL) {
          map.set((socialId as SocialIdentity).value, employee.personUuid)
        }
      })

      return map
    }, new Map())
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
