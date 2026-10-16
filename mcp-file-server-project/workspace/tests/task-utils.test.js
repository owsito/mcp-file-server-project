import test from 'node:test';
import assert from 'node:assert/strict';
import { isComplete, getOpenTasks, getOverdueTasks, countByStatus } from '../src/task-utils.js';

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

test('getOverdueTasks returns overdue tasks that are not done', () => {
  const tasks = [
    { title: 'Overdue open', status: 'open', dueDate: '2026-10-14' },
    { title: 'Overdue in progress', status: 'in-progress', dueDate: '2026-10-15' },
    { title: 'Due today', status: 'open', dueDate: '2026-10-16' },
    { title: 'Not yet due', status: 'open', dueDate: '2026-10-17' },
    { title: 'Completed overdue', status: 'done', dueDate: '2026-10-10' }
  ];

  assert.deepEqual(
    getOverdueTasks(tasks, '2026-10-16').map((task) => task.title),
    ['Overdue open', 'Overdue in progress']
  );
});

test('countByStatus counts each task state', () => {
  assert.deepEqual(countByStatus([
    { status: 'open' }, { status: 'open' }, { status: 'done' }
  ]), { open: 2, done: 1 });
});
