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

import { Mixin, type Class, type Doc, type Ref } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'

import { plugin } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { ActionCategory, Viewlet } from '@hcengineering/view'
import type { DocumentSpaceType, DocumentSpaceTypeDescriptor } from '@hcengineering/controlled-documents'
import { TestSuite, TestCase } from './types'

/** @public */
export const testManagementId = 'testManagement' as Plugin

/** @public */
export const testManagementPlugin = plugin(testManagementId, {
  app: {
    TestManagement: '' as Ref<Doc>
  },
  icon: {
    TestManagement: '' as Asset,
    TestManagementVersion: '' as Asset,
    TestManagementApplication: '' as Asset
  },
  class: {
    TestCase: '' as Ref<Class<TestCase>>,
    TestSuite: '' as Ref<Class<TestSuite>>,
  },
  mixin: {
    TestCaseTypeData: '' as Ref<Mixin<TestCase>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  category: {
    TestManagement: '' as Ref<ActionCategory>
  },
  component: {
    TestCaseSearchIcon: '' as AnyComponent
  },
  ids: {
    NoParent: '' as Ref<TestSuite>
  },
  spaceType: {
    TestCaseType: '' as Ref<DocumentSpaceType>
  },
  spaceTypeDescriptor: {
    TestCaseType: '' as Ref<DocumentSpaceTypeDescriptor>
  },
  viewlet: {
    TableTestCase: '' as Ref<Viewlet>,
  }
})

/**
 * @public
 */
export default testManagementPlugin
