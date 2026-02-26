//
// Copyright © 2025 Hardcore Engineering Inc.
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

import type { Class, Doc, Domain, Ref } from '@hcengineering/core'
import type { ExportResultRecord } from '@hcengineering/export'
import { type Builder, Model, Prop, ArrOf, TypeRef, TypeString, TypeNumber, UX } from '@hcengineering/model'
import core, { TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import workbench from '@hcengineering/workbench'
import view from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import exportPlugin from '@hcengineering/export'

import exportModelPlugin from './plugin'

export { exportId } from '@hcengineering/export'
export * from './migration'
export default exportModelPlugin

export const DOMAIN_EXPORT = 'export' as Domain

@Model(exportPlugin.class.ExportResultRecord, core.class.Doc, DOMAIN_EXPORT)
@UX(exportPlugin.string.ImportCompleted, exportPlugin.icon.Export)
export class TExportResultRecord extends TDoc implements ExportResultRecord {
  @Prop(TypeString(), exportPlugin.string.SourceWorkspace)
    sourceWorkspace!: string

  @Prop(TypeString(), exportPlugin.string.TargetWorkspace)
    targetWorkspace!: string

  @Prop(TypeNumber(), exportPlugin.string.ExportedCount)
    exportedCount!: number

  @Prop(ArrOf(TypeRef(core.class.Doc)), exportPlugin.string.ExportedDocumentIds)
    exportedDocumentIds!: Ref<Doc>[]

  @Prop(TypeRef(core.class.Class), exportPlugin.string.ExportedDocumentClass)
    objectClass!: Ref<Class<Doc>>

  @Prop(TypeString(), view.string.Title)
    title?: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TExportResultRecord)

  builder.mixin(exportPlugin.class.ExportResultRecord, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: view.component.BaseDocPresenter
  })

  builder.mixin(exportPlugin.class.ExportResultRecord, core.class.Class, view.mixin.ObjectPanel, {
    component: exportPlugin.component.ExportResultPanel
  })

  builder.mixin(exportPlugin.class.ExportResultRecord, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: exportPlugin.function.ExportResultTitleProvider
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: exportPlugin.string.Import,
      icon: exportPlugin.icon.Export,
      objectClass: exportPlugin.class.ExportResultRecord
    },
    exportPlugin.ids.ImportNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: exportPlugin.string.ImportedDocuments,
      group: exportPlugin.ids.ImportNotificationGroup,
      txClasses: [],
      objectClass: exportPlugin.class.ExportResultRecord,
      defaultEnabled: true,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p><p>{link}</p>',
        subjectTemplate: '{title}'
      }
    },
    exportPlugin.ids.ImportedDocumentsNotification
  )

  builder.createDoc(
    presentation.class.ComponentPointExtension,
    core.space.Model,
    {
      extension: workbench.extensions.SpecialViewAction,
      component: exportModelPlugin.component.ExportButton
    },
    exportModelPlugin.extensions.ExportButton
  )
}
