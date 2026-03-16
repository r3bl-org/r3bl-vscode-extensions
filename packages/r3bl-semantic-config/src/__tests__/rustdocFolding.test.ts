// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import { findRustdocBlocks } from '../rustdocFolding';
import { mockDocument } from './unitTestFixtures';

describe('findRustdocBlocks', () => {
    it('finds item-level /// blocks', () => {
        const doc = mockDocument([
            '/// This is a doc comment',
            '/// More docs',
            'fn foo() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([{ startLine: 0, endLine: 1, type: 'item' }]);
    });

    it('finds module-level //! blocks', () => {
        const doc = mockDocument([
            '//! Module doc',
            '//! More module doc',
            '',
            'fn foo() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([{ startLine: 0, endLine: 1, type: 'module' }]);
    });

    it('finds mixed /// and //! as separate blocks', () => {
        const doc = mockDocument([
            '//! Module doc',
            '',
            '/// Item doc',
            '/// More item doc',
            'fn foo() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([
            { startLine: 0, endLine: 0, type: 'module' },
            { startLine: 2, endLine: 3, type: 'item' },
        ]);
    });

    it('ignores regular // comments', () => {
        const doc = mockDocument([
            '// This is a regular comment',
            '// Another regular comment',
            'fn foo() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([]);
    });

    it('finds multiple separated /// blocks', () => {
        const doc = mockDocument([
            '/// Doc for foo',
            'fn foo() {}',
            '',
            '/// Doc for bar',
            '/// More bar docs',
            'fn bar() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([
            { startLine: 0, endLine: 0, type: 'item' },
            { startLine: 3, endLine: 4, type: 'item' },
        ]);
    });

    it('returns empty array for empty file', () => {
        const doc = mockDocument([]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([]);
    });

    it('returns empty array for file with no doc comments', () => {
        const doc = mockDocument(['use std::io;', '', 'fn main() {}']);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([]);
    });

    it('handles indented doc comments', () => {
        const doc = mockDocument([
            '    /// Indented doc',
            '    /// More indented doc',
            '    fn foo() {}',
        ]);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([{ startLine: 0, endLine: 1, type: 'item' }]);
    });

    it('treats adjacent //! then /// as separate blocks', () => {
        const doc = mockDocument(['//! Module doc', '/// Item doc', 'fn foo() {}']);
        const blocks = findRustdocBlocks(doc);
        expect(blocks).toEqual([
            { startLine: 0, endLine: 0, type: 'module' },
            { startLine: 1, endLine: 1, type: 'item' },
        ]);
    });
});
