function normalizeId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compareTaskSequence(left, right) {
  const leftOrder = Number.isFinite(left?.orderIndex) ? left.orderIndex : Number.MAX_SAFE_INTEGER;
  const rightOrder = Number.isFinite(right?.orderIndex) ? right.orderIndex : Number.MAX_SAFE_INTEGER;
  const createdLeft = new Date(left?.created_at || 0).getTime();
  const createdRight = new Date(right?.created_at || 0).getTime();

  return (
    leftOrder - rightOrder ||
    createdLeft - createdRight ||
    String(left?.title || "").localeCompare(String(right?.title || ""), "nb")
  );
}

function uniqueIds(values, excludedId = "") {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeId(value))
        .filter((value) => value && value !== excludedId)
    )
  );
}

function buildsCycle(taskList, taskId, candidateParentId) {
  if (!candidateParentId) {
    return false;
  }

  const taskMap = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, task])
  );
  const visited = new Set([taskId]);
  let currentParentId = candidateParentId;

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return true;
    }

    visited.add(currentParentId);
    currentParentId = normalizeId(taskMap.get(currentParentId)?.parentTaskId);
  }

  return false;
}

export function applyTaskHierarchyUpdates(
  tasks,
  taskId,
  parentTaskId,
  subprojectId,
  subprojectIds = []
) {
  const taskList = Array.isArray(tasks)
    ? tasks.map((task) => (task && typeof task === "object" ? { ...task } : task))
    : [];
  const existingTaskIds = new Set(
    taskList
      .map((task) => (task && typeof task.id === "string" ? task.id : ""))
      .filter(Boolean)
  );
  const existingSubprojectIds = new Set(uniqueIds(subprojectIds));
  const nextParentTaskId = normalizeId(parentTaskId);
  const nextSubprojectId = normalizeId(subprojectId);

  if (!existingTaskIds.has(taskId)) {
    return taskList;
  }

  if (nextParentTaskId) {
    if (!existingTaskIds.has(nextParentTaskId)) {
      throw new Error("Valgt overaktivitet finnes ikke lenger.");
    }

    if (nextParentTaskId === taskId) {
      throw new Error("En aktivitet kan ikke ligge under seg selv.");
    }

    const candidateTasks = taskList.map((task) =>
      task && typeof task === "object" && task.id === taskId
        ? {
            ...task,
            parentTaskId: nextParentTaskId
          }
        : task
    );

    if (buildsCycle(candidateTasks, taskId, nextParentTaskId)) {
      throw new Error("Denne plasseringen lager en sirkel i aktivitetshierarkiet.");
    }
  }

  return taskList.map((task) => {
    if (!task || typeof task !== "object" || task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      parentTaskId: nextParentTaskId,
      subprojectId: existingSubprojectIds.has(nextSubprojectId) ? nextSubprojectId : ""
    };
  });
}

export function buildTaskHierarchyDetails(tasks, subprojects = []) {
  const taskList = Array.isArray(tasks)
    ? tasks.map((task) => (task && typeof task === "object" ? { ...task } : task))
    : [];
  const subprojectMap = new Map(
    (Array.isArray(subprojects) ? subprojects : [])
      .filter((subproject) => subproject && typeof subproject === "object" && typeof subproject.id === "string")
      .map((subproject) => [subproject.id, subproject])
  );
  const taskMap = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, task])
  );
  const sanitizedParentCache = new Map();
  const effectiveSubprojectCache = new Map();
  const hierarchyPathCache = new Map();

  function getSanitizedParentId(taskId, trail = new Set()) {
    if (sanitizedParentCache.has(taskId)) {
      return sanitizedParentCache.get(taskId);
    }

    const task = taskMap.get(taskId);
    const rawParentId = normalizeId(task?.parentTaskId);

    if (!rawParentId || !taskMap.has(rawParentId) || rawParentId === taskId || trail.has(rawParentId)) {
      sanitizedParentCache.set(taskId, "");
      return "";
    }

    const nextTrail = new Set(trail);
    nextTrail.add(taskId);
    const ancestorParentId = getSanitizedParentId(rawParentId, nextTrail);

    if (ancestorParentId && ancestorParentId === taskId) {
      sanitizedParentCache.set(taskId, "");
      return "";
    }

    sanitizedParentCache.set(taskId, rawParentId);
    return rawParentId;
  }

  function getEffectiveSubprojectId(taskId, trail = new Set()) {
    if (effectiveSubprojectCache.has(taskId)) {
      return effectiveSubprojectCache.get(taskId);
    }

    const task = taskMap.get(taskId);
    const explicitSubprojectId = normalizeId(task?.subprojectId);

    if (explicitSubprojectId && subprojectMap.has(explicitSubprojectId)) {
      effectiveSubprojectCache.set(taskId, explicitSubprojectId);
      return explicitSubprojectId;
    }

    const parentTaskId = getSanitizedParentId(taskId);

    if (!parentTaskId || trail.has(parentTaskId)) {
      effectiveSubprojectCache.set(taskId, "");
      return "";
    }

    const nextTrail = new Set(trail);
    nextTrail.add(taskId);
    const inheritedSubprojectId = getEffectiveSubprojectId(parentTaskId, nextTrail);
    effectiveSubprojectCache.set(taskId, inheritedSubprojectId);
    return inheritedSubprojectId;
  }

  function getHierarchyPathIds(taskId) {
    if (hierarchyPathCache.has(taskId)) {
      return hierarchyPathCache.get(taskId);
    }

    const task = taskMap.get(taskId);

    if (!task) {
      hierarchyPathCache.set(taskId, []);
      return [];
    }

    const parentTaskId = getSanitizedParentId(taskId);

    if (!parentTaskId) {
      const rootPath = [taskId];
      hierarchyPathCache.set(taskId, rootPath);
      return rootPath;
    }

    const parentPath = getHierarchyPathIds(parentTaskId);
    const nextPath = [...parentPath, taskId];
    hierarchyPathCache.set(taskId, nextPath);
    return nextPath;
  }

  const childrenMap = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, []])
  );

  taskList.forEach((task) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string") {
      return;
    }

    const parentTaskId = getSanitizedParentId(task.id);

    if (parentTaskId && childrenMap.has(parentTaskId)) {
      childrenMap.get(parentTaskId).push(task.id);
    }
  });

  return taskList.map((task) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string") {
      return task;
    }

    const parentTaskId = getSanitizedParentId(task.id);
    const parentTask = parentTaskId ? taskMap.get(parentTaskId) : null;
    const hierarchyPathIds = getHierarchyPathIds(task.id);
    const hierarchyPathTitles = hierarchyPathIds
      .map((pathTaskId) => taskMap.get(pathTaskId)?.title || "")
      .filter(Boolean);
    const childTaskIds = childrenMap.get(task.id) || [];
    const childTaskTitles = childTaskIds
      .map((childTaskId) => taskMap.get(childTaskId)?.title || "")
      .filter(Boolean);
    const explicitSubprojectId = normalizeId(task.subprojectId);
    const effectiveSubprojectId = getEffectiveSubprojectId(task.id);
    const explicitSubprojectName = subprojectMap.get(explicitSubprojectId)?.name || "";
    const effectiveSubprojectName = subprojectMap.get(effectiveSubprojectId)?.name || "";

    return {
      ...task,
      parentTaskId,
      parentTaskTitle: parentTask?.title || "",
      childTaskIds,
      childTaskTitles,
      hasChildren: childTaskIds.length > 0,
      hierarchyDepth: Math.max(0, hierarchyPathIds.length - 1),
      hierarchyPathIds,
      hierarchyPathTitles,
      hierarchyLabel: hierarchyPathTitles.join(" / "),
      rootTaskId: hierarchyPathIds[0] || task.id,
      rootTaskTitle: hierarchyPathTitles[0] || task.title,
      explicitSubprojectId,
      explicitSubprojectName,
      effectiveSubprojectId,
      effectiveSubprojectName,
      subprojectName: effectiveSubprojectName
    };
  });
}

function buildHierarchyOrder(tasks, subprojects = []) {
  const sortedTasks = [...(Array.isArray(tasks) ? tasks : [])].sort(compareTaskSequence);
  const hierarchyTasks = buildTaskHierarchyDetails(sortedTasks, subprojects);
  const taskMap = new Map(
    hierarchyTasks
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, task])
  );
  const orderedIds = [];

  function visit(taskId) {
    if (!taskMap.has(taskId)) {
      return;
    }

    orderedIds.push(taskId);
    (taskMap.get(taskId)?.childTaskIds || []).forEach((childTaskId) => visit(childTaskId));
  }

  hierarchyTasks
    .filter((task) => task && typeof task === "object" && !normalizeId(task.parentTaskId))
    .forEach((task) => visit(task.id));

  return {
    hierarchyTasks,
    taskMap,
    orderedIds
  };
}

function collectSubtreeTaskIds(taskMap, rootTaskId) {
  const subtreeTaskIds = [];

  function visit(taskId) {
    const task = taskMap.get(taskId);

    if (!task) {
      return;
    }

    subtreeTaskIds.push(taskId);
    (task.childTaskIds || []).forEach((childTaskId) => visit(childTaskId));
  }

  visit(rootTaskId);
  return subtreeTaskIds;
}

export function moveTaskSubtree(
  tasks,
  sourceTaskId,
  targetTaskId,
  placement = "after",
  subprojects = []
) {
  const taskList = Array.isArray(tasks)
    ? tasks.map((task) => (task && typeof task === "object" ? { ...task } : task))
    : [];
  const normalizedSourceTaskId = normalizeId(sourceTaskId);
  const normalizedTargetTaskId = normalizeId(targetTaskId);
  const normalizedPlacement = placement === "before" || placement === "under" ? placement : "after";
  const { taskMap, orderedIds } = buildHierarchyOrder(taskList, subprojects);
  const sourceTask = taskMap.get(normalizedSourceTaskId);
  const targetTask = taskMap.get(normalizedTargetTaskId);

  if (!sourceTask || !targetTask) {
    throw new Error("Fant ikke oppgaven som skulle flyttes.");
  }

  if (normalizedSourceTaskId === normalizedTargetTaskId) {
    throw new Error("En oppgave kan ikke flyttes i forhold til seg selv.");
  }

  const sourceSubtreeTaskIds = collectSubtreeTaskIds(taskMap, normalizedSourceTaskId);

  if (sourceSubtreeTaskIds.includes(normalizedTargetTaskId)) {
    throw new Error("Kan ikke flytte en oppgave inn i sin egen understruktur.");
  }

  const remainingIds = orderedIds.filter((taskId) => !sourceSubtreeTaskIds.includes(taskId));
  const originalTaskMap = new Map(
    taskList
      .filter((task) => task && typeof task === "object" && typeof task.id === "string")
      .map((task) => [task.id, task])
  );
  let insertionIndex = -1;
  let nextParentTaskId = "";
  let nextSubprojectId = normalizeId(sourceTask.explicitSubprojectId || sourceTask.subprojectId);

  if (normalizedPlacement === "under") {
    nextParentTaskId = normalizedTargetTaskId;
    nextSubprojectId = "";

    const targetSubtreeTaskIds = collectSubtreeTaskIds(taskMap, normalizedTargetTaskId).filter(
      (taskId) => !sourceSubtreeTaskIds.includes(taskId)
    );
    const anchorTaskId = targetSubtreeTaskIds[targetSubtreeTaskIds.length - 1] || normalizedTargetTaskId;
    const anchorIndex = remainingIds.indexOf(anchorTaskId);

    insertionIndex = anchorIndex === -1 ? remainingIds.length : anchorIndex + 1;
  } else if (normalizedPlacement === "before") {
    nextParentTaskId = normalizeId(targetTask.parentTaskId);

    if (nextParentTaskId) {
      nextSubprojectId = "";
    } else if (!nextSubprojectId) {
      nextSubprojectId = normalizeId(targetTask.effectiveSubprojectId || targetTask.subprojectId);
    }

    insertionIndex = remainingIds.indexOf(normalizedTargetTaskId);
  } else {
    nextParentTaskId = normalizeId(targetTask.parentTaskId);

    if (nextParentTaskId) {
      nextSubprojectId = "";
    } else if (!nextSubprojectId) {
      nextSubprojectId = normalizeId(targetTask.effectiveSubprojectId || targetTask.subprojectId);
    }

    const targetSubtreeTaskIds = collectSubtreeTaskIds(taskMap, normalizedTargetTaskId).filter(
      (taskId) => !sourceSubtreeTaskIds.includes(taskId)
    );
    const anchorTaskId = targetSubtreeTaskIds[targetSubtreeTaskIds.length - 1] || normalizedTargetTaskId;
    const anchorIndex = remainingIds.indexOf(anchorTaskId);

    insertionIndex = anchorIndex === -1 ? remainingIds.length : anchorIndex + 1;
  }

  if (insertionIndex < 0) {
    throw new Error("Fant ikke hvor oppgaven skulle plasseres.");
  }

  const nextOrderedIds = [
    ...remainingIds.slice(0, insertionIndex),
    ...sourceSubtreeTaskIds,
    ...remainingIds.slice(insertionIndex)
  ];

  return nextOrderedIds
    .map((taskId, index) => {
      const existingTask = originalTaskMap.get(taskId);

      if (!existingTask) {
        return null;
      }

      if (taskId === normalizedSourceTaskId) {
        return {
          ...existingTask,
          parentTaskId: nextParentTaskId,
          subprojectId: nextSubprojectId,
          orderIndex: index
        };
      }

      return {
        ...existingTask,
        orderIndex: index
      };
    })
    .filter(Boolean);
}
