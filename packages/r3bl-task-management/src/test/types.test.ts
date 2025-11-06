// Copyright (c) 2025 R3BL LLC. Licensed under MIT License.

import * as assert from 'assert';
import { TaskSpace, TaskSpaceStorage } from '../types';

suite('Types Test Suite', () => {
  test('TaskSpace interface structure', () => {
    const taskSpace: TaskSpace = {
      name: 'Test Space',
      id: 'test-id-123',
      tabs: ['file1.ts', 'file2.ts'],
      taskFile: 'task/test.md',
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    assert.strictEqual(taskSpace.name, 'Test Space');
    assert.strictEqual(taskSpace.id, 'test-id-123');
    assert.strictEqual(taskSpace.tabs.length, 2);
    assert.strictEqual(taskSpace.taskFile, 'task/test.md');
    assert.ok(taskSpace.createdAt > 0);
    assert.ok(taskSpace.lastAccessed > 0);
  });

  test('TaskSpace without optional taskFile', () => {
    const taskSpace: TaskSpace = {
      name: 'Test Space',
      id: 'test-id-123',
      tabs: [],
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    assert.strictEqual(taskSpace.taskFile, undefined);
  });

  test('TaskSpaceStorage interface structure', () => {
    const storage: TaskSpaceStorage = {
      version: '1.0',
      taskSpaces: [],
      activeTaskSpaceId: undefined
    };

    assert.strictEqual(storage.version, '1.0');
    assert.strictEqual(storage.taskSpaces.length, 0);
    assert.strictEqual(storage.activeTaskSpaceId, undefined);
  });

  test('TaskSpaceStorage with active task space', () => {
    const taskSpace: TaskSpace = {
      name: 'Test',
      id: 'id-1',
      tabs: [],
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    const storage: TaskSpaceStorage = {
      version: '1.0',
      taskSpaces: [taskSpace],
      activeTaskSpaceId: 'id-1'
    };

    assert.strictEqual(storage.taskSpaces.length, 1);
    assert.strictEqual(storage.activeTaskSpaceId, 'id-1');
    assert.strictEqual(storage.taskSpaces[0].id, 'id-1');
  });

  test('Empty tabs array is valid', () => {
    const taskSpace: TaskSpace = {
      name: 'Empty Space',
      id: 'empty-id',
      tabs: [],
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    assert.strictEqual(taskSpace.tabs.length, 0);
    assert.ok(Array.isArray(taskSpace.tabs));
  });
});
