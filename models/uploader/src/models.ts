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

import uploader from './plugin'
import type { UploadHandlerDefinition, UploadHandler } from '@hcengineering/uploader'
import { DOMAIN_MODEL } from '@hcengineering/core'
import { Model } from '@hcengineering/model'
import { type IntlString, type Asset, type Resource } from '@hcengineering/platform'
import core, { TDoc } from '@hcengineering/model-core'

@Model(uploader.class.UploadHandlerDefinition, core.class.Doc, DOMAIN_MODEL)
export class TUploadHandler extends TDoc implements UploadHandlerDefinition {
  icon!: Asset
  label!: IntlString
  description?: IntlString
  handler!: Resource<UploadHandler>
}
