function normalizeTaskIds(values, excludedId = "") {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value && value !== excludedId)
    )
  );
}

function buildDependencyGraph(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const graph = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, []])
  );

  taskList.forEach((task) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string") {
      return;
    }

    normalizeTaskIds(task.dependencyIds, task.id).forEach((dependencyId) => {
      if (!graph.has(dependencyId)) {
        return;
      }

      graph.get(dependencyId).push(task.id);
    });
  });

  return graph;
}

function hasDependencyCycle(tasks) {
  const graph = buildDependencyGraph(tasks);
  const visiting = new Set();
  const visited = new Set();

  function visit(taskId) {
    if (visiting.has(taskId)) {
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visiting.add(taskId);

    for (const nextTaskId of graph.get(taskId) || []) {
      if (visit(nextTaskId)) {
        return true;
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  }

  for (const taskId of graph.keys()) {
    if (visit(taskId)) {
      return true;
    }
  }

  return false;
}

export function deriveFollowingTaskIds(tasks, taskId) {
  if (!taskId) {
    return [];
  }

  const taskList = Array.isArray(tasks) ? tasks : [];

  return taskList
    .filter(
      (task) =>
        task &&
        typeof task === "object" &&
        typeof task.id === "string" &&
        task.id !== taskId &&
        normalizeTaskIds(task.dependencyIds, task.id).includes(taskId)
    )
    .map((task) => task.id);
}

export function applyTaskRelationshipUpdates(tasks, taskId, dependencyIds, followingTaskIds) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const existingIds = new Set(
    taskList
      .map((task) => (task && typeof task === "object" && typeof task.id === "string" ? task.id : ""))
      .filter(Boolean)
  );
  const nextDependencyIds = normalizeTaskIds(dependencyIds, taskId).filter((id) => existingIds.has(id));
  const nextFollowingIds = normalizeTaskIds(followingTaskIds, taskId).filter((id) => existingIds.has(id));
  const overlap = nextDependencyIds.filter((id) => nextFollowingIds.includes(id));

  if (overlap.length > 0) {
    throw new Error("En aktivitet kan ikke komme bade for og etter samme aktivitet.");
  }

  return taskList.map((task) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string") {
      return task;
    }

    const currentDependencyIds = normalizeTaskIds(task.dependencyIds, task.id);

    if (task.id === taskId) {
      return {
        ...task,
        dependencyIds: nextDependencyIds
      };
    }

    const withoutCurrentTask = currentDependencyIds.filter((dependencyId) => dependencyId !== taskId);
    const updatedDependencyIds = nextFollowingIds.includes(task.id)
      ? [...withoutCurrentTask, taskId]
      : withoutCurrentTask;

    return {
      ...task,
      dependencyIds: normalizeTaskIds(updatedDependencyIds, task.id)
    };
  });
}

export function buildTaskDependencyDragPayload(tasks, sourceTaskId, targetTaskId, placement = "after") {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const normalizedPlacement = placement === "before" ? "before" : "after";
  const sourceTask = taskList.find((task) => task && typeof task === "object" && task.id === sourceTaskId);
  const targetTask = taskList.find((task) => task && typeof task === "object" && task.id === targetTaskId);

  if (!sourceTask || !targetTask) {
    throw new Error("Fant ikke aktivitetene som skulle kobles.");
  }

  if (sourceTaskId === targetTaskId) {
    throw new Error("En aktivitet kan ikke kobles til seg selv.");
  }

  const currentDependencyIds = normalizeTaskIds(sourceTask.dependencyIds, sourceTaskId).filter(
    (dependencyId) => dependencyId !== targetTaskId
  );
  const currentFollowingTaskIds = deriveFollowingTaskIds(taskList, sourceTaskId).filter(
    (followingTaskId) => followingTaskId !== targetTaskId
  );
  const nextDependencyIds =
    normalizedPlacement === "after"
      ? normalizeTaskIds([...currentDependencyIds, targetTaskId], sourceTaskId)
      : currentDependencyIds;
  const nextFollowingTaskIds =
    normalizedPlacement === "before"
      ? normalizeTaskIds([...currentFollowingTaskIds, targetTaskId], sourceTaskId)
      : currentFollowingTaskIds;
  const previewTasks = applyTaskRelationshipUpdates(
    taskList,
    sourceTaskId,
    nextDependencyIds,
    nextFollowingTaskIds
  );

  if (!hasDependencyCycle(taskList) && hasDependencyCycle(previewTasks)) {
    throw new Error("Denne koblingen lager en sirkel i avhengighetene.");
  }

  return {
    taskId: sourceTaskId,
    dependencyIds: nextDependencyIds,
    followingTaskIds: nextFollowingTaskIds,
    changed:
      nextDependencyIds.join("|") !== normalizeTaskIds(sourceTask.dependencyIds, sourceTaskId).join("|") ||
      nextFollowingTaskIds.join("|") !== deriveFollowingTaskIds(taskList, sourceTaskId).join("|")
  };
}
