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

function parseDateTimeValue(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareDependencyDisplay(leftTask, rightTask) {
  const leftTime =
    parseDateTimeValue(leftTask?.displayStartAt || leftTask?.scheduledStartAt || leftTask?.desiredStartAt) ??
    Number.MAX_SAFE_INTEGER;
  const rightTime =
    parseDateTimeValue(rightTask?.displayStartAt || rightTask?.scheduledStartAt || rightTask?.desiredStartAt) ??
    Number.MAX_SAFE_INTEGER;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftAgendaPosition = Number.isFinite(leftTask?.agendaPosition)
    ? leftTask.agendaPosition
    : Number.MAX_SAFE_INTEGER;
  const rightAgendaPosition = Number.isFinite(rightTask?.agendaPosition)
    ? rightTask.agendaPosition
    : Number.MAX_SAFE_INTEGER;

  if (leftAgendaPosition !== rightAgendaPosition) {
    return leftAgendaPosition - rightAgendaPosition;
  }

  const leftOrder = Number.isFinite(leftTask?.orderIndex) ? leftTask.orderIndex : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(rightTask?.orderIndex) ? rightTask.orderIndex : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return String(leftTask?.title || "").localeCompare(String(rightTask?.title || ""), "nb");
}

export function hasTaskDependencyCycle(tasks) {
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

function buildDependencyOverviewItems(tasks) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const taskMap = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, task])
  );
  const successorMap = buildDependencyGraph(taskList);

  return taskList
    .filter((task) => task && typeof task === "object" && typeof task.id === "string")
    .map((task) => {
      const predecessorIds = normalizeTaskIds(task.dependencyIds, task.id).filter((dependencyId) =>
        taskMap.has(dependencyId)
      );
      const successorIds = normalizeTaskIds(successorMap.get(task.id) || [], task.id).filter(
        (successorId) => taskMap.has(successorId)
      );

      return {
        ...task,
        predecessorIds,
        predecessorCount: predecessorIds.length,
        successorIds,
        successorCount: successorIds.length,
        isStartTask: predecessorIds.length === 0,
        isIndependent: predecessorIds.length === 0 && successorIds.length === 0,
        hasCrossDependencies: predecessorIds.length > 1
      };
    })
    .sort(compareDependencyDisplay);
}

export function buildTaskDependencySummary(tasks) {
  const items = buildDependencyOverviewItems(tasks);
  const taskMap = new Map(items.map((task) => [task.id, task]));

  return {
    summary: {
      total: items.length,
      startTasks: items.filter((task) => task.isStartTask).length,
      dependentTasks: items.filter((task) => task.predecessorCount > 0).length,
      influencingTasks: items.filter((task) => task.successorCount > 0).length,
      independentTasks: items.filter((task) => task.isIndependent).length,
      crossLinkedTasks: items.filter((task) => task.hasCrossDependencies).length
    },
    tasks: items,
    taskMap
  };
}

export function buildTaskDependencyForest(tasks) {
  const overview = buildTaskDependencySummary(tasks);
  const safeTasks = overview.tasks;
  const taskMap = overview.taskMap;
  const successorMap = new Map(
    safeTasks.map((task) => [
      task.id,
      [...task.successorIds].sort((leftId, rightId) =>
        compareDependencyDisplay(taskMap.get(leftId), taskMap.get(rightId))
      )
    ])
  );
  const rootIds = safeTasks.filter((task) => task.isStartTask).map((task) => task.id);
  const upstreamRootMap = new Map(safeTasks.map((task) => [task.id, new Set()]));

  function markUpstreamRoots(taskId, rootId, ancestry = new Set()) {
    if (!taskMap.has(taskId) || ancestry.has(taskId)) {
      return;
    }

    upstreamRootMap.get(taskId)?.add(rootId);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(taskId);

    (successorMap.get(taskId) || []).forEach((successorId) => {
      markUpstreamRoots(successorId, rootId, nextAncestry);
    });
  }

  rootIds.forEach((rootId) => {
    markUpstreamRoots(rootId, rootId);
  });

  function buildNode(taskId, ancestry = []) {
    const task = taskMap.get(taskId);

    if (!task || ancestry.includes(taskId)) {
      return null;
    }

    const nextAncestry = [...ancestry, taskId];
    const children = (successorMap.get(taskId) || [])
      .map((successorId) => buildNode(successorId, nextAncestry))
      .filter(Boolean);

    return {
      id: task.id,
      task,
      predecessorIds: task.predecessorIds,
      predecessorCount: task.predecessorCount,
      successorIds: task.successorIds,
      successorCount: task.successorCount,
      upstreamRootIds: [...(upstreamRootMap.get(task.id) || [])].sort(),
      children
    };
  }

  const roots = rootIds
    .sort((leftId, rightId) => compareDependencyDisplay(taskMap.get(leftId), taskMap.get(rightId)))
    .map((rootId) => buildNode(rootId))
    .filter(Boolean);
  const coveredTaskIds = new Set();

  function collectNodeIds(node) {
    if (!node || coveredTaskIds.has(node.id)) {
      return;
    }

    coveredTaskIds.add(node.id);
    (node.children || []).forEach(collectNodeIds);
  }

  roots.forEach(collectNodeIds);

  return {
    ...overview,
    roots,
    disconnected: safeTasks.filter((task) => !coveredTaskIds.has(task.id))
  };
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

  if (!hasTaskDependencyCycle(taskList) && hasTaskDependencyCycle(previewTasks)) {
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
