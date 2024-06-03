//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import documents, { type DocumentSection } from '@hcengineering/controlled-documents'
import { getClient } from '@hcengineering/presentation'
import { createEffect, forward } from 'effector'
import { documentSectionDescriptionEditingCompleted } from './actions'

export const updateDocumentSectionDescriptionFx = createEffect(
  async ({ section, description }: { section: DocumentSection, description: string }) => {
    if (section === null || section === undefined) {
      return
    }

    const client = getClient()

    const currentDesc = client.getHierarchy().as(section, documents.mixin.DocumentTemplateSection).description

    if (currentDesc === description) {
      return
    }

    await client.updateMixin(section._id, section._class, section.space, documents.mixin.DocumentTemplateSection, {
      description
    })
  }
)

forward({ from: updateDocumentSectionDescriptionFx, to: documentSectionDescriptionEditingCompleted })
