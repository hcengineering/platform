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


/** @public */
export class Form {
  id: string
  title: string
  questions: Array<Question<AnswerType<any>>>

  constructor(title: string, questions: Array<Question<AnswerType<any>>>) {
    this.title = title;
    this.questions = questions;
  }
}

/** @public */
export class Question<T extends AnswerType<any>> {
  id!: string
  formId!: string
  title: string
  isRequired!: boolean
  defaultAnswer?: T
  answerType: typeof AnswerType
  answerTypeArguments?: Array<any>

  constructor(title: string, answerType: typeof AnswerType<any>, answerTypeArguments?: Array<any>) {
    this.title = title;
    this.answerType = answerType;
    this.answerTypeArguments = answerTypeArguments;
  }
}

/** @public */
export class Answer<T> {
  id: string
  completedFormId: string
  questionId!: string
  value: T

  constructor(value: T) {
    this.value = value;
  }
}

export class CompletedForm {
  id: string
  formId: string
}


/** @public */
export class AnswerType<T> {
  value: T

  constructor({ value }: { value: T}) {
    this.value = value;
  }
}

/** @public */
export class StringAnswerType extends AnswerType<string> {
}

/** @public */
export class DropDownAnswerType extends AnswerType<string> {
  options: Array<string>

  constructor({ value, options }: { value: string, options: Array<string> }) {
    super({ value });
    if (!options.includes(value)) {
      throw new Error("Invalid value outside of defined options");
    }
    this.options = options;
  }
}

/** @public */
export class MultiSelectAnswerType extends AnswerType<Array<string>> {
  options: Array<string>

  constructor({ value, options }: { value: Array<string>, options: Array<string> }) {
    super({ value });
    if (!value.every(v => options.includes(v))) {
      throw new Error("Invalid value outside of defined options");
    }
    this.options = options;
  }
}
