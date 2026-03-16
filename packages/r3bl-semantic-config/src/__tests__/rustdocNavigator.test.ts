// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import {
    findHeadingsInBlock,
    getBlockLabel,
    findLinkRefDefsStart,
    findContainingBlock,
} from '../rustdocNavigator';
import { RustdocBlock } from '../rustdocFolding';
import { mockDocument } from './unitTestFixtures';

describe('findHeadingsInBlock', () => {
    it('extracts headings from /// block', () => {
        const doc = mockDocument([
            '/// # Main Heading',
            '/// Some text',
            '/// ## Sub Heading',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 2, type: 'item' };
        const headings = findHeadingsInBlock(doc, block);
        expect(headings).toEqual([
            { line: 0, level: 1, text: 'Main Heading' },
            { line: 2, level: 2, text: 'Sub Heading' },
        ]);
    });

    it('extracts headings from //! block', () => {
        const doc = mockDocument(['//! # Module Heading', '//! Some text']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'module' };
        const headings = findHeadingsInBlock(doc, block);
        expect(headings).toEqual([{ line: 0, level: 1, text: 'Module Heading' }]);
    });

    it('handles heading levels 1 through 6', () => {
        const doc = mockDocument([
            '/// # H1',
            '/// ## H2',
            '/// ### H3',
            '/// #### H4',
            '/// ##### H5',
            '/// ###### H6',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 5, type: 'item' };
        const headings = findHeadingsInBlock(doc, block);
        expect(headings).toHaveLength(6);
        expect(headings[0]).toEqual({ line: 0, level: 1, text: 'H1' });
        expect(headings[5]).toEqual({ line: 5, level: 6, text: 'H6' });
    });

    it('returns empty array for block with no headings', () => {
        const doc = mockDocument(['/// Just some text', '/// More text']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'item' };
        const headings = findHeadingsInBlock(doc, block);
        expect(headings).toEqual([]);
    });

    it('ignores lines that do not match the block prefix', () => {
        const doc = mockDocument([
            '/// # Real heading',
            '//! # Wrong prefix heading',
            '/// ## Another real heading',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 2, type: 'item' };
        const headings = findHeadingsInBlock(doc, block);
        expect(headings).toEqual([
            { line: 0, level: 1, text: 'Real heading' },
            { line: 2, level: 2, text: 'Another real heading' },
        ]);
    });
});

describe('getBlockLabel', () => {
    it('uses first heading as label', () => {
        const doc = mockDocument(['/// # My Heading', '/// Some content']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'item' };
        const label = getBlockLabel(doc, block);
        expect(label).toBe('/// # My Heading');
    });

    it('falls back to first non-empty content line', () => {
        const doc = mockDocument([
            '/// Some content without heading',
            '/// More content',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'item' };
        const label = getBlockLabel(doc, block);
        expect(label).toBe('/// Some content without heading');
    });

    it('returns empty block label for block with no content', () => {
        const doc = mockDocument(['///', '///']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'item' };
        const label = getBlockLabel(doc, block);
        expect(label).toBe('/// (empty block)');
    });

    it('truncates long content to 60 chars', () => {
        const longContent =
            'This is a very long line of content that definitely exceeds sixty characters and should be truncated';
        const doc = mockDocument([`/// ${longContent}`]);
        const block: RustdocBlock = { startLine: 0, endLine: 0, type: 'item' };
        const label = getBlockLabel(doc, block);
        expect(label).toContain('...');
        // "/// " prefix + 57 chars + "..." = total label
        expect(label.length).toBeLessThanOrEqual(4 + 60);
    });

    it('uses //! prefix for module blocks', () => {
        const doc = mockDocument(['//! # Module Heading']);
        const block: RustdocBlock = { startLine: 0, endLine: 0, type: 'module' };
        const label = getBlockLabel(doc, block);
        expect(label).toBe('//! # Module Heading');
    });
});

describe('findLinkRefDefsStart', () => {
    it('finds link ref defs at bottom of block', () => {
        const doc = mockDocument([
            '/// Some docs',
            '/// More docs',
            '/// [link]: https://example.com',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 2, type: 'item' };
        const result = findLinkRefDefsStart(doc, block);
        expect(result).toBe(2);
    });

    it('finds multiple link ref defs', () => {
        const doc = mockDocument([
            '/// Some docs',
            '/// [link1]: https://example.com',
            '/// [link2]: https://other.com',
        ]);
        const block: RustdocBlock = { startLine: 0, endLine: 2, type: 'item' };
        const result = findLinkRefDefsStart(doc, block);
        expect(result).toBe(1);
    });

    it('returns undefined when no link ref defs', () => {
        const doc = mockDocument(['/// Some docs', '/// More docs']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'item' };
        const result = findLinkRefDefsStart(doc, block);
        expect(result).toBeUndefined();
    });

    it('handles link ref defs in //! blocks', () => {
        const doc = mockDocument(['//! Module docs', '//! [link]: https://example.com']);
        const block: RustdocBlock = { startLine: 0, endLine: 1, type: 'module' };
        const result = findLinkRefDefsStart(doc, block);
        expect(result).toBe(1);
    });
});

describe('findContainingBlock', () => {
    const blocks: RustdocBlock[] = [
        { startLine: 0, endLine: 2, type: 'module' },
        { startLine: 5, endLine: 8, type: 'item' },
        { startLine: 12, endLine: 15, type: 'item' },
    ];

    it('returns block when cursor is inside', () => {
        const result = findContainingBlock(blocks, 6);
        expect(result).toEqual({ startLine: 5, endLine: 8, type: 'item' });
    });

    it('returns block when cursor is at start line', () => {
        const result = findContainingBlock(blocks, 5);
        expect(result).toEqual({ startLine: 5, endLine: 8, type: 'item' });
    });

    it('returns block when cursor is at end line', () => {
        const result = findContainingBlock(blocks, 8);
        expect(result).toEqual({ startLine: 5, endLine: 8, type: 'item' });
    });

    it('returns undefined when cursor is outside all blocks', () => {
        const result = findContainingBlock(blocks, 10);
        expect(result).toBeUndefined();
    });

    it('returns undefined for empty blocks array', () => {
        const result = findContainingBlock([], 5);
        expect(result).toBeUndefined();
    });
});
