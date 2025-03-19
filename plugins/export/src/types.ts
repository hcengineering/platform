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

export enum OperationType {
  IDENTITY = 'identity',
  GROUP_BY = 'group_by'
  // JOIN = 'join',
  // EXTRACT = 'extract',
  // MAP = 'map'
}

export interface OperationConfig {
  [OperationType.IDENTITY]: undefined
  [OperationType.GROUP_BY]: {
    keyField: string
    valueField?: string
  }
}

export interface TransformOperation {
  type: OperationType
  config: OperationConfig[OperationType]
}

export interface AttributeTransform {
  operations: TransformOperation[]
}

export interface TransformConfig {
  skipAttributes?: string[]
  attributeKeyMap?: Record<string, string>
  attributeTransforms?: Record<string, AttributeTransform>
}
