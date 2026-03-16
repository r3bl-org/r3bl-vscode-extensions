// Copyright (c) 2024-2025 R3BL LLC. Licensed under MIT License.

import { findImportBlock } from '../rustUseStatementsFolding';
import { mockDocument } from './unitTestFixtures';

describe('findImportBlock', () => {
    it('finds a standard contiguous use block', () => {
        const doc = mockDocument([
            'use super::tasks::orchestrator::spawn_orchestrator_task;',
            'use crate::{CaptureFlag, DetectFlag};',
            'use miette::{IntoDiagnostic, miette};',
            'use std::collections::HashMap;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 3 });
    });

    it('finds multi-line use with braces spanning lines', () => {
        const doc = mockDocument([
            'use crate::{CaptureFlag, ControlledChildTerminationHandle, DefaultPtySize, DefaultSize,',
            '            DetectFlag, InputEventSenderHalf, OutputEventReceiverHalf, PtyCommand,',
            '            PtyInputEvent, PtyOrchestratorHandle, PtyOutputEvent, PtyPair, Size};',
            'use miette::{IntoDiagnostic, miette};',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 3 });
    });

    it('finds use after //! module docs', () => {
        const doc = mockDocument([
            '//! This is a module doc',
            '//! More module docs',
            '',
            'use std::io;',
            'use std::fs;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 3, endLine: 4 });
    });

    it('finds use after #![...] inner attributes', () => {
        const doc = mockDocument([
            '#![allow(dead_code)]',
            '#![feature(test)]',
            '',
            'use std::io;',
            'use std::fs;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 3, endLine: 4 });
    });

    it('finds use after //! docs and #![...] attributes combined', () => {
        const doc = mockDocument([
            '//! Module doc',
            '',
            '#![allow(dead_code)]',
            '',
            'use std::io;',
            'use std::fs;',
            'use std::path::PathBuf;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 4, endLine: 6 });
    });

    it('handles blank lines between use groups', () => {
        const doc = mockDocument([
            'use super::tasks::orchestrator::spawn_orchestrator_task;',
            '',
            'use crate::{CaptureFlag, DetectFlag};',
            '',
            'use std::collections::HashMap;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 4 });
    });

    it('returns null for file with no use statements', () => {
        const doc = mockDocument(['fn main() {}', '    println!("hello");', '}']);
        const block = findImportBlock(doc);
        expect(block).toBeNull();
    });

    it('returns null for single use line (minimum 2 lines)', () => {
        const doc = mockDocument(['use std::io;', '', 'fn main() {}']);
        const block = findImportBlock(doc);
        expect(block).toBeNull();
    });

    it('returns block for single multi-line use spanning 2+ lines', () => {
        const doc = mockDocument([
            'use crate::{CaptureFlag,',
            '            DetectFlag};',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 1 });
    });

    it('ignores use statements in inner modules (top-of-file only)', () => {
        const doc = mockDocument([
            'fn main() {}',
            '',
            'mod inner {',
            '    use std::io;',
            '    use std::fs;',
            '}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toBeNull();
    });

    it('finds use after regular // comments in preamble', () => {
        const doc = mockDocument([
            '// Copyright (c) 2024 Example Corp.',
            '// Licensed under MIT License.',
            '',
            'use std::io;',
            'use std::fs;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 3, endLine: 4 });
    });

    it('handles empty file', () => {
        const doc = mockDocument([]);
        const block = findImportBlock(doc);
        expect(block).toBeNull();
    });

    it('handles file with only use statements', () => {
        const doc = mockDocument([
            'use std::io;',
            'use std::fs;',
            'use std::path::PathBuf;',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 2 });
    });

    it('handles the real-world example from pty_session_builder.rs', () => {
        const doc = mockDocument([
            'use super::tasks::orchestrator::spawn_orchestrator_task;',
            'use crate::{CaptureFlag, ControlledChildTerminationHandle, DefaultPtySize, DefaultSize,',
            '            DetectFlag, InputEventSenderHalf, OutputEventReceiverHalf, PtyCommand,',
            '            PtyInputEvent, PtyOrchestratorHandle, PtyOutputEvent, PtyPair, Size};',
            'use miette::{IntoDiagnostic, miette};',
            'use std::{collections::HashMap,',
            '          ops::{Add, AddAssign},',
            '          path::PathBuf};',
            '',
            '/// Some doc comment',
            'pub struct PtySessionBuilder {',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 7 });
    });

    it('stops at /// doc comments after use block', () => {
        const doc = mockDocument([
            'use std::io;',
            'use std::fs;',
            '/// Documentation for the next item',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 0, endLine: 1 });
    });

    it('allows regular comments between use groups', () => {
        const doc = mockDocument([
            '// External crates',
            'use serde::Serialize;',
            'use tokio::sync::mpsc;',
            '',
            '// Standard library',
            'use std::io;',
            'use std::fs;',
            '',
            'fn main() {}',
        ]);
        const block = findImportBlock(doc);
        expect(block).toEqual({ startLine: 1, endLine: 6 });
    });
});
