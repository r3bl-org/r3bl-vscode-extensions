// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

'use script';

import * as configuration from '../configuration';

export class Copyright {
    protected author: string;
    protected year: string;
    protected note: string;

    constructor() {
        this.author = configuration.getAuthor();
        this.year = new Date().getFullYear().toString();
        this.note = configuration.getNote();
    }

    public header(): string {
        let template = `/*
 *   Copyright (c) ${this.year} ${this.author}
 *   All rights reserved.\n`;

        if (this.note) {
            template += ` *   ${this.note}\n`;
        }

        template += ` */\n`;

        return template;
    }
}
