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

import { type Document, ExternalSpace, Project } from '@hcengineering/controlled-documents'
import { Attachment } from '@hcengineering/attachment'
import { type CollectionSize, type Ref, Markup } from '@hcengineering/core'
import { IconProps } from '@hcengineering/view'

/** @public */
export enum TestCaseType {
  Functional,
  Performance,
  Regression,
  Security,
  Smoke,
  Usability
}

/** @public */
export const testCaseTypes = [TestCaseType.Functional, TestCaseType.Performance, TestCaseType.Regression, TestCaseType.Security, TestCaseType.Smoke, TestCaseType.Usability]

/** @public */
export enum TestCasePriority {
	Low,
	Medium,
	High,
	Urgent
}




/** @public */
export const productVersionStates = [ProductVersionState.Active, ProductVersionState.Released]

/** @public */
export interface Product extends ExternalSpace, IconProps {
  fullDescription?: Markup
  attachments?: CollectionSize<Attachment>
}

/** @public */
export interface ProductVersion extends Project<Product> {
  major: number
  minor: number
  codename?: string
  description: Markup
  state: ProductVersionState
  parent: Ref<ProductVersion>
  changeControl?: Ref<Document>
}
