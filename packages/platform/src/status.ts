//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

/**
 * Anticrm Platform Foundation Types
 * @packageDocumentation
 */

import type { StatusCode } from './platform'
import platform from './platform'

/**
 * Status severity
 * @public
 */
export enum Severity {
  OK = 'OK',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

/**
 * Status of an operation
 * @public
 */
export class Status<P extends Record<string, any> = {}> {
  readonly severity: Severity
  readonly code: StatusCode<P>
  readonly params: P

  constructor (severity: Severity, code: StatusCode<P>, params: P) {
    this.severity = severity
    this.code = code
    this.params = params
  }
}

/**
 * Error object wrapping `Status`
 * @public
 */
export class PlatformError<P extends Record<string, any>> extends Error {
  readonly status: Status<P>

  constructor (status: Status<P>) {
    super(`${status.severity}: ${status.code} ${JSON.stringify(status.params)}`)
    this.status = status
  }
}

/**
 * OK Status
 * @public
 */
export const OK = new Status(Severity.OK, platform.status.OK, {})

/**
 * Error Status
 * @public
 */
export const ERROR = new Status(Severity.ERROR, platform.status.BadError, {})

/**
 * Error Status for Unauthorized
 * @public
 */
export const UNAUTHORIZED = new Status(Severity.ERROR, platform.status.Unauthorized, {})

/**
 * @public
 * @param message -
 * @returns
 */
export function unknownStatus (message: string): Status<{}> {
  return new Status(Severity.ERROR, platform.status.UnknownError, { message })
}

/**
 * Creates unknown error status
 * @public
 */
export function unknownError (err: unknown): Status {
  return err instanceof PlatformError ? err.status : err instanceof Error ? unknownStatus(err.message) : ERROR
}
