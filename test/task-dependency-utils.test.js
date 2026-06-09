import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTaskRelationshipUpdates,
  buildTaskDependencyDragPayload,
  deriveFollowingTaskIds
} from "../src/task-dependency-utils.js";

test("deriveFollowingTaskIds finds tasks that come after the current task", () => {
  const tasks = [
    { id: "a", dependencyIds: [] },
    { id: "b", dependencyIds: ["a"] },
    { id: "c", dependencyIds: ["a", "b"] }
  ];

  assert.deepEqual(deriveFollowingTaskIds(tasks, "a"), ["b", "c"]);
  assert.deepEqual(deriveFollowingTaskIds(tasks, "b"), ["c"]);
});

test("applyTaskRelationshipUpdates keeps both before and after links in sync", () => {
  const tasks = [
    { id: "a", title: "A", dependencyIds: ["c"] },
    { id: "b", title: "B", dependencyIds: [] },
    { id: "c", title: "C", dependencyIds: ["b"] }
  ];

  const updated = applyTaskRelationshipUpdates(tasks, "b", ["a"], ["c"]);
  const taskA = updated.find((task) => task.id === "a");
  const taskB = updated.find((task) => task.id === "b");
  const taskC = updated.find((task) => task.id === "c");

  assert.deepEqual(taskB.dependencyIds, ["a"]);
  assert.deepEqual(taskC.dependencyIds, ["b"]);
  assert.deepEqual(taskA.dependencyIds, ["c"]);
});

test("applyTaskRelationshipUpdates rejects impossible circular before/after selection", () => {
  assert.throws(
    () =>
      applyTaskRelationshipUpdates(
        [
          { id: "a", dependencyIds: [] },
          { id: "b", dependencyIds: [] }
        ],
        "a",
        ["b"],
        ["b"]
      ),
    /bade for og etter/
  );
});

test("buildTaskDependencyDragPayload can place a task before another", () => {
  const payload = buildTaskDependencyDragPayload(
    [
      { id: "a", dependencyIds: ["b"] },
      { id: "b", dependencyIds: [] },
      { id: "c", dependencyIds: [] }
    ],
    "a",
    "b",
    "before"
  );

  assert.deepEqual(payload.dependencyIds, []);
  assert.deepEqual(payload.followingTaskIds, ["b"]);
  assert.equal(payload.changed, true);
});

test("buildTaskDependencyDragPayload can place a task after another", () => {
  const payload = buildTaskDependencyDragPayload(
    [
      { id: "a", dependencyIds: [] },
      { id: "b", dependencyIds: [] },
      { id: "c", dependencyIds: ["a"] }
    ],
    "a",
    "b",
    "after"
  );

  assert.deepEqual(payload.dependencyIds, ["b"]);
  assert.deepEqual(payload.followingTaskIds, ["c"]);
  assert.equal(payload.changed, true);
});

test("buildTaskDependencyDragPayload rejects a new cycle", () => {
  assert.throws(
    () =>
      buildTaskDependencyDragPayload(
        [
          { id: "a", dependencyIds: [] },
          { id: "b", dependencyIds: ["a"] },
          { id: "c", dependencyIds: ["b"] }
        ],
        "a",
        "c",
        "after"
      ),
    /sirkel i avhengighetene/
  );
});
