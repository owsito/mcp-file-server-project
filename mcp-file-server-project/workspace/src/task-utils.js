export function isComplete(task) {
  return task.status === 'done';
}

export function getOpenTasks(tasks) {
  return tasks.filter((task) => task.status !== 'done');
}

export function getOverdueTasks(tasks, today = new Date().toISOString().slice(0, 10)) {
  return tasks.filter((task) => task.dueDate < today && !isComplete(task));
}

export function countByStatus(tasks) {
  return tasks.reduce((counts, task) => {
    counts[task.status] = (counts[task.status] || 0) + 1;
    return counts;
  }, {});
}
