# Sparse Matrix Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static teaching webpage in `part3/` that visualizes `part3/sparse_matrix.c` step-by-step for triple-table construction, naive transpose, fast transpose, and optimized fast transpose.

**Architecture:** Keep the page as three static assets in `part3/`: one HTML shell, one CSS stylesheet, and one JavaScript file. Put all algorithm replay logic in `part3/sparse_matrix_visualizer.js`, but structure the file around pure helper functions first so Node's built-in test runner can verify matrix conversion, step generation, rendering helpers, and playback state without needing a browser.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js `node:test`, Python `http.server`

---

## File Structure

- Create: `part3/sparse_matrix_visualizer.html` — semantic page shell with fixed mount points for controls, data tables, explanation, state panels, and summary.
- Create: `part3/sparse_matrix_visualizer.css` — layout, typography, card styling, algorithm tabs, tables, array strips, and active-state highlight rules.
- Create: `part3/sparse_matrix_visualizer.js` — sample matrix constants, pure data helpers, step snapshot generators, render helpers, playback state helpers, and DOM bootstrapping.
- Create: `part3/sparse_matrix_visualizer.test.js` — automated checks for the pure helpers plus smoke checks for the HTML shell and stylesheet selectors.
- Do not modify: `part3/sparse_matrix.c` — this is the source of truth being visualized.
- Do not modify: `part3/sparse_matrix.exe` — it is already modified in the working tree and must stay out of commits.

## Task 1: Scaffold the testable JavaScript module

**Files:**
- Create: `part3/sparse_matrix_visualizer.js`
- Create: `part3/sparse_matrix_visualizer.test.js`

- [ ] **Step 1: Write the failing test**

Create `part3/sparse_matrix_visualizer.test.js` with the first three expectations around the fixed sample matrix and the most basic helpers:

```js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  INITIAL_MATRIX,
  EXPECTED_TRANSPOSE_MATRIX,
  buildTriples,
  transposeTriple,
  buildMatrixFromTriples,
} = require('./sparse_matrix_visualizer.js');

test('buildTriples extracts the sample triples in scan order', () => {
  const triples = buildTriples(INITIAL_MATRIX);

  assert.equal(triples.length, 9);
  assert.deepEqual(triples.slice(0, 3), [
    { row: 1, col: 2, value: 12 },
    { row: 1, col: 3, value: 9 },
    { row: 3, col: 1, value: -3 },
  ]);
  assert.deepEqual(triples.at(-1), { row: 6, col: 3, value: -4 });
});

test('transposeTriple swaps row and column without changing value', () => {
  assert.deepEqual(
    transposeTriple({ row: 4, col: 3, value: 24 }),
    { row: 3, col: 4, value: 24 },
  );
});

test('buildMatrixFromTriples rebuilds the expected transpose matrix', () => {
  const transposeTriples = [
    { row: 1, col: 3, value: -3 },
    { row: 1, col: 5, value: 15 },
    { row: 2, col: 1, value: 12 },
    { row: 3, col: 1, value: 9 },
    { row: 3, col: 4, value: 24 },
    { row: 3, col: 6, value: -4 },
    { row: 4, col: 5, value: -7 },
    { row: 5, col: 4, value: 18 },
    { row: 6, col: 3, value: 14 },
  ];

  assert.deepEqual(
    buildMatrixFromTriples(transposeTriples, 6, 6),
    EXPECTED_TRANSPOSE_MATRIX,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: FAIL with `Cannot find module './sparse_matrix_visualizer.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `part3/sparse_matrix_visualizer.js` with the fixed sample data and just enough helpers to satisfy the test:

```js
const INITIAL_MATRIX = [
  [0, 12, 9, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [-3, 0, 0, 0, 0, 14],
  [0, 0, 24, 0, 18, 0],
  [15, 0, 0, -7, 0, 0],
  [0, 0, -4, 0, 0, 0],
];

const EXPECTED_TRANSPOSE_MATRIX = [
  [0, 0, -3, 0, 15, 0],
  [12, 0, 0, 0, 0, 0],
  [9, 0, 0, 24, 0, -4],
  [0, 0, 0, 0, -7, 0],
  [0, 0, 0, 18, 0, 0],
  [0, 0, 14, 0, 0, 0],
];

function buildTriples(matrix) {
  const triples = [];

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      const value = matrix[row][col];
      if (value !== 0) {
        triples.push({ row: row + 1, col: col + 1, value });
      }
    }
  }

  return triples;
}

function transposeTriple(triple) {
  return {
    row: triple.col,
    col: triple.row,
    value: triple.value,
  };
}

function buildMatrixFromTriples(triples, rows, cols) {
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (const triple of triples) {
    matrix[triple.row - 1][triple.col - 1] = triple.value;
  }

  return matrix;
}

if (typeof module !== 'undefined') {
  module.exports = {
    INITIAL_MATRIX,
    EXPECTED_TRANSPOSE_MATRIX,
    buildTriples,
    transposeTriple,
    buildMatrixFromTriples,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add part3/sparse_matrix_visualizer.js part3/sparse_matrix_visualizer.test.js
git commit -m "test: scaffold sparse matrix visualizer helpers"
```

## Task 2: Implement triple-table replay and naive transpose snapshots

**Files:**
- Modify: `part3/sparse_matrix_visualizer.js`
- Modify: `part3/sparse_matrix_visualizer.test.js`

- [ ] **Step 1: Write the failing test**

Extend `part3/sparse_matrix_visualizer.test.js` with build-phase and naive-transpose expectations:

```js
const {
  INITIAL_MATRIX,
  EXPECTED_TRANSPOSE_MATRIX,
  buildMatrixFromTriples,
  generateBuildSteps,
  generateNaiveSteps,
} = require('./sparse_matrix_visualizer.js');

test('generateBuildSteps grows the source triple table to nine rows', () => {
  const steps = generateBuildSteps(INITIAL_MATRIX);

  assert.equal(steps[0].phase, 'build-intro');
  assert.equal(steps.at(-1).phase, 'build-complete');
  assert.equal(steps.at(-1).sourceTriples.length, 9);
  assert.match(steps.at(-1).description, /三元组表/);
});

test('generateNaiveSteps finishes with the expected transpose matrix', () => {
  const steps = generateNaiveSteps(INITIAL_MATRIX);
  const finalStep = steps.at(-1);

  assert.equal(finalStep.algorithm, 'naive');
  assert.equal(finalStep.functionName, 'transpose_naive');
  assert.deepEqual(
    buildMatrixFromTriples(finalStep.resultTriples, 6, 6),
    EXPECTED_TRANSPOSE_MATRIX,
  );
});

test('generateNaiveSteps records the active source row and active column', () => {
  const steps = generateNaiveSteps(INITIAL_MATRIX);
  const compareStep = steps.find(
    (step) => step.phase === 'naive-compare' && step.variables.currentColumn === 3,
  );

  assert.ok(compareStep);
  assert.equal(compareStep.highlight.activeColumn, 3);
  assert.equal(typeof compareStep.highlight.activeSourceIndex, 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: FAIL because `generateBuildSteps` and `generateNaiveSteps` are not exported yet.

- [ ] **Step 3: Write minimal implementation**

Add pure snapshot helpers and the naive replay logic to `part3/sparse_matrix_visualizer.js`:

```js
function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function cloneTriples(triples) {
  return triples.map((triple) => ({ ...triple }));
}

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSnapshot({
  algorithm,
  phase,
  title,
  description,
  functionName,
  sourceMatrix,
  sourceTriples,
  resultTriples = [],
  variables = {},
  highlight = {},
  num = [],
  cpot = [],
}) {
  return {
    algorithm,
    phase,
    title,
    description,
    functionName,
    sourceMatrix: cloneMatrix(sourceMatrix),
    sourceTriples: cloneTriples(sourceTriples),
    resultTriples: cloneTriples(resultTriples),
    resultMatrix: buildMatrixFromTriples(
      resultTriples,
      sourceMatrix[0].length,
      sourceMatrix.length,
    ),
    variables: cloneObject(variables),
    highlight: cloneObject(highlight),
    num: num.slice(),
    cpot: cpot.slice(),
  };
}

function generateBuildSteps(matrix) {
  const steps = [];
  const triples = [];

  steps.push(
    createSnapshot({
      algorithm: 'build',
      phase: 'build-intro',
      title: '开始构建三元组表',
      description: '按照二维矩阵的行优先顺序扫描非零元素。',
      functionName: 'build_tsmatrix',
      sourceMatrix: matrix,
      sourceTriples: triples,
    }),
  );

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      const value = matrix[row][col];
      if (value === 0) {
        continue;
      }

      triples.push({ row: row + 1, col: col + 1, value });
      steps.push(
        createSnapshot({
          algorithm: 'build',
          phase: 'build-append',
          title: '追加一个非零元素',
          description: `发现非零元素 (${row + 1}, ${col + 1}) = ${value}，将其追加到三元组表。`,
          functionName: 'build_tsmatrix',
          sourceMatrix: matrix,
          sourceTriples: triples,
          variables: { appendedIndex: triples.length },
          highlight: {
            activeCells: [`${row}:${col}`],
            activeSourceIndex: triples.length - 1,
          },
        }),
      );
    }
  }

  steps.push(
    createSnapshot({
      algorithm: 'build',
      phase: 'build-complete',
      title: '三元组表构建完成',
      description: `共找到 ${triples.length} 个非零元素，后续三种算法共享这份输入。`,
      functionName: 'build_tsmatrix',
      sourceMatrix: matrix,
      sourceTriples: triples,
    }),
  );

  return steps;
}

function generateNaiveSteps(matrix) {
  const sourceTriples = buildTriples(matrix);
  const resultTriples = [];
  const steps = [
    createSnapshot({
      algorithm: 'naive',
      phase: 'naive-intro',
      title: '普通转置开始',
      description: '外层按列扫描，内层每次都完整遍历原三元组表。',
      functionName: 'transpose_naive',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
    }),
  ];

  for (let currentColumn = 1; currentColumn <= matrix[0].length; currentColumn += 1) {
    for (let sourceIndex = 0; sourceIndex < sourceTriples.length; sourceIndex += 1) {
      const triple = sourceTriples[sourceIndex];
      const matched = triple.col === currentColumn;

      steps.push(
        createSnapshot({
          algorithm: 'naive',
          phase: 'naive-compare',
          title: `扫描原矩阵第 ${currentColumn} 列`,
          description: matched
            ? `当前三元组列号等于 ${currentColumn}，下一步会把它写入结果表。`
            : `当前三元组列号不是 ${currentColumn}，继续向后扫描。`,
          functionName: 'transpose_naive',
          sourceMatrix: matrix,
          sourceTriples,
          resultTriples,
          variables: {
            currentColumn,
            sourceIndex,
            matched,
          },
          highlight: {
            activeColumn: currentColumn,
            activeSourceIndex: sourceIndex,
          },
        }),
      );

      if (!matched) {
        continue;
      }

      resultTriples.push(transposeTriple(triple));
      steps.push(
        createSnapshot({
          algorithm: 'naive',
          phase: 'naive-write',
          title: '写入一个转置三元组',
          description: `把 (${triple.row}, ${triple.col}, ${triple.value}) 写成 (${triple.col}, ${triple.row}, ${triple.value})。`,
          functionName: 'transpose_naive',
          sourceMatrix: matrix,
          sourceTriples,
          resultTriples,
          variables: {
            currentColumn,
            sourceIndex,
            resultIndex: resultTriples.length - 1,
          },
          highlight: {
            activeColumn: currentColumn,
            activeSourceIndex: sourceIndex,
            activeResultIndex: resultTriples.length - 1,
          },
        }),
      );
    }
  }

  steps.push(
    createSnapshot({
      algorithm: 'naive',
      phase: 'naive-complete',
      title: '普通转置完成',
      description: '所有列都扫描结束，普通转置结果已经完整生成。',
      functionName: 'transpose_naive',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
    }),
  );

  return steps;
}
```

Update the export list at the bottom of the file:

```js
if (typeof module !== 'undefined') {
  module.exports = {
    INITIAL_MATRIX,
    EXPECTED_TRANSPOSE_MATRIX,
    buildTriples,
    transposeTriple,
    buildMatrixFromTriples,
    generateBuildSteps,
    generateNaiveSteps,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: PASS all tests, including the new build-phase and naive-phase checks.

- [ ] **Step 5: Commit**

```bash
git add part3/sparse_matrix_visualizer.js part3/sparse_matrix_visualizer.test.js
git commit -m "feat: add build and naive transpose timelines"
```

## Task 3: Implement fast transpose, optimized transpose, and complexity summary

**Files:**
- Modify: `part3/sparse_matrix_visualizer.js`
- Modify: `part3/sparse_matrix_visualizer.test.js`

- [ ] **Step 1: Write the failing test**

Extend `part3/sparse_matrix_visualizer.test.js` with the fast-path and summary checks:

```js
const {
  INITIAL_MATRIX,
  EXPECTED_TRANSPOSE_MATRIX,
  buildMatrixFromTriples,
  generateFastSteps,
  generateOptimizedFastSteps,
  buildComplexitySummary,
} = require('./sparse_matrix_visualizer.js');

test('generateFastSteps counts columns before direct placement', () => {
  const steps = generateFastSteps(INITIAL_MATRIX);
  const countStep = steps.find(
    (step) => step.phase === 'fast-count' && step.highlight.activeSourceIndex === 0,
  );

  assert.ok(countStep);
  assert.equal(countStep.num[2], 1);
  assert.equal(countStep.functionName, 'transpose_fast');
});

test('generateFastSteps finishes with the expected transpose matrix', () => {
  const steps = generateFastSteps(INITIAL_MATRIX);
  const finalStep = steps.at(-1);

  assert.deepEqual(
    buildMatrixFromTriples(finalStep.resultTriples, 6, 6),
    EXPECTED_TRANSPOSE_MATRIX,
  );
});

test('generateOptimizedFastSteps includes reverse prefix conversion', () => {
  const steps = generateOptimizedFastSteps(INITIAL_MATRIX);
  const prefixStep = steps.find((step) => step.phase === 'optimized-prefix');
  const finalStep = steps.at(-1);

  assert.ok(prefixStep);
  assert.equal(prefixStep.functionName, 'transpose_fast_optimized');
  assert.deepEqual(
    buildMatrixFromTriples(finalStep.resultTriples, 6, 6),
    EXPECTED_TRANSPOSE_MATRIX,
  );
});

test('buildComplexitySummary matches the arithmetic used in the C program', () => {
  assert.deepEqual(buildComplexitySummary(INITIAL_MATRIX), {
    rows: 6,
    cols: 6,
    terms: 9,
    naiveOps: 54,
    fastOps: 15,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: FAIL because the fast-step generators and summary builder are still missing.

- [ ] **Step 3: Write minimal implementation**

Add the two fast replay generators and the shared complexity helper to `part3/sparse_matrix_visualizer.js`:

```js
function generateFastSteps(matrix) {
  const sourceTriples = buildTriples(matrix);
  const resultTriples = [];
  const steps = [
    createSnapshot({
      algorithm: 'fast',
      phase: 'fast-intro',
      title: '快速转置开始',
      description: '先统计每列非零元个数，再计算每列在结果表中的起始位置。',
      functionName: 'transpose_fast',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
    }),
  ];

  const num = Array(matrix[0].length + 1).fill(0);
  const cpot = Array(matrix[0].length + 1).fill(0);

  for (let sourceIndex = 0; sourceIndex < sourceTriples.length; sourceIndex += 1) {
    const triple = sourceTriples[sourceIndex];
    num[triple.col] += 1;

    steps.push(
      createSnapshot({
        algorithm: 'fast',
        phase: 'fast-count',
        title: '统计每列非零元个数',
        description: `读取原三元组第 ${sourceIndex + 1} 项，将 num[${triple.col}] 增加到 ${num[triple.col]}。`,
        functionName: 'transpose_fast',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: { sourceIndex, countedColumn: triple.col },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeArrayIndex: triple.col,
        },
        num,
      }),
    );
  }

  cpot[1] = 1;
  steps.push(
    createSnapshot({
      algorithm: 'fast',
      phase: 'fast-cpot-init',
      title: '初始化第一个起始位置',
      description: '按照 C 代码，先固定 cpot[1] = 1。',
      functionName: 'transpose_fast',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
      highlight: { activeArrayIndex: 1 },
      num,
      cpot,
    }),
  );

  for (let column = 2; column <= matrix[0].length; column += 1) {
    cpot[column] = cpot[column - 1] + num[column - 1];
    steps.push(
      createSnapshot({
        algorithm: 'fast',
        phase: 'fast-cpot-prefix',
        title: '计算每列起始位置',
        description: `cpot[${column}] = cpot[${column - 1}] + num[${column - 1}] = ${cpot[column]}。`,
        functionName: 'transpose_fast',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: { column },
        highlight: { activeArrayIndex: column },
        num,
        cpot,
      }),
    );
  }

  for (let sourceIndex = 0; sourceIndex < sourceTriples.length; sourceIndex += 1) {
    const triple = sourceTriples[sourceIndex];
    const targetIndex = cpot[triple.col] - 1;
    resultTriples[targetIndex] = transposeTriple(triple);

    steps.push(
      createSnapshot({
        algorithm: 'fast',
        phase: 'fast-place',
        title: '按起始位置直接写入结果表',
        description: `使用 cpot[${triple.col}] 直接定位，把 (${triple.row}, ${triple.col}, ${triple.value}) 写到结果表第 ${targetIndex + 1} 项。`,
        functionName: 'transpose_fast',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: {
          sourceIndex,
          targetIndex,
          column: triple.col,
        },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeResultIndex: targetIndex,
          activeArrayIndex: triple.col,
        },
        num,
        cpot,
      }),
    );

    cpot[triple.col] += 1;
    steps.push(
      createSnapshot({
        algorithm: 'fast',
        phase: 'fast-advance-cpot',
        title: '推进当前列的下一个写入位置',
        description: `写入完成后，将 cpot[${triple.col}] 递增到 ${cpot[triple.col]}。`,
        functionName: 'transpose_fast',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: {
          sourceIndex,
          column: triple.col,
        },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeArrayIndex: triple.col,
        },
        num,
        cpot,
      }),
    );
  }

  steps.push(
    createSnapshot({
      algorithm: 'fast',
      phase: 'fast-complete',
      title: '快速转置完成',
      description: '所有原三元组都已按起始位置直接写入。',
      functionName: 'transpose_fast',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
      num,
      cpot,
    }),
  );

  return steps;
}

function generateOptimizedFastSteps(matrix) {
  const sourceTriples = buildTriples(matrix);
  const resultTriples = [];
  const steps = [
    createSnapshot({
      algorithm: 'optimized',
      phase: 'optimized-intro',
      title: '优化快速转置开始',
      description: '只保留一个 cpot[] 数组，并让它在不同阶段承担不同职责。',
      functionName: 'transpose_fast_optimized',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
    }),
  ];

  const cpot = Array(matrix[0].length + 1).fill(0);

  for (let sourceIndex = 0; sourceIndex < sourceTriples.length; sourceIndex += 1) {
    const triple = sourceTriples[sourceIndex];
    cpot[triple.col] += 1;

    steps.push(
      createSnapshot({
        algorithm: 'optimized',
        phase: 'optimized-count',
        title: '先用 cpot[] 统计每列个数',
        description: `当前把 cpot[${triple.col}] 作为计数器使用，更新到 ${cpot[triple.col]}。`,
        functionName: 'transpose_fast_optimized',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: { sourceIndex, countedColumn: triple.col },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeArrayIndex: triple.col,
        },
        cpot,
      }),
    );
  }

  let acc = sourceTriples.length + 1;
  for (let column = matrix[0].length; column >= 1; column -= 1) {
    acc -= cpot[column];
    cpot[column] = acc;

    steps.push(
      createSnapshot({
        algorithm: 'optimized',
        phase: 'optimized-prefix',
        title: '从后向前转换为起始位置',
        description: `回扫到第 ${column} 列后，cpot[${column}] 现在表示该列在结果表中的起始位置 ${cpot[column]}。`,
        functionName: 'transpose_fast_optimized',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: { column, acc },
        highlight: { activeArrayIndex: column },
        cpot,
      }),
    );
  }

  for (let sourceIndex = 0; sourceIndex < sourceTriples.length; sourceIndex += 1) {
    const triple = sourceTriples[sourceIndex];
    const targetIndex = cpot[triple.col] - 1;
    resultTriples[targetIndex] = transposeTriple(triple);

    steps.push(
      createSnapshot({
        algorithm: 'optimized',
        phase: 'optimized-place',
        title: '使用复用后的起始位置写入结果',
        description: `当前直接使用 cpot[${triple.col}]，把结果写到第 ${targetIndex + 1} 项。`,
        functionName: 'transpose_fast_optimized',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: {
          sourceIndex,
          column: triple.col,
          targetIndex,
        },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeResultIndex: targetIndex,
          activeArrayIndex: triple.col,
        },
        cpot,
      }),
    );

    cpot[triple.col] += 1;
    steps.push(
      createSnapshot({
        algorithm: 'optimized',
        phase: 'optimized-advance-cpot',
        title: '复用同一个数组推进下一个位置',
        description: `写入后继续把 cpot[${triple.col}] 递增到 ${cpot[triple.col]}。`,
        functionName: 'transpose_fast_optimized',
        sourceMatrix: matrix,
        sourceTriples,
        resultTriples,
        variables: { sourceIndex, column: triple.col },
        highlight: {
          activeSourceIndex: sourceIndex,
          activeArrayIndex: triple.col,
        },
        cpot,
      }),
    );
  }

  steps.push(
    createSnapshot({
      algorithm: 'optimized',
      phase: 'optimized-complete',
      title: '优化快速转置完成',
      description: '一个 cpot[] 数组已经完成计数、定位和推进三件事。',
      functionName: 'transpose_fast_optimized',
      sourceMatrix: matrix,
      sourceTriples,
      resultTriples,
      cpot,
    }),
  );

  return steps;
}

function buildComplexitySummary(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const terms = buildTriples(matrix).length;

  return {
    rows,
    cols,
    terms,
    naiveOps: cols * terms,
    fastOps: cols + terms,
  };
}
```

Update the export list again:

```js
if (typeof module !== 'undefined') {
  module.exports = {
    INITIAL_MATRIX,
    EXPECTED_TRANSPOSE_MATRIX,
    buildTriples,
    transposeTriple,
    buildMatrixFromTriples,
    generateBuildSteps,
    generateNaiveSteps,
    generateFastSteps,
    generateOptimizedFastSteps,
    buildComplexitySummary,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: PASS all tests, including the fast-path and complexity-summary checks.

- [ ] **Step 5: Commit**

```bash
git add part3/sparse_matrix_visualizer.js part3/sparse_matrix_visualizer.test.js
git commit -m "feat: add fast transpose timelines and summary"
```

## Task 4: Build the HTML shell, stylesheet, and pure render helpers

**Files:**
- Create: `part3/sparse_matrix_visualizer.html`
- Create: `part3/sparse_matrix_visualizer.css`
- Modify: `part3/sparse_matrix_visualizer.js`
- Modify: `part3/sparse_matrix_visualizer.test.js`

- [ ] **Step 1: Write the failing test**

Add render-helper tests and static shell smoke checks to `part3/sparse_matrix_visualizer.test.js`:

```js
const fs = require('node:fs');
const path = require('node:path');

const {
  renderMatrixTable,
  renderTriplesTable,
  renderArrayStrip,
  renderVariableList,
  getControlState,
} = require('./sparse_matrix_visualizer.js');

test('renderMatrixTable adds active-cell styling for highlighted coordinates', () => {
  const html = renderMatrixTable(
    [[1, 0], [0, 2]],
    { activeCells: ['0:0'], activeColumn: 1 },
    '示例矩阵',
  );

  assert.match(html, /matrix-table/);
  assert.match(html, /active-cell/);
  assert.match(html, /active-column/);
});

test('renderTriplesTable marks the active row', () => {
  const html = renderTriplesTable(
    [{ row: 1, col: 2, value: 12 }],
    0,
    '原始三元组表',
  );

  assert.match(html, /triples-table/);
  assert.match(html, /active-row/);
  assert.match(html, /原始三元组表/);
});

test('render helpers show variables and array values in plain language', () => {
  const arrayHtml = renderArrayStrip('num[]', [0, 1, 3], 2);
  const variableHtml = renderVariableList({ currentColumn: 3, targetIndex: 4 });

  assert.match(arrayHtml, /num\[\]/);
  assert.match(arrayHtml, /active-slot/);
  assert.match(variableHtml, /currentColumn/);
  assert.match(variableHtml, /targetIndex/);
});

test('getControlState disables boundary buttons correctly', () => {
  assert.deepEqual(getControlState({ currentIndex: 0, totalSteps: 5, isPlaying: false }), {
    canGoPrev: false,
    canGoNext: true,
    playLabel: '播放',
  });
  assert.deepEqual(getControlState({ currentIndex: 4, totalSteps: 5, isPlaying: true }), {
    canGoPrev: true,
    canGoNext: false,
    playLabel: '暂停',
  });
});

test('HTML shell declares the required mount points', () => {
  const html = fs.readFileSync(path.join(__dirname, 'sparse_matrix_visualizer.html'), 'utf8');

  for (const id of [
    'algorithm-tabs',
    'play-toggle',
    'prev-step',
    'next-step',
    'reset-demo',
    'speed-select',
    'source-matrix',
    'source-triples',
    'result-matrix',
    'result-triples',
    'step-title',
    'step-description',
    'function-name',
    'state-panel',
    'complexity-panel',
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('CSS file defines the selectors used by the renderer', () => {
  const css = fs.readFileSync(path.join(__dirname, 'sparse_matrix_visualizer.css'), 'utf8');

  for (const selector of [
    '.page-shell',
    '.control-button',
    '.algorithm-tab',
    '.algorithm-tab.is-active',
    '.matrix-table',
    '.triples-table',
    '.active-cell',
    '.active-row',
    '.array-strip',
  ]) {
    assert.match(css, new RegExp(selector.replace(/\./g, '\\\.')));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: FAIL because the HTML file, CSS file, and render helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `part3/sparse_matrix_visualizer.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>稀疏矩阵转置可视化演示</title>
    <link rel="stylesheet" href="./sparse_matrix_visualizer.css" />
  </head>
  <body>
    <main class="page-shell">
      <header class="hero-card">
        <p class="eyebrow">Data Structure / Part 3</p>
        <h1>稀疏矩阵转置可视化演示</h1>
        <p class="hero-text">按步骤展示三元组表构建、普通转置、快速转置与优化快速转置。</p>
      </header>

      <section class="control-card">
        <div id="algorithm-tabs" class="algorithm-tabs"></div>
        <div class="controls-row">
          <button id="play-toggle" class="control-button" type="button">播放</button>
          <button id="prev-step" class="control-button" type="button">上一步</button>
          <button id="next-step" class="control-button" type="button">下一步</button>
          <button id="reset-demo" class="control-button" type="button">重置</button>
          <label class="speed-field">
            播放速度
            <select id="speed-select">
              <option value="slow">慢</option>
              <option value="medium" selected>中</option>
              <option value="fast">快</option>
            </select>
          </label>
        </div>
      </section>

      <section class="layout-grid">
        <article class="panel-card">
          <h2>原始矩阵</h2>
          <div id="source-matrix"></div>
        </article>

        <article class="panel-card">
          <h2>原始三元组表</h2>
          <div id="source-triples"></div>
        </article>

        <article class="panel-card">
          <h2>转置结果矩阵</h2>
          <div id="result-matrix"></div>
        </article>

        <article class="panel-card">
          <h2>转置结果三元组表</h2>
          <div id="result-triples"></div>
        </article>

        <article class="panel-card panel-card--wide">
          <div class="panel-heading">
            <div>
              <h2 id="step-title">步骤标题</h2>
              <p id="function-name" class="function-chip">函数名</p>
            </div>
            <p id="step-counter" class="step-counter">第 1 / 1 步</p>
          </div>
          <p id="step-description" class="step-description"></p>
          <div id="variables-panel"></div>
        </article>

        <article class="panel-card panel-card--wide">
          <h2>算法状态</h2>
          <div id="state-panel"></div>
        </article>

        <article class="panel-card panel-card--wide">
          <h2>复杂度对比</h2>
          <div id="complexity-panel"></div>
        </article>
      </section>
    </main>

    <script defer src="./sparse_matrix_visualizer.js"></script>
  </body>
</html>
```

Create `part3/sparse_matrix_visualizer.css`:

```css
:root {
  --bg: #0f172a;
  --panel: #ffffff;
  --panel-soft: #eef2ff;
  --text: #0f172a;
  --muted: #475569;
  --primary: #2563eb;
  --accent: #f59e0b;
  --success: #10b981;
  --border: #cbd5e1;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Segoe UI", Arial, sans-serif;
  background: linear-gradient(180deg, #e2e8f0 0%, #f8fafc 100%);
  color: var(--text);
}

.page-shell {
  width: min(1360px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0 40px;
}

.hero-card,
.control-card,
.panel-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.hero-card,
.control-card,
.panel-card {
  padding: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-text,
.step-description {
  color: var(--muted);
  line-height: 1.7;
}

.algorithm-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.algorithm-tab,
.control-button,
.speed-field select {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  color: var(--text);
  font: inherit;
}

.algorithm-tab,
.control-button {
  padding: 10px 16px;
  cursor: pointer;
}

.algorithm-tab.is-active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.control-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.speed-field {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.panel-card--wide {
  grid-column: 1 / -1;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.function-chip,
.step-counter {
  margin: 0;
  color: var(--muted);
}

.function-chip {
  display: inline-block;
  padding: 6px 10px;
  background: var(--panel-soft);
  border-radius: 999px;
}

.matrix-table,
.triples-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.matrix-table th,
.matrix-table td,
.triples-table th,
.triples-table td {
  border: 1px solid var(--border);
  padding: 10px;
  text-align: center;
}

.active-cell {
  background: rgba(245, 158, 11, 0.2);
  border-color: var(--accent);
}

.active-column {
  background: rgba(37, 99, 235, 0.08);
}

.active-row {
  background: rgba(16, 185, 129, 0.16);
}

.array-strip {
  margin-top: 12px;
}

.array-strip ul {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 10px;
  padding: 0;
  margin: 12px 0 0;
}

.array-strip li {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  text-align: center;
}

.array-strip li.active-slot {
  border-color: var(--primary);
  background: rgba(37, 99, 235, 0.08);
}

.variable-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.variable-list div {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.summary-grid div {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

@media (max-width: 960px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
```

Add pure render helpers to `part3/sparse_matrix_visualizer.js`:

```js
function renderMatrixTable(matrix, highlight = {}, caption = '矩阵') {
  const activeCells = new Set(highlight.activeCells || []);
  const activeColumn = highlight.activeColumn;

  const header = matrix[0]
    .map((_, index) => `<th>列 ${index + 1}</th>`)
    .join('');

  const rows = matrix
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const classes = [];
          if (activeCells.has(`${rowIndex}:${colIndex}`)) {
            classes.push('active-cell');
          }
          if (activeColumn === colIndex + 1) {
            classes.push('active-column');
          }
          return `<td class="${classes.join(' ')}">${value}</td>`;
        })
        .join('');

      return `<tr><th>行 ${rowIndex + 1}</th>${cells}</tr>`;
    })
    .join('');

  return `
    <table class="matrix-table">
      <caption>${caption}</caption>
      <thead><tr><th></th>${header}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderTriplesTable(triples, activeIndex, title) {
  const rows = triples.length
    ? triples
        .map((triple, index) => `
          <tr class="${index === activeIndex ? 'active-row' : ''}">
            <td>${index + 1}</td>
            <td>${triple.row}</td>
            <td>${triple.col}</td>
            <td>${triple.value}</td>
          </tr>
        `)
        .join('')
    : '<tr><td colspan="4">当前还没有数据</td></tr>';

  return `
    <table class="triples-table">
      <caption>${title}</caption>
      <thead>
        <tr><th>#</th><th>行</th><th>列</th><th>值</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderArrayStrip(label, values, activeIndex) {
  return `
    <section class="array-strip">
      <h3>${label}</h3>
      <ul>
        ${values
          .map((value, index) => `
            <li class="${index === activeIndex ? 'active-slot' : ''}">
              <strong>${index}</strong>
              <div>${value}</div>
            </li>
          `)
          .join('')}
      </ul>
    </section>
  `;
}

function renderVariableList(variables) {
  const entries = Object.entries(variables);
  if (entries.length === 0) {
    return '<p class="hero-text">当前步骤没有额外变量更新。</p>';
  }

  return `
    <div class="variable-list">
      ${entries
        .map(([key, value]) => `<div><strong>${key}</strong><p>${value}</p></div>`)
        .join('')}
    </div>
  `;
}

function getControlState({ currentIndex, totalSteps, isPlaying }) {
  return {
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < totalSteps - 1,
    playLabel: isPlaying ? '暂停' : '播放',
  };
}
```

Add the new exports:

```js
if (typeof module !== 'undefined') {
  module.exports = {
    INITIAL_MATRIX,
    EXPECTED_TRANSPOSE_MATRIX,
    buildTriples,
    transposeTriple,
    buildMatrixFromTriples,
    generateBuildSteps,
    generateNaiveSteps,
    generateFastSteps,
    generateOptimizedFastSteps,
    buildComplexitySummary,
    renderMatrixTable,
    renderTriplesTable,
    renderArrayStrip,
    renderVariableList,
    getControlState,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: PASS all tests, including render-helper and shell smoke checks.

- [ ] **Step 5: Commit**

```bash
git add part3/sparse_matrix_visualizer.html part3/sparse_matrix_visualizer.css part3/sparse_matrix_visualizer.js part3/sparse_matrix_visualizer.test.js
git commit -m "feat: add sparse matrix visualizer layout"
```

## Task 5: Wire algorithm switching, autoplay, single-step navigation, and browser rendering

**Files:**
- Modify: `part3/sparse_matrix_visualizer.js`
- Modify: `part3/sparse_matrix_visualizer.test.js`

- [ ] **Step 1: Write the failing test**

Add application-state and playback checks to `part3/sparse_matrix_visualizer.test.js`:

```js
const {
  INITIAL_MATRIX,
  createScenarioMap,
  createAppState,
  clampStepIndex,
  resolvePlaybackDelay,
} = require('./sparse_matrix_visualizer.js');

test('createScenarioMap prepends build steps to every algorithm timeline', () => {
  const scenarios = createScenarioMap(INITIAL_MATRIX);

  assert.equal(scenarios.naive[0].phase, 'build-intro');
  assert.equal(scenarios.fast[0].phase, 'build-intro');
  assert.equal(scenarios.optimized[0].phase, 'build-intro');
  assert.equal(scenarios.fast.at(-1).phase, 'fast-complete');
  assert.equal(scenarios.optimized.at(-1).phase, 'optimized-complete');
});

test('clampStepIndex keeps navigation inside the valid range', () => {
  assert.equal(clampStepIndex(-3, 12), 0);
  assert.equal(clampStepIndex(6, 12), 6);
  assert.equal(clampStepIndex(99, 12), 11);
});

test('resolvePlaybackDelay maps speed labels to milliseconds', () => {
  assert.equal(resolvePlaybackDelay('slow'), 2200);
  assert.equal(resolvePlaybackDelay('medium'), 1400);
  assert.equal(resolvePlaybackDelay('fast'), 700);
});

test('createAppState defaults to the fast algorithm at the first step', () => {
  const state = createAppState();

  assert.equal(state.activeAlgorithm, 'fast');
  assert.equal(state.currentStepIndex, 0);
  assert.equal(state.isPlaying, false);
  assert.equal(state.speed, 'medium');
  assert.ok(state.scenarios.fast.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: FAIL because the application-state helpers are not exported yet.

- [ ] **Step 3: Write minimal implementation**

Add the scenario builder, playback helpers, and DOM bootstrapping to `part3/sparse_matrix_visualizer.js`:

```js
function createScenarioMap(matrix) {
  const buildSteps = generateBuildSteps(matrix);

  return {
    naive: [...buildSteps, ...generateNaiveSteps(matrix)],
    fast: [...buildSteps, ...generateFastSteps(matrix)],
    optimized: [...buildSteps, ...generateOptimizedFastSteps(matrix)],
  };
}

function createAppState() {
  return {
    activeAlgorithm: 'fast',
    currentStepIndex: 0,
    isPlaying: false,
    speed: 'medium',
    scenarios: createScenarioMap(INITIAL_MATRIX),
    complexity: buildComplexitySummary(INITIAL_MATRIX),
  };
}

function clampStepIndex(index, totalSteps) {
  return Math.max(0, Math.min(index, totalSteps - 1));
}

function resolvePlaybackDelay(speed) {
  if (speed === 'slow') return 2200;
  if (speed === 'fast') return 700;
  return 1400;
}

function renderComplexityPanel(summary) {
  return `
    <div class="summary-grid">
      <div><strong>矩阵规模</strong><p>${summary.rows} × ${summary.cols}</p></div>
      <div><strong>非零元素数</strong><p>${summary.terms}</p></div>
      <div><strong>普通转置估算</strong><p>${summary.naiveOps} 次比较</p></div>
      <div><strong>快速转置估算</strong><p>${summary.fastOps} 次核心操作</p></div>
    </div>
  `;
}

function renderStatePanel(step) {
  const parts = [];

  if (step.num.length > 0) {
    parts.push(renderArrayStrip('num[]', step.num, step.highlight.activeArrayIndex));
  }
  if (step.cpot.length > 0) {
    parts.push(renderArrayStrip('cpot[]', step.cpot, step.highlight.activeArrayIndex));
  }
  if (parts.length === 0) {
    parts.push('<p class="hero-text">当前步骤主要观察矩阵与三元组表的高亮变化。</p>');
  }

  return parts.join('');
}

function renderAlgorithmTabs(activeAlgorithm) {
  const labels = {
    naive: '普通转置',
    fast: '快速转置',
    optimized: '优化快速转置',
  };

  return Object.entries(labels)
    .map(([key, label]) => `
      <button
        type="button"
        class="algorithm-tab ${key === activeAlgorithm ? 'is-active' : ''}"
        data-algorithm="${key}"
      >
        ${label}
      </button>
    `)
    .join('');
}

function mountVisualizer(doc = document) {
  const state = createAppState();
  let timerId = null;

  const refs = {
    algorithmTabs: doc.getElementById('algorithm-tabs'),
    playToggle: doc.getElementById('play-toggle'),
    prevStep: doc.getElementById('prev-step'),
    nextStep: doc.getElementById('next-step'),
    resetDemo: doc.getElementById('reset-demo'),
    speedSelect: doc.getElementById('speed-select'),
    sourceMatrix: doc.getElementById('source-matrix'),
    sourceTriples: doc.getElementById('source-triples'),
    resultMatrix: doc.getElementById('result-matrix'),
    resultTriples: doc.getElementById('result-triples'),
    stepTitle: doc.getElementById('step-title'),
    functionName: doc.getElementById('function-name'),
    stepCounter: doc.getElementById('step-counter'),
    stepDescription: doc.getElementById('step-description'),
    variablesPanel: doc.getElementById('variables-panel'),
    statePanel: doc.getElementById('state-panel'),
    complexityPanel: doc.getElementById('complexity-panel'),
  };

  function stopPlayback() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    state.isPlaying = false;
  }

  function getActiveSteps() {
    return state.scenarios[state.activeAlgorithm];
  }

  function render() {
    const steps = getActiveSteps();
    const step = steps[state.currentStepIndex];
    const controls = getControlState({
      currentIndex: state.currentStepIndex,
      totalSteps: steps.length,
      isPlaying: state.isPlaying,
    });

    refs.algorithmTabs.innerHTML = renderAlgorithmTabs(state.activeAlgorithm);
    refs.sourceMatrix.innerHTML = renderMatrixTable(step.sourceMatrix, step.highlight, '原始矩阵');
    refs.sourceTriples.innerHTML = renderTriplesTable(
      step.sourceTriples,
      step.highlight.activeSourceIndex,
      '原始三元组表',
    );
    refs.resultMatrix.innerHTML = renderMatrixTable(step.resultMatrix, step.highlight, '转置结果矩阵');
    refs.resultTriples.innerHTML = renderTriplesTable(
      step.resultTriples,
      step.highlight.activeResultIndex,
      '转置结果三元组表',
    );
    refs.stepTitle.textContent = step.title;
    refs.functionName.textContent = step.functionName;
    refs.stepCounter.textContent = `第 ${state.currentStepIndex + 1} / ${steps.length} 步`;
    refs.stepDescription.textContent = step.description;
    refs.variablesPanel.innerHTML = renderVariableList(step.variables);
    refs.statePanel.innerHTML = renderStatePanel(step);
    refs.complexityPanel.innerHTML = renderComplexityPanel(state.complexity);

    refs.prevStep.disabled = !controls.canGoPrev;
    refs.nextStep.disabled = !controls.canGoNext;
    refs.playToggle.textContent = controls.playLabel;
  }

  function advanceStep() {
    const steps = getActiveSteps();
    const nextIndex = clampStepIndex(state.currentStepIndex + 1, steps.length);

    if (nextIndex === state.currentStepIndex) {
      stopPlayback();
      render();
      return;
    }

    state.currentStepIndex = nextIndex;
    render();
  }

  function startPlayback() {
    stopPlayback();
    state.isPlaying = true;
    timerId = setInterval(advanceStep, resolvePlaybackDelay(state.speed));
    render();
  }

  refs.algorithmTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-algorithm]');
    if (!button) return;

    stopPlayback();
    state.activeAlgorithm = button.dataset.algorithm;
    state.currentStepIndex = 0;
    render();
  });

  refs.playToggle.addEventListener('click', () => {
    if (state.isPlaying) {
      stopPlayback();
      render();
      return;
    }

    startPlayback();
  });

  refs.prevStep.addEventListener('click', () => {
    stopPlayback();
    state.currentStepIndex = clampStepIndex(
      state.currentStepIndex - 1,
      getActiveSteps().length,
    );
    render();
  });

  refs.nextStep.addEventListener('click', () => {
    stopPlayback();
    state.currentStepIndex = clampStepIndex(
      state.currentStepIndex + 1,
      getActiveSteps().length,
    );
    render();
  });

  refs.resetDemo.addEventListener('click', () => {
    stopPlayback();
    state.currentStepIndex = 0;
    render();
  });

  refs.speedSelect.addEventListener('change', () => {
    state.speed = refs.speedSelect.value;
    if (state.isPlaying) {
      startPlayback();
    } else {
      render();
    }
  });

  refs.speedSelect.value = state.speed;
  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountVisualizer(document));
  } else {
    mountVisualizer(document);
  }
}
```

Update the export list one last time:

```js
if (typeof module !== 'undefined') {
  module.exports = {
    INITIAL_MATRIX,
    EXPECTED_TRANSPOSE_MATRIX,
    buildTriples,
    transposeTriple,
    buildMatrixFromTriples,
    generateBuildSteps,
    generateNaiveSteps,
    generateFastSteps,
    generateOptimizedFastSteps,
    buildComplexitySummary,
    renderMatrixTable,
    renderTriplesTable,
    renderArrayStrip,
    renderVariableList,
    getControlState,
    createScenarioMap,
    createAppState,
    clampStepIndex,
    resolvePlaybackDelay,
  };
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
node --test part3/sparse_matrix_visualizer.test.js
```

Expected: PASS all tests.

- [ ] **Step 5: Run the page for manual verification**

Run:

```bash
python -m http.server 8000
```

Expected: `Serving HTTP on 0.0.0.0 port 8000` or equivalent local-server startup output.

Then open:

```text
http://localhost:8000/part3/sparse_matrix_visualizer.html
```

Manual checklist:

- Default algorithm is “快速转置”, and the first step is visible.
- Clicking each algorithm tab resets to step 1 of that algorithm.
- “播放 / 暂停 / 上一步 / 下一步 / 重置” all behave correctly.
- The active matrix cells, triple rows, and array slots visibly change with each step.
- The complexity panel stays visible and shows `54` for ordinary transpose and `15` for the fast variants.

Stop the local server with `Ctrl+C` after verification.

- [ ] **Step 6: Commit**

```bash
git add part3/sparse_matrix_visualizer.html part3/sparse_matrix_visualizer.css part3/sparse_matrix_visualizer.js part3/sparse_matrix_visualizer.test.js
git commit -m "feat: wire sparse matrix visualizer controls"
```

## Self-Review

- **Spec coverage:**
  - Triple-table construction and naive replay are implemented in Task 2.
  - Fast transpose, optimized fast transpose, and complexity comparison are implemented in Task 3.
  - The HTML shell, stylesheet, explanation panel, state panel, and highlight rendering are implemented in Task 4.
  - Algorithm switching, autoplay, single-step playback, reset behavior, and manual browser verification are implemented in Task 5.
  - No spec gaps remain.

- **Placeholder scan:**
  - No unresolved markers remain in the task list.
  - Every code-writing step includes file paths, commands, and concrete code.

- **Type consistency:**
  - The plan uses one stable set of function names throughout: `generateBuildSteps`, `generateNaiveSteps`, `generateFastSteps`, `generateOptimizedFastSteps`, `createScenarioMap`, and `createAppState`.
  - Playback state keys remain consistent across tasks: `activeAlgorithm`, `currentStepIndex`, `isPlaying`, `speed`, `scenarios`, and `complexity`.
