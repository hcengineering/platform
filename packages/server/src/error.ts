//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

export class ApiError extends Error {
  public code: number
  public message: string

  private constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.message = message
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(message: string): ApiError {
    return new ApiError(400, `Bad Request: ${message}`)
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, `Forbidden: ${message}`)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message
    }
  }

  toString(): string {
    return JSON.stringify(this.toJSON())
  }
}
