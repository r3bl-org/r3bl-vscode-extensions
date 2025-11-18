// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

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
