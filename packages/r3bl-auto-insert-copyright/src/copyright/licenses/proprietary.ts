/*
 *   Copyright (c) 2023 Nazmul Idris
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

'use strict'

import { Copyright } from '../copyright'

export class Proprietary extends Copyright {
  constructor() {
    super()
  }

  public header(): string {
    let template = `/*
 * Copyright (c) ${this.year} ${this.author}
 * All rights reserved.
 *
 * This file is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 *
 * Proprietary and confidential.
 */
\n`
    return template
  }
}
