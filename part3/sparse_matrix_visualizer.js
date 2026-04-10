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

// Build 1-indexed triples by scanning row-major order
function buildTriples(matrix) {
  const triples = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 6; c++)
      if (matrix[r][c] !== 0)
        triples.push({ row: r + 1, col: c + 1, val: matrix[r][c] });
  return triples;
}

const SRC = buildTriples(INITIAL_MATRIX);
// SRC[0]=(1,2,12) SRC[1]=(1,3,9) SRC[2]=(3,1,-3) SRC[3]=(3,6,14)
// SRC[4]=(4,3,24) SRC[5]=(4,5,18) SRC[6]=(5,1,15) SRC[7]=(5,4,-7) SRC[8]=(6,3,-4)

// ============================================================
//  STEP BUILDER HELPER
// ============================================================
function emptySlots() { return new Array(9).fill(null); }

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

  steps.push(mkStep(
    'naive', '初始化',
    '普通转置算法（transpose_naive）开始',
    '普通转置的核心思路：以"列"为外层循环（col 从 1 到 6），内层完整遍历全部三元组（p 从 1 到 9），找出列号等于 col 的元素，依次写入结果表。时间复杂度 O(cols × terms)，本例共需 6 × 9 = 54 次比较。逻辑简单直观，但效率较低。',
    'transpose_naive', slots, {},
    { cols: 6, terms: 9, q: 0 },
    { naiveState: { col: '—', p: '—', q: 0 } }
  ));

  for (let col = 1; col <= 6; col++) {
    // Highlight entire column in source matrix
    const colCells = [];
    for (let r = 0; r < 6; r++) colCells.push({ r, c: col - 1 });

    steps.push(mkStep(
      'naive', `外层循环 col = ${col}`,
      `外层循环推进：col = ${col}，准备遍历全部 9 个三元组`,
      `外层循环变量推进到 col = ${col}。接下来要把三元组表的全部 9 个项目逐一检查，判断每项的列号是否等于 ${col}。这正是"普通"转置的代价——无论该列实际有几个非零元素，都要完整扫描一遍，每列的代价都是 O(terms)。`,
      'transpose_naive', slots,
      { matrixCells: colCells, currentCol: col },
      { col, '内层遍历 p': 'p = 1..9', '已写结果数': q },
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
    `外层循环执行了 6 次（cols = 6），每次内层遍历 9 个三元组（terms = 9），共执行 6 × 9 = 54 次比较，找到并写入 9 个非零元素。当矩阵规模增大时，如 cols = 1000、terms = 10000，则需要 1000 万次比较，效率极低——这正是引入快速转置的动机。`,
    'transpose_naive', slots,
    { resultRows: [0,1,2,3,4,5,6,7,8] },
    { cols: 6, terms: 9, '总比较次数': '6 × 9 = 54', '总写入次数': 9 },
    { naiveState: { col: '完成 ✓', p: '—', q: 9 } }
  ));

  return steps;
}

// ============================================================
//  FAST TRANSPOSE  — O(cols + terms)
// ============================================================
function generateFastSteps() {
  const steps = [];
  const num  = [0, 0, 0, 0, 0, 0, 0]; // 1-indexed, index 0 unused
  const cpot = [0, 0, 0, 0, 0, 0, 0]; // 1-indexed, index 0 unused
  const slots = emptySlots();

  // ---- Phase 1: count num[] ----
  steps.push(mkStep(
    'fast', '第一步：统计各列元素数 num[]',
    '快速转置（transpose_fast）开始：统计各列非零元素数',
    '快速转置分三步，总时间复杂度 O(cols + terms)。第一步：遍历所有三元组，对每个三元组执行 num[col]++，统计原矩阵各列各有多少个非零元素。num[] 是大小为 cols 的辅助数组，初始全为 0。',
    'transpose_fast', slots, {},
    { '当前步骤': '一、统计 num[]', '辅助数组': 'num[1..6] 初始全为 0' },
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

  steps.push(mkStep(
    'fast', '第一步完成',
    'num[] 统计完毕！各列元素数一览',
    '遍历完全部 9 个三元组，num[] 统计完成：num[1]=2（第1列有2个非零元），num[2]=1，num[3]=3（第3列最多），num[4]=1，num[5]=1，num[6]=1。这一步仅需 O(terms) = O(9) 次操作。',
    'transpose_fast', slots, {},
    { 'num[1]': 2, 'num[2]': 1, 'num[3]': 3, 'num[4]': 1, 'num[5]': 1, 'num[6]': 1 },
    { numState: [...num], cpotState: [...cpot] }
  ));

  // ---- Phase 2: compute cpot[] ----
  steps.push(mkStep(
    'fast', '第二步：计算各列起始位置 cpot[]',
    '第二步：用前缀和从 num[] 推导 cpot[]',
    '第二步利用前缀和计算 cpot[]，cpot[col] 表示原矩阵第 col 列的元素在转置结果表中的起始写入位置（1-indexed）。公式：cpot[1] = 1；对 col ≥ 2：cpot[col] = cpot[col−1] + num[col−1]。这一步时间复杂度 O(cols)。',
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

  for (let col = 2; col <= 6; col++) {
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

  steps.push(mkStep(
    'fast', '第二步完成',
    'cpot[] 计算完毕！各列起始位置一览',
    'cpot[] 全部计算完成：cpot[1]=1，cpot[2]=3，cpot[3]=4，cpot[4]=7，cpot[5]=8，cpot[6]=9。解读：第1列(2个元素)写到位置1-2；第2列(1个)写到位置3；第3列(3个)写到位置4-6；第4列写到7；第5列写到8；第6列写到9。这一步仅需 O(cols) = O(6) 次操作。',
    'transpose_fast', slots, {},
    { 'cpot[1]': 1, 'cpot[2]': 3, 'cpot[3]': 4, 'cpot[4]': 7, 'cpot[5]': 8, 'cpot[6]': 9 },
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
    '三步合计：第一步 O(terms)=9次 + 第二步 O(cols)=6次 + 第三步 O(terms)=9次，共约 24 次基本操作，远少于普通转置的 54 次比较。结果三元组已按行有序，与普通转置结果完全一致。额外代价是 num[] 和 cpot[] 两个长度为 cols 的辅助数组。',
    'transpose_fast', slots,
    { resultRows: [0,1,2,3,4,5,6,7,8] },
    { '时间复杂度': 'O(cols+terms)', '总操作数': '9+6+9=24', '辅助空间': 'O(cols)=num[]+cpot[]' },
    { numState: [...num], cpotState: [...cpot] }
  ));

  return steps;
}

// ============================================================
//  OPTIMIZED FAST TRANSPOSE  — O(cols + terms), single aux array
// ============================================================
function generateOptimizedSteps() {
  const steps = [];
  const cpot  = [0, 0, 0, 0, 0, 0, 0]; // 1-indexed; reused as count then start-pos
  const slots = emptySlots();

  // ---- Phase 1: cpot[] used as count (= num[]) ----
  steps.push(mkStep(
    'optimized', '第一步：用 cpot[] 兼作计数（省去 num[]）',
    '优化快速转置（transpose_fast_optimized）：第一步复用 cpot[] 计数',
    '优化版与快速转置的区别在于：省掉了 num[] 数组，直接用 cpot[] 先扮演 num[] 做统计，再用一次反向扫描就地转换为起始位置，节省了一个长度为 cols 的辅助数组（虽然渐近空间复杂度仍是 O(cols)，但常数因子减半）。',
    'transpose_fast_optimized', slots, {},
    { '优化点': '省去 num[]，cpot[] 一物两用', '辅助数组': 'cpot[1..6] 初始全为 0' },
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

  steps.push(mkStep(
    'optimized', '第一步完成',
    'cpot[] 统计完毕，结果与 num[] 完全一致',
    'cpot[] 现在存储的是各列元素数，与快速转置的 num[] 完全相同：cpot[1]=2, cpot[2]=1, cpot[3]=3, cpot[4]=1, cpot[5]=1, cpot[6]=1。接下来用反向扫描将计数就地转换为起始位置，这是优化的核心技巧。',
    'transpose_fast_optimized', slots, {},
    { 'cpot[1]': 2, 'cpot[2]': 1, 'cpot[3]': 3, 'cpot[4]': 1, 'cpot[5]': 1, 'cpot[6]': 1 },
    { cpotState: [...cpot], phaseLabel: '统计阶段' }
  ));

  // ---- Phase 2: backward scan to convert counts to start positions ----
  steps.push(mkStep(
    'optimized', '第二步：反向扫描计算起始位置（优化核心）',
    '优化核心：一次反向扫描，将计数就地转为起始位置',
    '核心优化：设 acc = terms + 1 = 10，然后从 col = 6 向 col = 1 反向扫描，每次执行：acc -= cpot[c]；cpot[c] = acc。这一趟操作可以原地（in-place）把 cpot[] 从"各列元素个数"转换为"各列在结果中的起始位置"，无需额外的 num[] 数组。',
    'transpose_fast_optimized', slots, {},
    { acc: `terms + 1 = ${SRC.length + 1}`, '扫描方向': '从 col=6 到 col=1（反向）' },
    { cpotState: [...cpot], phaseLabel: '计算起始位置' }
  ));

  let acc = SRC.length + 1; // = 10
  steps.push(mkStep(
    'optimized', '第二步：初始化 acc',
    `acc = terms + 1 = ${SRC.length} + 1 = ${acc}`,
    `初始化累加器 acc = terms + 1 = ${acc}。这个哨兵值保证了反向扫描能正确推算出第 1 列的起始位置。acc 每次减去当前列的元素数，得到该列的起始位置。`,
    'transpose_fast_optimized', slots, {},
    { acc, terms: SRC.length },
    { cpotState: [...cpot], phaseLabel: '计算起始位置' }
  ));

  for (let c = 6; c >= 1; c--) {
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

  steps.push(mkStep(
    'optimized', '第二步完成',
    'cpot[] 已转换为起始位置，与快速转置结果完全一致',
    '反向扫描完成！cpot[1]=1, cpot[2]=3, cpot[3]=4, cpot[4]=7, cpot[5]=8, cpot[6]=9，与快速转置的 cpot[] 完全一致。优化版仅用一个变量 acc 就完成了这个转换，无需额外的 num[] 数组。',
    'transpose_fast_optimized', slots, {},
    { 'cpot[1]': 1, 'cpot[2]': 3, 'cpot[3]': 4, 'cpot[4]': 7, 'cpot[5]': 8, 'cpot[6]': 9 },
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
    '三步合计同样是 O(cols + terms) 时间，但优化版本仅使用一个 cpot[] 辅助数组（而非快速转置的 num[] + cpot[] 两个数组），在常数因子上有所改进。三种算法的转置结果完全一致，验证了优化的正确性。实际工程中，在 cols 很大时，省去一个数组能节省可观的内存。',
    'transpose_fast_optimized', slots,
    { resultRows: [0,1,2,3,4,5,6,7,8] },
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
  speed: 1100  /* default playback interval in milliseconds (medium speed) */
};

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

// ---- Source 6×6 matrix ----
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
  for (let c = 1; c <= 6; c++) {
    th = document.createElement('th');
    th.textContent = c;
    if (c - 1 === col0) th.classList.add('col-header-hl');
    hr.appendChild(th);
  }

  const tbody = tbl.createTBody();
  for (let r = 0; r < 6; r++) {
    const row = tbody.insertRow();
    const rh = document.createElement('th');
    rh.textContent = r + 1;
    row.appendChild(rh);
    for (let c = 0; c < 6; c++) {
      const td = row.insertCell();
      td.className = 'matrix-cell';
      const v = INITIAL_MATRIX[r][c];
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

// ---- Result triple table (9-slot fixed) ----
function renderResultTriples(step) {
  const tbody = document.getElementById('result-triples-body');
  const hlSet = new Set(step.highlight.resultRows || []);
  tbody.innerHTML = '';
  const slots = step.resultSlots;
  for (let i = 0; i < 9; i++) {
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

// ---- Result 6×6 matrix (derived from result slots) ----
function renderResultMatrix(step) {
  const container = document.getElementById('result-matrix');
  const slots  = step.resultSlots;
  const hlSet  = new Set((step.highlight.resultRows || []).map(i => {
    const t = slots[i];
    return t ? `${t.row - 1},${t.col - 1}` : '';
  }).filter(Boolean));

  // Build matrix from slots
  const m = Array.from({length: 6}, () => Array(6).fill(0));
  slots.forEach(t => { if (t) m[t.row - 1][t.col - 1] = t.val; });

  const tbl = document.createElement('table');
  tbl.className = 'matrix-table';
  const thead = tbl.createTHead();
  const hr = thead.insertRow();
  let th = document.createElement('th'); hr.appendChild(th);
  for (let c = 1; c <= 6; c++) {
    th = document.createElement('th');
    th.textContent = c;
    hr.appendChild(th);
  }
  const tbody = tbl.createTBody();
  for (let r = 0; r < 6; r++) {
    const row = tbody.insertRow();
    const rh = document.createElement('th');
    rh.textContent = r + 1;
    row.appendChild(rh);
    for (let c = 0; c < 6; c++) {
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
      ⏱ 时间复杂度：O(cols × terms) = O(6 × 9) = O(54)&emsp;
      每列都需完整遍历三元组表，效率随规模快速降低
    </div>`;
}

function renderFastState(el, step) {
  const numArr  = step.numState  || [0,0,0,0,0,0,0];
  const cpotArr = step.cpotState || [0,0,0,0,0,0,0];
  const numHl   = step.highlight.numIndex;
  const cpotHl  = step.highlight.cpotIndex;

  el.innerHTML = `
    ${makeArrayHTML('num[]', numArr, numHl, 'hl-orange')}
    ${makeArrayHTML('cpot[]', cpotArr, cpotHl, 'hl-green')}
    <div class="complexity-note">
      ⏱ 时间复杂度：O(cols + terms) = O(6 + 9) = O(15)&emsp;
      辅助空间：num[1..6] + cpot[1..6]，共 2 × cols 个单元
    </div>`;
}

function renderOptimizedState(el, step) {
  const cpotArr  = step.cpotState || [0,0,0,0,0,0,0];
  const cpotHl   = step.highlight.cpotIndex;
  const phase    = step.phaseLabel || '—';

  el.innerHTML = `
    <div class="phase-label-display">当前阶段：<span class="phase-badge">${escHtml(phase)}</span></div>
    ${makeArrayHTML('cpot[]', cpotArr, cpotHl, 'hl-blue')}
    <div class="optimization-note">
      ✓ 优化关键：cpot[] 兼作 num[]，省去一个辅助数组；反向扫描就地计算起始位置
    </div>
    <div class="complexity-note" style="margin-top:8px">
      ⏱ 时间复杂度：O(cols + terms)&emsp;辅助空间：仅 cpot[1..6]（比快速转置少一半辅助空间）
    </div>`;
}

// Build num/cpot array HTML
function makeArrayHTML(label, arr, hlIdx, hlClass) {
  let cells = '';
  for (let i = 1; i <= 6; i++) {
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
