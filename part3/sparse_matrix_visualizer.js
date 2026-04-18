'use strict';

// ============================================================
//  DATA
// ============================================================
const INITIAL_MATRIX = [
  [0,  12,  9,  0,  0,  0],
  [0,   0,  0,  0,  0,  0],
  [-3,  0,  0,  0,  0, 14],
  [0,   0, 24,  0, 18,  0],
  [15,  0,  0, -7,  0,  0],
  [0,   0, -4,  0,  0,  0]
];

const TEST_CASES = [
  {
    id: 'tc1',
    name: 'TC1 等价类：4×5 一般稀疏矩阵（正常输入）',
    desc: '覆盖一般有效输入（非方阵、正负值混合、部分零元素）。',
    matrix: [
      [0, 8, 0, 0, -3],
      [5, 0, 0, 0, 0],
      [0, 0, 0, 4, 0],
      [0, 0, 6, 0, 0]
    ]
  },
  {
    id: 'tc2',
    name: 'TC2 边界值：3×3 全零矩阵（terms=0）',
    desc: '覆盖非零元素个数下边界（0 个非零元素）。',
    matrix: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]
  },
  {
    id: 'tc3',
    name: 'TC3 边界值：3×3 全非零矩阵（最密集）',
    desc: '覆盖非零元素占比上边界（100% 非零元素）。',
    matrix: [
      [1, -2, 3],
      [4, 5, -6],
      [7, -8, 9]
    ]
  },
  {
    id: 'tc4',
    name: 'TC4 特殊分布：仅第一行有非零元素',
    desc: '覆盖“只有第一行非零”的特殊形态。',
    matrix: [
      [3, -1, 5, 7, -4, 2],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
    ]
  },
  {
    id: 'tc5',
    name: 'TC5 特殊分布：仅第一列有非零元素',
    desc: '覆盖“只有第一列非零”的特殊形态。',
    matrix: [
      [9, 0, 0, 0],
      [-7, 0, 0, 0],
      [5, 0, 0, 0],
      [-3, 0, 0, 0],
      [2, 0, 0, 0],
      [4, 0, 0, 0]
    ]
  },
  {
    id: 'tc6',
    name: 'TC6 特殊分布：上三角非零元素',
    desc: '覆盖三角形非零分布（上三角）。',
    matrix: [
      [2, -1, 3, 4, 5],
      [0, 6, -2, 7, 8],
      [0, 0, 9, -3, 1],
      [0, 0, 0, 4, -6],
      [0, 0, 0, 0, 7]
    ]
  }
];

let ACTIVE_MATRIX = INITIAL_MATRIX.map(r => [...r]);
let MATRIX_ROWS = 6;
let MATRIX_COLS = 6;

// Build 1-indexed triples by scanning row-major order
function buildTriples(matrix, rows, cols) {
  const triples = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (matrix[r][c] !== 0)
        triples.push({ row: r + 1, col: c + 1, val: matrix[r][c] });
  return triples;
}

let SRC = buildTriples(ACTIVE_MATRIX, MATRIX_ROWS, MATRIX_COLS);
// SRC[0]=(1,2,12) SRC[1]=(1,3,9) SRC[2]=(3,1,-3) SRC[3]=(3,6,14)
// SRC[4]=(4,3,24) SRC[5]=(4,5,18) SRC[6]=(5,1,15) SRC[7]=(5,4,-7) SRC[8]=(6,3,-4)

// ============================================================
//  STEP BUILDER HELPER
// ============================================================
function emptySlots() { return new Array(SRC.length).fill(null); }

function mkStep(algo, phase, title, desc, fn, slots, hl, vars, extra) {
  return {
    algorithm: algo,
    phase,
    title,
    description: desc,
    functionName: fn,
    resultSlots: slots.map(s => s ? Object.assign({}, s) : null),
    highlight: Object.assign(
      { matrixCells: [], sourceRows: [], resultRows: [], numIndex: null, cpotIndex: null, currentCol: null },
      hl
    ),
    variables: Object.assign({}, vars),
    numState:   extra.numState   || null,
    cpotState:  extra.cpotState  || null,
    naiveState: extra.naiveState || null,
    phaseLabel: extra.phaseLabel || null,
    stepIndex: 0,
    totalSteps: 0
  };
}

// ============================================================
//  NAIVE TRANSPOSE  — O(cols × terms)
// ============================================================
function generateNaiveSteps() {
  const steps = [];
  const slots = emptySlots();
  let q = 0; // next write position (0-based)
  const terms = SRC.length;

  steps.push(mkStep(
    'naive', '初始化',
    '普通转置算法（transpose_naive）开始',
    `普通转置的核心思路：以"列"为外层循环（col 从 1 到 ${MATRIX_COLS}），内层完整遍历全部三元组（p 从 1 到 ${terms}），找出列号等于 col 的元素，依次写入结果表。时间复杂度 O(cols × terms)，本例共需 ${MATRIX_COLS} × ${terms} = ${MATRIX_COLS * terms} 次比较。逻辑简单直观，但效率较低。`,
    'transpose_naive', slots, {},
    { cols: MATRIX_COLS, terms, q: 0 },
    { naiveState: { col: '—', p: '—', q: 0 } }
  ));

  for (let col = 1; col <= MATRIX_COLS; col++) {
    // Highlight entire column in source matrix
    const colCells = [];
    for (let r = 0; r < MATRIX_ROWS; r++) colCells.push({ r, c: col - 1 });

    steps.push(mkStep(
      'naive', `外层循环 col = ${col}`,
      `外层循环推进：col = ${col}，准备遍历全部 ${terms} 个三元组`,
      `外层循环变量推进到 col = ${col}。接下来要把三元组表的全部 ${terms} 个项目逐一检查，判断每项的列号是否等于 ${col}。这正是"普通"转置的代价——无论该列实际有几个非零元素，都要完整扫描一遍，每列的代价都是 O(terms)。`,
      'transpose_naive', slots,
      { matrixCells: colCells, currentCol: col },
      { col, '内层遍历 p': `p = 1..${terms}`, '已写结果数': q },
      { naiveState: { col, p: '遍历中', q } }
    ));

    for (let p = 0; p < SRC.length; p++) {
      if (SRC[p].col === col) {
        const newT = { row: col, col: SRC[p].row, val: SRC[p].val };
        slots[q] = newT;
        const wroteAt = q;
        q++;
        steps.push(mkStep(
          'naive', `写入第 ${q} 个结果`,
          `✓ 找到匹配！三元组 #${p + 1} → 写入结果槽位 ${q}`,
          `遍历到第 ${p + 1} 个三元组 (row = ${SRC[p].row}, col = ${SRC[p].col}, val = ${SRC[p].val})，其列号 ${SRC[p].col} 恰好等于当前扫描列 ${col}，匹配成功！将其转置后写入结果表第 ${q} 个位置：(row = ${col}, col = ${SRC[p].row}, val = ${SRC[p].val})。转置的本质就是把原三元组的 row 和 col 互换。`,
          'transpose_naive', slots,
          {
            matrixCells: [{ r: SRC[p].row - 1, c: SRC[p].col - 1 }],
            sourceRows: [p],
            resultRows: [wroteAt],
            currentCol: col
          },
          {
            col,
            'p（三元组序号）': p + 1,
            'q（写入位置）': q,
            '源 (row,col,val)': `(${SRC[p].row}, ${SRC[p].col}, ${SRC[p].val})`,
            '结果 (row,col,val)': `(${col}, ${SRC[p].row}, ${SRC[p].val})`
          },
          { naiveState: { col, p: p + 1, q } }
        ));
      }
    }
  }

  steps.push(mkStep(
    'naive', '完成',
    '🎉 普通转置完成！结果与预期一致',
    `外层循环执行了 ${MATRIX_COLS} 次（cols = ${MATRIX_COLS}），每次内层遍历 ${terms} 个三元组（terms = ${terms}），共执行 ${MATRIX_COLS} × ${terms} = ${MATRIX_COLS * terms} 次比较，找到并写入 ${terms} 个非零元素。当矩阵规模增大时，如 cols = 1000、terms = 10000，则需要 1000 万次比较，效率极低——这正是引入快速转置的动机。`,
    'transpose_naive', slots,
    { resultRows: Array.from({length: terms}, (_, i) => i) },
    { cols: MATRIX_COLS, terms, '总比较次数': `${MATRIX_COLS} × ${terms} = ${MATRIX_COLS * terms}`, '总写入次数': terms },
    { naiveState: { col: '完成 ✓', p: '—', q: terms } }
  ));

  return steps;
}

// ============================================================
//  FAST TRANSPOSE  — O(cols + terms)
// ============================================================
function generateFastSteps() {
  const steps = [];
  const num  = new Array(MATRIX_COLS + 1).fill(0); // 1-indexed, index 0 unused
  const cpot = new Array(MATRIX_COLS + 1).fill(0); // 1-indexed, index 0 unused
  const slots = emptySlots();
  const terms = SRC.length;

  // ---- Phase 1: count num[] ----
  steps.push(mkStep(
    'fast', '第一步：统计各列元素数 num[]',
    '快速转置（transpose_fast）开始：统计各列非零元素数',
    `快速转置分三步，总时间复杂度 O(cols + terms)。第一步：遍历所有三元组，对每个三元组执行 num[col]++，统计原矩阵各列各有多少个非零元素。num[] 是大小为 ${MATRIX_COLS} 的辅助数组，初始全为 0。`,
    'transpose_fast', slots, {},
    { '当前步骤': '一、统计 num[]', '辅助数组': `num[1..${MATRIX_COLS}] 初始全为 0` },
    { numState: [...num], cpotState: [...cpot] }
  ));

  for (let t = 0; t < SRC.length; t++) {
    const col = SRC[t].col;
    num[col]++;
    steps.push(mkStep(
      'fast', '第一步：统计 num[]',
      `num[${col}]++ ← 处理第 ${t + 1} 个三元组，现在 num[${col}] = ${num[col]}`,
      `处理第 ${t + 1} 个三元组 (row = ${SRC[t].row}, col = ${SRC[t].col}, val = ${SRC[t].val})。其列号为 ${col}，故执行 num[${col}]++，num[${col}] 从 ${num[col] - 1} 变为 ${num[col]}。num[col] 的含义是：原矩阵第 ${col} 列目前已统计到 ${num[col]} 个非零元素。`,
      'transpose_fast', slots,
      {
        matrixCells: [{ r: SRC[t].row - 1, c: SRC[t].col - 1 }],
        sourceRows: [t],
        numIndex: col
      },
      {
        't（三元组序号）': t + 1,
        'SRC[t].col': col,
        [`num[${col}]`]: num[col]
      },
      { numState: [...num], cpotState: [...cpot] }
    ));
  }

  const numSummary = Array.from({length: MATRIX_COLS}, (_, i) => `num[${i+1}]=${num[i+1]}`).join('，');
  const numVars = {};
  for (let i = 1; i <= MATRIX_COLS; i++) numVars[`num[${i}]`] = num[i];
  steps.push(mkStep(
    'fast', '第一步完成',
    'num[] 统计完毕！各列元素数一览',
    `遍历完全部 ${terms} 个三元组，num[] 统计完成：${numSummary}。这一步仅需 O(terms) = O(${terms}) 次操作。`,
    'transpose_fast', slots, {},
    numVars,
    { numState: [...num], cpotState: [...cpot] }
  ));

  // ---- Phase 2: compute cpot[] ----
  steps.push(mkStep(
    'fast', '第二步：计算各列起始位置 cpot[]',
    '第二步：用前缀和从 num[] 推导 cpot[]',
    `第二步利用前缀和计算 cpot[]，cpot[col] 表示原矩阵第 col 列的元素在转置结果表中的起始写入位置（1-indexed）。公式：cpot[1] = 1；对 col ≥ 2：cpot[col] = cpot[col−1] + num[col−1]。这一步时间复杂度 O(cols) = O(${MATRIX_COLS})。`,
    'transpose_fast', slots, {},
    { '公式': 'cpot[1]=1; cpot[col]=cpot[col-1]+num[col-1]' },
    { numState: [...num], cpotState: [...cpot] }
  ));

  cpot[1] = 1;
  steps.push(mkStep(
    'fast', '第二步：计算 cpot[]',
    'cpot[1] = 1（第 1 列从结果表第 1 个位置开始写）',
    '边界条件：第 1 列在转置结果中从第 1 个位置开始存储，因此 cpot[1] = 1 是固定值。',
    'transpose_fast', slots,
    { cpotIndex: 1 },
    { 'cpot[1]': 1 },
    { numState: [...num], cpotState: [...cpot] }
  ));

  for (let col = 2; col <= MATRIX_COLS; col++) {
    const prev    = cpot[col - 1];
    const numPrev = num[col - 1];
    cpot[col] = prev + numPrev;
    steps.push(mkStep(
      'fast', '第二步：计算 cpot[]',
      `cpot[${col}] = cpot[${col-1}] + num[${col-1}] = ${prev} + ${numPrev} = ${cpot[col]}`,
      `第 ${col} 列在结果表中的起始位置 = 前一列的起始位置 + 前一列的元素个数 = ${prev} + ${numPrev} = ${cpot[col]}。含义：原矩阵第 ${col} 列的所有非零元素，将从结果表第 ${cpot[col]} 个位置开始依次写入。`,
      'transpose_fast', slots,
      { cpotIndex: col },
      {
        [`cpot[${col-1}]`]: prev,
        [`num[${col-1}]`]: numPrev,
        [`cpot[${col}]`]: cpot[col]
      },
      { numState: [...num], cpotState: [...cpot] }
    ));
  }

  const cpotSummary = Array.from({length: MATRIX_COLS}, (_, i) => `cpot[${i+1}]=${cpot[i+1]}`).join('，');
  const cpotVars = {};
  for (let i = 1; i <= MATRIX_COLS; i++) cpotVars[`cpot[${i}]`] = cpot[i];
  steps.push(mkStep(
    'fast', '第二步完成',
    'cpot[] 计算完毕！各列起始位置一览',
    `cpot[] 全部计算完成：${cpotSummary}。这一步仅需 O(cols) = O(${MATRIX_COLS}) 次操作。`,
    'transpose_fast', slots, {},
    cpotVars,
    { numState: [...num], cpotState: [...cpot] }
  ));

  // ---- Phase 3: write result ----
  steps.push(mkStep(
    'fast', '第三步：按 cpot[] 写入转置结果',
    '第三步：顺序遍历三元组，用 cpot[col] 定位写入',
    '第三步再次顺序遍历原三元组表。对每个三元组 (row, col, val)，查 cpot[col] 得到写入位置，将转置后的 (col, row, val) 写入该槽位，然后 cpot[col]++ 使同列下一个元素写到下一个位置。由于顺序遍历，同一列的元素按原矩阵行序依次进入各自位置，最终结果已按行有序。',
    'transpose_fast', slots, {},
    { '当前步骤': '三、按 cpot[] 写入结果' },
    { numState: [...num], cpotState: [...cpot] }
  ));

  for (let t = 0; t < SRC.length; t++) {
    const col  = SRC[t].col;
    const pos  = cpot[col];         // 1-based position
    const slot = pos - 1;           // 0-based index
    slots[slot] = { row: col, col: SRC[t].row, val: SRC[t].val };
    cpot[col]++;
    steps.push(mkStep(
      'fast', '第三步：写入结果',
      `将三元组 #${t+1} 转置后写入结果槽位 ${pos}（cpot[${col}] = ${pos}）`,
      `处理第 ${t+1} 个三元组 (row=${SRC[t].row}, col=${SRC[t].col}, val=${SRC[t].val})：查 cpot[${col}] = ${pos}，将转置后的三元组 (row=${col}, col=${SRC[t].row}, val=${SRC[t].val}) 写入结果表第 ${pos} 个位置（槽位 ${slot+1}）。随即 cpot[${col}]++ 变为 ${cpot[col]}，供该列下一个元素使用。`,
      'transpose_fast', slots,
      {
        matrixCells: [{ r: SRC[t].row - 1, c: SRC[t].col - 1 }],
        sourceRows: [t],
        resultRows: [slot],
        cpotIndex: col
      },
      {
        't（三元组序号）': t + 1,
        'SRC[t].col': col,
        'cpot[col]（写入位置）': pos,
        '写入槽位': slot + 1,
        [`cpot[${col}]（自增后）`]: cpot[col],
        '结果 (row,col,val)': `(${col}, ${SRC[t].row}, ${SRC[t].val})`
      },
      { numState: [...num], cpotState: [...cpot] }
    ));
  }

  steps.push(mkStep(
    'fast', '完成',
    '🎉 快速转置完成！三步合计操作数远少于普通转置',
    `三步合计：第一步 O(terms)=${terms}次 + 第二步 O(cols)=${MATRIX_COLS}次 + 第三步 O(terms)=${terms}次，共约 ${2*terms + MATRIX_COLS} 次基本操作，远少于普通转置的 ${MATRIX_COLS * terms} 次比较。结果三元组已按行有序，与普通转置结果完全一致。额外代价是 num[] 和 cpot[] 两个长度为 ${MATRIX_COLS} 的辅助数组。`,
    'transpose_fast', slots,
    { resultRows: Array.from({length: terms}, (_, i) => i) },
    { '时间复杂度': 'O(cols+terms)', '总操作数': `${terms}+${MATRIX_COLS}+${terms}=${2*terms+MATRIX_COLS}`, '辅助空间': 'O(cols)=num[]+cpot[]' },
    { numState: [...num], cpotState: [...cpot] }
  ));

  return steps;
}

// ============================================================
//  OPTIMIZED FAST TRANSPOSE  — O(cols + terms), single aux array
// ============================================================
function generateOptimizedSteps() {
  const steps = [];
  const cpot  = new Array(MATRIX_COLS + 1).fill(0); // 1-indexed; reused as count then start-pos
  const slots = emptySlots();
  const terms = SRC.length;

  // ---- Phase 1: cpot[] used as count (= num[]) ----
  steps.push(mkStep(
    'optimized', '第一步：用 cpot[] 兼作计数（省去 num[]）',
    '优化快速转置（transpose_fast_optimized）：第一步复用 cpot[] 计数',
    `优化版与快速转置的区别在于：省掉了 num[] 数组，直接用 cpot[] 先扮演 num[] 做统计，再用一次反向扫描就地转换为起始位置，节省了一个长度为 ${MATRIX_COLS} 的辅助数组（虽然渐近空间复杂度仍是 O(cols)，但常数因子减半）。`,
    'transpose_fast_optimized', slots, {},
    { '优化点': '省去 num[]，cpot[] 一物两用', '辅助数组': `cpot[1..${MATRIX_COLS}] 初始全为 0` },
    { cpotState: [...cpot], phaseLabel: '统计阶段' }
  ));

  for (let t = 0; t < SRC.length; t++) {
    const col = SRC[t].col;
    cpot[col]++;
    steps.push(mkStep(
      'optimized', '第一步：统计（复用 cpot[]）',
      `cpot[${col}]++ ← 处理第 ${t+1} 个三元组，现在 cpot[${col}] = ${cpot[col]}`,
      `处理第 ${t+1} 个三元组 (row=${SRC[t].row}, col=${SRC[t].col}, val=${SRC[t].val})，列号为 ${col}，执行 cpot[${col}]++，cpot[${col}] 变为 ${cpot[col]}。此时 cpot[] 扮演的是 num[] 的角色，记录各列元素个数。`,
      'transpose_fast_optimized', slots,
      {
        matrixCells: [{ r: SRC[t].row - 1, c: SRC[t].col - 1 }],
        sourceRows: [t],
        cpotIndex: col
      },
      {
        't（三元组序号）': t + 1,
        'SRC[t].col': col,
        [`cpot[${col}]（计数）`]: cpot[col]
      },
      { cpotState: [...cpot], phaseLabel: '统计阶段' }
    ));
  }

  const cpotCountSummary = Array.from({length: MATRIX_COLS}, (_, i) => `cpot[${i+1}]=${cpot[i+1]}`).join('，');
  const cpotCountVars = {};
  for (let i = 1; i <= MATRIX_COLS; i++) cpotCountVars[`cpot[${i}]`] = cpot[i];
  steps.push(mkStep(
    'optimized', '第一步完成',
    'cpot[] 统计完毕，结果与 num[] 完全一致',
    `cpot[] 现在存储的是各列元素数，与快速转置的 num[] 完全相同：${cpotCountSummary}。接下来用反向扫描将计数就地转换为起始位置，这是优化的核心技巧。`,
    'transpose_fast_optimized', slots, {},
    cpotCountVars,
    { cpotState: [...cpot], phaseLabel: '统计阶段' }
  ));

  // ---- Phase 2: backward scan to convert counts to start positions ----
  steps.push(mkStep(
    'optimized', '第二步：反向扫描计算起始位置（优化核心）',
    '优化核心：一次反向扫描，将计数就地转为起始位置',
    `核心优化：设 acc = terms + 1 = ${terms + 1}，然后从 col = ${MATRIX_COLS} 向 col = 1 反向扫描，每次执行：acc -= cpot[c]；cpot[c] = acc。这一趟操作可以原地（in-place）把 cpot[] 从"各列元素个数"转换为"各列在结果中的起始位置"，无需额外的 num[] 数组。`,
    'transpose_fast_optimized', slots, {},
    { acc: `terms + 1 = ${terms + 1}`, '扫描方向': `从 col=${MATRIX_COLS} 到 col=1（反向）` },
    { cpotState: [...cpot], phaseLabel: '计算起始位置' }
  ));

  let acc = SRC.length + 1;
  steps.push(mkStep(
    'optimized', '第二步：初始化 acc',
    `acc = terms + 1 = ${SRC.length} + 1 = ${acc}`,
    `初始化累加器 acc = terms + 1 = ${acc}。这个哨兵值保证了反向扫描能正确推算出第 1 列的起始位置。acc 每次减去当前列的元素数，得到该列的起始位置。`,
    'transpose_fast_optimized', slots, {},
    { acc, terms: SRC.length },
    { cpotState: [...cpot], phaseLabel: '计算起始位置' }
  ));

  for (let c = MATRIX_COLS; c >= 1; c--) {
    const oldCount = cpot[c];
    acc -= oldCount;
    cpot[c] = acc;
    steps.push(mkStep(
      'optimized', '第二步：反向扫描',
      `c = ${c}：acc -= cpot[${c}](=${oldCount}) → acc = ${acc}，cpot[${c}] = ${cpot[c]}`,
      `处理 c = ${c}：先 acc -= cpot[${c}]（此时 cpot[${c}] 存的是计数 ${oldCount}），acc 变为 ${acc}；再令 cpot[${c}] = acc = ${cpot[c]}。这意味着原矩阵第 ${c} 列的元素应从结果表第 ${cpot[c]} 个位置开始写入。`,
      'transpose_fast_optimized', slots,
      { cpotIndex: c },
      {
        c,
        'acc（更新后）': acc,
        [`cpot[${c}]（起始位置）`]: cpot[c],
        '计数（已消耗）': oldCount
      },
      { cpotState: [...cpot], phaseLabel: '计算起始位置' }
    ));
  }

  const cpotStartSummary = Array.from({length: MATRIX_COLS}, (_, i) => `cpot[${i+1}]=${cpot[i+1]}`).join('，');
  const cpotStartVars = {};
  for (let i = 1; i <= MATRIX_COLS; i++) cpotStartVars[`cpot[${i}]`] = cpot[i];
  steps.push(mkStep(
    'optimized', '第二步完成',
    'cpot[] 已转换为起始位置，与快速转置结果完全一致',
    `反向扫描完成！${cpotStartSummary}，与快速转置的 cpot[] 完全一致。优化版仅用一个变量 acc 就完成了这个转换，无需额外的 num[] 数组。`,
    'transpose_fast_optimized', slots, {},
    cpotStartVars,
    { cpotState: [...cpot], phaseLabel: '计算起始位置' }
  ));

  // ---- Phase 3: write result (identical to fast transpose phase 3) ----
  steps.push(mkStep(
    'optimized', '第三步：按 cpot[] 写入结果（同快速转置）',
    '第三步：与快速转置相同，顺序写入转置结果',
    '第三步与快速转置完全相同：顺序遍历原三元组，用 cpot[col] 定位写入槽位，写入后 cpot[col]++。由于 cpot[] 的初始值与快速转置完全一致，写入结果也将完全一致。',
    'transpose_fast_optimized', slots, {},
    { '当前步骤': '三、按 cpot[] 写入结果' },
    { cpotState: [...cpot], phaseLabel: '写入阶段' }
  ));

  for (let t = 0; t < SRC.length; t++) {
    const col  = SRC[t].col;
    const pos  = cpot[col];
    const slot = pos - 1;
    slots[slot] = { row: col, col: SRC[t].row, val: SRC[t].val };
    cpot[col]++;
    steps.push(mkStep(
      'optimized', '第三步：写入结果',
      `将三元组 #${t+1} 转置后写入结果槽位 ${pos}（cpot[${col}] = ${pos}）`,
      `处理第 ${t+1} 个三元组 (row=${SRC[t].row}, col=${SRC[t].col}, val=${SRC[t].val})：查 cpot[${col}] = ${pos}，将转置后的 (row=${col}, col=${SRC[t].row}, val=${SRC[t].val}) 写入结果表第 ${pos} 个位置，然后 cpot[${col}]++ → ${cpot[col]}。`,
      'transpose_fast_optimized', slots,
      {
        matrixCells: [{ r: SRC[t].row - 1, c: SRC[t].col - 1 }],
        sourceRows: [t],
        resultRows: [slot],
        cpotIndex: col
      },
      {
        't（三元组序号）': t + 1,
        'SRC[t].col': col,
        'cpot[col]（写入位置）': pos,
        [`cpot[${col}]（自增后）`]: cpot[col],
        '结果 (row,col,val)': `(${col}, ${SRC[t].row}, ${SRC[t].val})`
      },
      { cpotState: [...cpot], phaseLabel: '写入阶段' }
    ));
  }

  steps.push(mkStep(
    'optimized', '完成',
    '🎉 优化快速转置完成！结果与其他两种算法完全一致',
    `三步合计同样是 O(cols + terms) 时间，但优化版本仅使用一个 cpot[] 辅助数组（而非快速转置的 num[] + cpot[] 两个数组），在常数因子上有所改进。三种算法的转置结果完全一致，验证了优化的正确性。实际工程中，在 cols 很大时，省去一个数组能节省可观的内存。`,
    'transpose_fast_optimized', slots,
    { resultRows: Array.from({length: terms}, (_, i) => i) },
    { '时间复杂度': 'O(cols+terms)', '空间优化': '仅需一个 cpot[] 辅助数组', '与快速转置差异': '省去 num[]，反向扫描替代前缀和' },
    { cpotState: [...cpot], phaseLabel: '完成 ✓' }
  ));

  return steps;
}

// ============================================================
//  APP STATE
// ============================================================
const APP = {
  allSteps: { naive: [], fast: [], optimized: [] },
  currentAlgo: 'naive',
  currentIndex: 0,
  playTimer: null,
  speed: 1100,  /* default playback interval in milliseconds (medium speed) */
  outputText: ''  /* stores last generated output for download */
};

// ============================================================
//  REBUILD APP (called when matrix changes)
// ============================================================
function rebuildApp(newMatrix) {
  ACTIVE_MATRIX = newMatrix.map(r => [...r]);
  MATRIX_ROWS = newMatrix.length;
  MATRIX_COLS = newMatrix[0].length;
  SRC = buildTriples(ACTIVE_MATRIX, MATRIX_ROWS, MATRIX_COLS);

  APP.allSteps.naive     = generateNaiveSteps();
  APP.allSteps.fast      = generateFastSteps();
  APP.allSteps.optimized = generateOptimizedSteps();

  ['naive', 'fast', 'optimized'].forEach(algo => {
    const steps = APP.allSteps[algo];
    steps.forEach((s, i) => { s.stepIndex = i; s.totalSteps = steps.length; });
  });

  stopPlayback();
  APP.currentIndex = 0;
  buildSourceTriplesTable();
  updatePanelTitles();
  renderStep(currentStep());
  updateNavButtons();
}

function updatePanelTitles() {
  const terms = SRC.length;
  document.querySelector('#source-matrix-panel .panel-title').textContent = `原矩阵（${MATRIX_ROWS}×${MATRIX_COLS}）`;
  document.querySelector('#source-triples-panel .panel-title').textContent = `原三元组表（${terms} 项，按行序）`;
  document.querySelector('#result-matrix-panel .panel-title').textContent = `转置矩阵（${MATRIX_COLS}×${MATRIX_ROWS}）`;
  const subtitle = document.querySelector('.header-subtitle');
  if (subtitle) subtitle.textContent = `part3/sparse_matrix.c 教学演示 · ${MATRIX_ROWS}×${MATRIX_COLS} 矩阵，${terms} 个非零元`;
}

// ============================================================
//  INIT
// ============================================================
function initApp() {
  APP.allSteps.naive     = generateNaiveSteps();
  APP.allSteps.fast      = generateFastSteps();
  APP.allSteps.optimized = generateOptimizedSteps();

  // Stamp stepIndex / totalSteps
  ['naive', 'fast', 'optimized'].forEach(algo => {
    const steps = APP.allSteps[algo];
    steps.forEach((s, i) => { s.stepIndex = i; s.totalSteps = steps.length; });
  });

  buildSourceTriplesTable();
  setupEventListeners();
  setupDataSourceHandlers();
  setupFileIOHandlers();
  updatePanelTitles();
  renderStep(currentStep());
}

function currentStep() {
  return APP.allSteps[APP.currentAlgo][APP.currentIndex];
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.algo === APP.currentAlgo) return;
      stopPlayback();
      APP.currentAlgo   = btn.dataset.algo;
      APP.currentIndex  = 0;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateHeaderBadge();
      renderStep(currentStep());
      updateNavButtons();
    });
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    stopPlayback();
    APP.currentIndex = 0;
    renderStep(currentStep());
    updateNavButtons();
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (APP.currentIndex > 0) {
      APP.currentIndex--;
      renderStep(currentStep());
      updateNavButtons();
    }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    const last = APP.allSteps[APP.currentAlgo].length - 1;
    if (APP.currentIndex < last) {
      APP.currentIndex++;
      renderStep(currentStep());
      updateNavButtons();
    }
  });

  document.getElementById('btn-play').addEventListener('click', () => {
    APP.playTimer ? stopPlayback() : startPlayback();
  });

  document.getElementById('speed-select').addEventListener('change', e => {
    APP.speed = parseInt(e.target.value, 10);
    if (APP.playTimer) { stopPlayback(); startPlayback(); }
  });
}

function startPlayback() {
  const btn = document.getElementById('btn-play');
  btn.textContent = '⏸ 暂停';
  btn.classList.add('paused');
  APP.playTimer = setInterval(() => {
    const last = APP.allSteps[APP.currentAlgo].length - 1;
    if (APP.currentIndex < last) {
      APP.currentIndex++;
      renderStep(currentStep());
      updateNavButtons();
    } else {
      stopPlayback();
    }
  }, APP.speed);
}

function stopPlayback() {
  if (APP.playTimer) { clearInterval(APP.playTimer); APP.playTimer = null; }
  const btn = document.getElementById('btn-play');
  btn.textContent = '▶ 播放';
  btn.classList.remove('paused');
}

function updateNavButtons() {
  const last = APP.allSteps[APP.currentAlgo].length - 1;
  document.getElementById('btn-prev').disabled = (APP.currentIndex === 0);
  document.getElementById('btn-next').disabled = (APP.currentIndex === last);
}

function updateHeaderBadge() {
  const names  = { naive: '普通转置', fast: '快速转置', optimized: '优化快速转置' };
  const briefs = {
    naive:     'O(cols × terms) — 双重遍历',
    fast:      'O(cols + terms) — num[] + cpot[] 两个辅助数组',
    optimized: 'O(cols + terms) — 仅 cpot[] 一个辅助数组（省去 num[]）'
  };
  document.getElementById('algo-badge').textContent = names[APP.currentAlgo];
  document.getElementById('algo-brief').textContent = briefs[APP.currentAlgo];
}

// ============================================================
//  STATIC SOURCE TABLE
// ============================================================
function buildSourceTriplesTable() {
  const tbody = document.getElementById('source-triples-body');
  tbody.innerHTML = '';
  SRC.forEach((t, i) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = i;
    tr.innerHTML = `<td>${i+1}</td><td>${t.row}</td><td>${t.col}</td><td>${t.val}</td>`;
    tbody.appendChild(tr);
  });
}

// ============================================================
//  RENDER STEP
// ============================================================
function renderStep(step) {
  if (!step) return;

  // Step counter + phase tag
  document.getElementById('step-counter').textContent =
    `步骤 ${step.stepIndex + 1} / ${step.totalSteps}`;
  document.getElementById('step-phase-tag').textContent = step.phase;
  document.getElementById('step-title').textContent = step.title;
  document.getElementById('step-description').textContent = step.description;
  document.getElementById('step-function').textContent = step.functionName + '()';

  renderVariables(step.variables);
  renderSourceMatrix(step);
  highlightSourceTriples(step.highlight.sourceRows || []);
  renderResultTriples(step);
  renderResultMatrix(step);
  renderAlgoState(step);
  updateNavButtons();
}

// ---- Variables chips ----
function renderVariables(vars) {
  const el = document.getElementById('step-variables');
  el.innerHTML = '';
  Object.entries(vars).forEach(([k, v]) => {
    const chip = document.createElement('span');
    chip.className = 'var-chip';
    chip.innerHTML =
      `<span class="var-key">${escHtml(String(k))}</span>` +
      `<span class="var-val">${escHtml(String(v))}</span>`;
    el.appendChild(chip);
  });
}

// ---- Source matrix (dynamic size) ----
function renderSourceMatrix(step) {
  const container = document.getElementById('source-matrix');
  const hl    = step.highlight;
  const hlSet = new Set((hl.matrixCells || []).map(({r,c}) => `${r},${c}`));
  const col0  = hl.currentCol ? hl.currentCol - 1 : -1; // 0-based

  const tbl = document.createElement('table');
  tbl.className = 'matrix-table';

  // Header row
  const thead = tbl.createTHead();
  const hr = thead.insertRow();
  let th = document.createElement('th'); hr.appendChild(th); // corner
  for (let c = 1; c <= MATRIX_COLS; c++) {
    th = document.createElement('th');
    th.textContent = c;
    if (c - 1 === col0) th.classList.add('col-header-hl');
    hr.appendChild(th);
  }

  const tbody = tbl.createTBody();
  for (let r = 0; r < MATRIX_ROWS; r++) {
    const row = tbody.insertRow();
    const rh = document.createElement('th');
    rh.textContent = r + 1;
    row.appendChild(rh);
    for (let c = 0; c < MATRIX_COLS; c++) {
      const td = row.insertCell();
      td.className = 'matrix-cell';
      const v = ACTIVE_MATRIX[r][c];
      td.textContent = v;
      if (v === 0) td.classList.add('zero-cell');
      if (hlSet.has(`${r},${c}`)) td.classList.add('highlighted-cell');
      else if (c === col0) td.classList.add('col-highlight');
    }
  }

  container.innerHTML = '';
  container.appendChild(tbl);
}

// ---- Highlight source triple rows ----
function highlightSourceTriples(hlRows) {
  const set = new Set(hlRows);
  document.querySelectorAll('#source-triples-body tr').forEach((tr, i) => {
    tr.classList.toggle('hl-source', set.has(i));
  });
}

// ---- Result triple table (dynamic slots) ----
function renderResultTriples(step) {
  const tbody = document.getElementById('result-triples-body');
  const hlSet = new Set(step.highlight.resultRows || []);
  tbody.innerHTML = '';
  const slots = step.resultSlots;
  for (let i = 0; i < slots.length; i++) {
    const tr = document.createElement('tr');
    const t = slots[i];
    if (t) {
      tr.innerHTML = `<td>${i+1}</td><td>${t.row}</td><td>${t.col}</td><td>${t.val}</td>`;
      if (hlSet.has(i)) tr.classList.add('hl-result');
    } else {
      tr.innerHTML = `<td>${i+1}</td><td>—</td><td>—</td><td>—</td>`;
      tr.classList.add('slot-empty');
    }
    tbody.appendChild(tr);
  }
}

// ---- Result matrix (transpose: MATRIX_COLS rows × MATRIX_ROWS cols) ----
function renderResultMatrix(step) {
  const container = document.getElementById('result-matrix');
  const slots  = step.resultSlots;
  const hlSet  = new Set((step.highlight.resultRows || []).map(i => {
    const t = slots[i];
    return t ? `${t.row - 1},${t.col - 1}` : '';
  }).filter(Boolean));

  // Transpose dims: result has MATRIX_COLS rows, MATRIX_ROWS cols
  const m = Array.from({length: MATRIX_COLS}, () => Array(MATRIX_ROWS).fill(0));
  slots.forEach(t => { if (t) m[t.row - 1][t.col - 1] = t.val; });

  const tbl = document.createElement('table');
  tbl.className = 'matrix-table';
  const thead = tbl.createTHead();
  const hr = thead.insertRow();
  let th = document.createElement('th'); hr.appendChild(th);
  for (let c = 1; c <= MATRIX_ROWS; c++) {
    th = document.createElement('th');
    th.textContent = c;
    hr.appendChild(th);
  }
  const tbody = tbl.createTBody();
  for (let r = 0; r < MATRIX_COLS; r++) {
    const row = tbody.insertRow();
    const rh = document.createElement('th');
    rh.textContent = r + 1;
    row.appendChild(rh);
    for (let c = 0; c < MATRIX_ROWS; c++) {
      const td = row.insertCell();
      td.className = 'matrix-cell';
      const v = m[r][c];
      td.textContent = v;
      if (v === 0) td.classList.add('zero-cell');
      if (hlSet.has(`${r},${c}`)) td.classList.add('result-cell-hl');
    }
  }
  container.innerHTML = '';
  container.appendChild(tbl);
}

// ============================================================
//  ALGORITHM STATE PANEL
// ============================================================
function renderAlgoState(step) {
  const el = document.getElementById('state-content');
  el.innerHTML = '';

  if (step.algorithm === 'naive') {
    renderNaiveState(el, step);
  } else if (step.algorithm === 'fast') {
    renderFastState(el, step);
  } else {
    renderOptimizedState(el, step);
  }
}

function renderNaiveState(el, step) {
  const ns = step.naiveState || { col: '—', p: '—', q: 0 };
  const terms = SRC.length;

  const colActive  = (typeof ns.col === 'number') ? ' active' : '';
  const pActive    = (typeof ns.p  === 'number') ? ' active' : '';
  const qActive    = (ns.q > 0) ? ' active' : '';

  el.innerHTML = `
    <div class="state-vars-row">
      <div class="state-var">
        <span class="state-label">外层循环变量<br>col（当前扫描列）</span>
        <span class="state-value${colActive}">${ns.col}</span>
      </div>
      <div class="state-var">
        <span class="state-label">内层指针<br>p（三元组序号）</span>
        <span class="state-value${pActive}">${ns.p}</span>
      </div>
      <div class="state-var">
        <span class="state-label">结果写指针<br>q（已写元素数）</span>
        <span class="state-value${qActive}">${ns.q}</span>
      </div>
    </div>
    <div class="complexity-note">
      ⏱ 时间复杂度：O(cols × terms) = O(${MATRIX_COLS} × ${terms}) = O(${MATRIX_COLS * terms})&emsp;
      每列都需完整遍历三元组表，效率随规模快速降低
    </div>`;
}

function renderFastState(el, step) {
  const numArr  = step.numState  || new Array(MATRIX_COLS + 1).fill(0);
  const cpotArr = step.cpotState || new Array(MATRIX_COLS + 1).fill(0);
  const numHl   = step.highlight.numIndex;
  const cpotHl  = step.highlight.cpotIndex;
  const terms = SRC.length;

  el.innerHTML = `
    ${makeArrayHTML('num[]', numArr, numHl, 'hl-orange')}
    ${makeArrayHTML('cpot[]', cpotArr, cpotHl, 'hl-green')}
    <div class="complexity-note">
      ⏱ 时间复杂度：O(cols + terms) = O(${MATRIX_COLS} + ${terms}) = O(${MATRIX_COLS + terms})&emsp;
      辅助空间：num[1..${MATRIX_COLS}] + cpot[1..${MATRIX_COLS}]，共 2 × cols 个单元
    </div>`;
}

function renderOptimizedState(el, step) {
  const cpotArr  = step.cpotState || new Array(MATRIX_COLS + 1).fill(0);
  const cpotHl   = step.highlight.cpotIndex;
  const phase    = step.phaseLabel || '—';

  el.innerHTML = `
    <div class="phase-label-display">当前阶段：<span class="phase-badge">${escHtml(phase)}</span></div>
    ${makeArrayHTML('cpot[]', cpotArr, cpotHl, 'hl-blue')}
    <div class="optimization-note">
      ✓ 优化关键：cpot[] 兼作 num[]，省去一个辅助数组；反向扫描就地计算起始位置
    </div>
    <div class="complexity-note" style="margin-top:8px">
      ⏱ 时间复杂度：O(cols + terms)&emsp;辅助空间：仅 cpot[1..${MATRIX_COLS}]（比快速转置少一半辅助空间）
    </div>`;
}

// Build num/cpot array HTML (arr is 1-indexed, index 0 unused; iterate 1..MATRIX_COLS)
function makeArrayHTML(label, arr, hlIdx, hlClass) {
  let cells = '';
  for (let i = 1; i <= arr.length - 1; i++) {
    const hl = (hlIdx === i) ? ` ${hlClass}` : '';
    cells += `
      <div class="array-cell${hl}">
        <div class="cell-idx">[${i}]</div>
        <div class="cell-val">${arr[i]}</div>
      </div>`;
  }
  return `
    <div class="array-row">
      <span class="array-label">${escHtml(label)}</span>
      <div class="array-cells">${cells}</div>
    </div>`;
}

// ============================================================
//  DATA SOURCE HANDLERS
// ============================================================
function clampDim(value, defaultVal) {
  return Math.min(15, Math.max(1, parseInt(value) || defaultVal));
}

function setupDataSourceHandlers() {
  const manualPanel = document.getElementById('manual-input-panel');
  const randomPanel = document.getElementById('random-input-panel');
  const testcasePanel = document.getElementById('testcase-input-panel');
  const testcaseSelect = document.getElementById('testcase-select');
  const testcaseDesc = document.getElementById('testcase-description');

  testcaseSelect.innerHTML = TEST_CASES
    .map((tc, i) => `<option value="${i}">${escHtml(tc.name)}</option>`)
    .join('');
  testcaseDesc.textContent = TEST_CASES[0].desc;

  // Radio button switching
  document.querySelectorAll('input[name="data-source"]').forEach(radio => {
    radio.addEventListener('change', e => {
      manualPanel.classList.toggle('hidden', e.target.value !== 'manual');
      randomPanel.classList.toggle('hidden', e.target.value !== 'random');
      testcasePanel.classList.toggle('hidden', e.target.value !== 'testcase');
      if (e.target.value === 'default') {
        rebuildApp(INITIAL_MATRIX);
      }
    });
  });

  // Manual: create grid button
  document.getElementById('btn-create-grid').addEventListener('click', () => {
    const r = clampDim(document.getElementById('manual-rows').value, 6);
    const c = clampDim(document.getElementById('manual-cols').value, 6);
    buildInputGrid(r, c);
  });

  // Manual: apply button
  document.getElementById('btn-apply-manual').addEventListener('click', () => {
    const matrix = readInputGrid();
    if (matrix) rebuildApp(matrix);
  });

  // Random: generate button
  document.getElementById('btn-generate-random').addEventListener('click', () => {
    const r = clampDim(document.getElementById('random-rows').value, 6);
    const c = clampDim(document.getElementById('random-cols').value, 6);
    const sparsity = Math.min(100, Math.max(0, parseInt(document.getElementById('random-density').value) || 60));
    const matrix = generateRandomMatrix(r, c, sparsity);
    rebuildApp(matrix);
    // Also select "random" radio visually
    document.querySelector('input[name="data-source"][value="random"]').checked = true;
    manualPanel.classList.add('hidden');
    randomPanel.classList.remove('hidden');
    testcasePanel.classList.add('hidden');
  });

  testcaseSelect.addEventListener('change', () => {
    const idx = parseInt(testcaseSelect.value, 10) || 0;
    testcaseDesc.textContent = TEST_CASES[idx].desc;
  });

  document.getElementById('btn-apply-testcase').addEventListener('click', () => {
    const idx = parseInt(testcaseSelect.value, 10) || 0;
    const matrix = TEST_CASES[idx].matrix.map(row => [...row]);
    rebuildApp(matrix);
    document.querySelector('input[name="data-source"][value="testcase"]').checked = true;
    manualPanel.classList.add('hidden');
    randomPanel.classList.add('hidden');
    testcasePanel.classList.remove('hidden');
  });
}

function buildInputGrid(rows, cols) {
  const grid = document.getElementById('matrix-input-grid');
  let html = '<table class="matrix-input-table">';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const defVal = (r < MATRIX_ROWS && c < MATRIX_COLS) ? ACTIVE_MATRIX[r][c] : 0;
      html += `<td><input type="number" class="matrix-cell-input" data-r="${r}" data-c="${c}" value="${defVal}" step="any"></td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  grid.innerHTML = html;
  grid.dataset.rows = rows;
  grid.dataset.cols = cols;
}

function readInputGrid() {
  const grid = document.getElementById('matrix-input-grid');
  const rows = parseInt(grid.dataset.rows);
  const cols = parseInt(grid.dataset.cols);
  if (!rows || !cols) { alert('请先点击"创建输入网格"'); return null; }
  const matrix = Array.from({length: rows}, () => Array(cols).fill(0));
  grid.querySelectorAll('.matrix-cell-input').forEach(inp => {
    matrix[parseInt(inp.dataset.r)][parseInt(inp.dataset.c)] = parseInt(inp.value) || 0;
  });
  return matrix;
}

function generateRandomMatrix(rows, cols, sparsityPct) {
  const matrix = Array.from({length: rows}, () => Array(cols).fill(0));
  const total = rows * cols;
  const safeSparsity = Math.min(100, Math.max(0, sparsityPct));
  // 与 C 端一致的 half-up 取整：count = floor(x + 0.5)
  // sparsity=100% => 0，sparsity=0% => total
  const count = Math.floor(total * (100 - safeSparsity) / 100 + 0.5);
  if (count <= 0) return matrix;
  const positions = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      positions.push([r, c]);
  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  positions.slice(0, count).forEach(([r, c]) => {
    let v = Math.floor(Math.random() * 19) - 9;
    if (v === 0) v = 1; // ensure non-zero
    matrix[r][c] = v;
  });
  return matrix;
}

// ============================================================
//  FILE I/O HANDLERS
// ============================================================
function setupFileIOHandlers() {
  const fileInput = document.getElementById('file-input');
  let parsedMatrix = null;

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      document.getElementById('input-display').value = text;
      parsedMatrix = parseInputFile(text);
      document.getElementById('btn-apply-file').disabled = !parsedMatrix;
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-apply-file').addEventListener('click', () => {
    if (parsedMatrix) {
      rebuildApp(parsedMatrix);
      // switch to default radio visually (file takes precedence)
      document.querySelectorAll('input[name="data-source"]').forEach(r => { r.checked = r.value === 'default'; });
      document.getElementById('manual-input-panel').classList.add('hidden');
      document.getElementById('random-input-panel').classList.add('hidden');
      document.getElementById('testcase-input-panel').classList.add('hidden');
    }
  });

  document.getElementById('btn-generate-output').addEventListener('click', () => {
    const output = generateOutputText();
    document.getElementById('output-display').value = output;
    document.getElementById('btn-download-output').disabled = false;
    APP.outputText = output;
  });

  document.getElementById('btn-download-output').addEventListener('click', () => {
    const text = APP.outputText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'part3-output.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function parseInputFile(text) {
  const lines = text.trim().split(/\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 1) return null;
  const parts = lines[0].split(/\s+/).map(Number);
  if (parts.length < 2) return null;
  const [rows, cols] = parts;
  if (!rows || !cols || rows > 15 || cols > 15 || rows < 1 || cols < 1) return null;
  if (lines.length < rows + 1) return null;
  const matrix = [];
  for (let r = 0; r < rows; r++) {
    const vals = lines[r + 1].split(/\s+/).map(Number);
    if (vals.length < cols) return null;
    matrix.push(vals.slice(0, cols));
  }
  return matrix;
}

function generateOutputText() {
  const terms = SRC.length;
  let out = '========================================\n';
  out += '稀疏矩阵转置 — 网页可视化输出\n';
  out += `矩阵规模：${MATRIX_ROWS}×${MATRIX_COLS}，非零元素数：${terms}\n`;
  out += '========================================\n\n';

  out += '  原始矩阵：\n';
  for (let r = 0; r < MATRIX_ROWS; r++) {
    out += '  ' + ACTIVE_MATRIX[r].map(v => String(v).padStart(5)).join('') + '\n';
  }
  out += '\n';

  out += `  三元组表（行, 列, 值）：\n`;
  SRC.forEach((t, i) => {
    out += `    [${i+1}] (${t.row}, ${t.col}, ${t.val})\n`;
  });
  out += '\n';

  // Run each algorithm and show result
  ['naive', 'fast', 'optimized'].forEach(algo => {
    const steps = APP.allSteps[algo];
    const lastStep = steps[steps.length - 1];
    const algoName = algo === 'naive' ? '普通转置' : algo === 'fast' ? '快速转置' : '优化快速转置';
    out += `  ${algoName} 转置结果（三元组表）：\n`;
    lastStep.resultSlots.forEach((t, i) => {
      if (t) out += `    [${i+1}] (${t.row}, ${t.col}, ${t.val})\n`;
    });
    out += '\n';

    // Transpose matrix display (MATRIX_COLS rows × MATRIX_ROWS cols)
    const m = Array.from({length: MATRIX_COLS}, () => Array(MATRIX_ROWS).fill(0));
    lastStep.resultSlots.forEach(t => { if (t) m[t.row - 1][t.col - 1] = t.val; });
    out += `  转置后矩阵（${MATRIX_COLS}×${MATRIX_ROWS}）：\n`;
    for (let r = 0; r < MATRIX_COLS; r++) {
      out += '  ' + m[r].map(v => String(v).padStart(5)).join('') + '\n';
    }
    out += '\n';
  });

  return out;
}

// ============================================================
//  UTILITIES
// ============================================================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);
