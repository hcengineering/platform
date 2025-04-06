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

import { IntlString } from '@hcengineering/platform'
import { ExecutionError } from '@hcengineering/process'
import { ExecuteResult } from '@hcengineering/server-process'

export function isError (value: ExecuteResult | any): value is ExecutionError {
  return (value as ExecutionError).error !== undefined
}

export class ProcessError extends Error {
  constructor (
    public readonly error: string,
    public readonly message: IntlString,
    public readonly props: Record<string, any>,
    public readonly intlProps: Record<string, IntlString>,
    public readonly shouldLog: boolean = false
  ) {
    super(error)
  }
}

export function processError (
  message: IntlString,
  props: Record<string, any> = {},
  intlProps: Record<string, IntlString> = {},
  shouldLog: boolean = false
): ProcessError {
  return new ProcessError(message, message, props, intlProps, shouldLog)
}

export function parseError (err: ProcessError): ExecutionError {
  return { error: err.message, props: err.props, intlProps: err.intlProps }
}
