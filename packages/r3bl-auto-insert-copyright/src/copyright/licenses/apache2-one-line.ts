// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

'use strict';

import { Copyright } from '../copyright';

export class Apache2OneLine extends Copyright {
    constructor() {
        super();
    }

    public header(): string {
        let template = `// Copyright (c) ${this.year} ${this.author}. Licensed under Apache License, Version 2.0.
`;
        return template;
    }
}
