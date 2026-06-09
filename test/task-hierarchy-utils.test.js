import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTaskHierarchyUpdates,
  buildTaskHierarchyDetails,
  moveTaskSubtree
} from "../src/task-hierarchy-utils.js";

test("buildTaskHierarchyDetails derives inherited subproject and nested hierarchy", () => {
  const tasks = buildTaskHierarchyDetails(
    [
      {
        id: "task-parent",
        title: "Taler",
        subprojectId: "subproject-program"
      },
      {
        id: "task-child",
        title: "Tale fra mor",
        parentTaskId: "task-parent"
      },
      {
        id: "task-grandchild",
        title: "Mikrofon sjekk",
        parentTaskId: "task-child"
      }
    ],
    [
      {
        id: "subproject-program",
        name: "Program"
      }
    ]
  );

  const parentTask = tasks.find((task) => task.id === "task-parent");
  const childTask = tasks.find((task) => task.id === "task-child");
  const grandchildTask = tasks.find((task) => task.id === "task-grandchild");

  assert.equal(parentTask.effectiveSubprojectName, "Program");
  assert.equal(parentTask.hasChildren, true);
  assert.deepEqual(parentTask.childTaskIds, ["task-child"]);
  assert.equal(childTask.parentTaskTitle, "Taler");
  assert.equal(childTask.hierarchyDepth, 1);
  assert.equal(childTask.effectiveSubprojectName, "Program");
  assert.equal(childTask.hierarchyLabel, "Taler / Tale fra mor");
  assert.equal(grandchildTask.parentTaskTitle, "Tale fra mor");
  assert.equal(grandchildTask.hierarchyDepth, 2);
  assert.equal(grandchildTask.effectiveSubprojectId, "subproject-program");
});

test("applyTaskHierarchyUpdates rejects circular parent placement", () => {
  assert.throws(
    () =>
      applyTaskHierarchyUpdates(
        [
          {
            id: "task-parent",
            title: "Taler"
          },
          {
            id: "task-child",
            title: "Tale fra mor",
            parentTaskId: "task-parent"
          }
        ],
        "task-parent",
        "task-child",
        "",
        []
      ),
    /sirkel i aktivitetshierarkiet/
  );
});

test("moveTaskSubtree can place a task under another task and keeps descendants with it", () => {
  const nextTasks = moveTaskSubtree(
    [
      {
        id: "task-parent-a",
        title: "Velkomstdrink",
        orderIndex: 0
      },
      {
        id: "task-child-a1",
        title: "Hente is",
        parentTaskId: "task-parent-a",
        orderIndex: 1
      },
      {
        id: "task-parent-b",
        title: "Taler",
        orderIndex: 2
      }
    ],
    "task-parent-a",
    "task-parent-b",
    "under"
  );

  const movedParent = nextTasks.find((task) => task.id === "task-parent-a");
  const movedChild = nextTasks.find((task) => task.id === "task-child-a1");

  assert.equal(movedParent.parentTaskId, "task-parent-b");
  assert.equal(movedChild.parentTaskId, "task-parent-a");
  assert.deepEqual(
    nextTasks.map((task) => task.id),
    ["task-parent-b", "task-parent-a", "task-child-a1"]
  );
});

test("moveTaskSubtree can place a task after another task on the same level", () => {
  const nextTasks = moveTaskSubtree(
    [
      {
        id: "task-a",
        title: "Kirke",
        orderIndex: 0
      },
      {
        id: "task-b",
        title: "Middag",
        orderIndex: 1
      },
      {
        id: "task-c",
        title: "Fest",
        orderIndex: 2
      }
    ],
    "task-a",
    "task-b",
    "after"
  );

  assert.deepEqual(
    nextTasks.map((task) => task.id),
    ["task-b", "task-a", "task-c"]
  );
  assert.equal(nextTasks.find((task) => task.id === "task-a").parentTaskId, "");
});

test("moveTaskSubtree rejects moving a task into its own descendant", () => {
  assert.throws(
    () =>
      moveTaskSubtree(
        [
          {
            id: "task-parent",
            title: "Taler",
            orderIndex: 0
          },
          {
            id: "task-child",
            title: "Tale fra mor",
            parentTaskId: "task-parent",
            orderIndex: 1
          }
        ],
        "task-parent",
        "task-child",
        "under"
      ),
    /egen understruktur/
  );
});
