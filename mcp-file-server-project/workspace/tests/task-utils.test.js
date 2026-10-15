import test from 'node:test';
import assert from 'node:assert/strict';
import { isComplete, getOpenTasks, countByStatus } from '../src/task-utils.js';

test('isComplete recognizes tasks marked done', () => {
  assert.equal(isComplete({ title: 'Submit report', status: 'done' }), true);
  assert.equal(isComplete({ title: 'Prepare demo', status: 'open' }), false);
});

test('getOpenTasks keeps all tasks that are not done', () => {
  const tasks = [
    { title: 'A', status: 'open' },
    { title: 'B', status: 'in-progress' },
    { title: 'C', status: 'done' }
  ];
  assert.deepEqual(getOpenTasks(tasks).map((task) => task.title), ['A', 'B']);
});

test('countByStatus counts each task state', () => {
  assert.deepEqual(countByStatus([
    { status: 'open' }, { status: 'open' }, { status: 'done' }
  ]), { open: 2, done: 1 });
});
