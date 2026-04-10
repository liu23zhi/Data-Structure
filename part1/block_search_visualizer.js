'use strict';

// ============================================================
//  DATA  —  matches part1/block_search.c exactly
// ============================================================

/** The 25-element array from block_search.c: int a[N] */
const ARRAY = [
  8, 14,  6,  9, 10,   // Block 0 (1-indexed: Block 1), max=14
 22, 34, 18, 19, 31,   // Block 1 (1-indexed: Block 2), max=34
 40, 38, 54, 66, 46,   // Block 2 (1-indexed: Block 3), max=66
 71, 78, 68, 80, 85,   // Block 3 (1-indexed: Block 4), max=85
100, 94, 88, 96, 87    // Block 4 (1-indexed: Block 5), max=100
];

const BLOCK_SIZE = 5;   // #define BLOCK_SIZE 5
const NUM_BLOCKS = 5;   // #define NUM_BLOCKS 5
const KEY        = 46;  // the search key used throughout the demo

// Build index table: matches build_index() in block_search.c
// IDX[b] = { max_val, start }  (start is 0-based array index)
const IDX = [];
for (let b = 0; b < NUM_BLOCKS; b++) {
  const start = b * BLOCK_SIZE;
  let max = ARRAY[start];
  for (let i = start + 1; i < start + BLOCK_SIZE; i++) {
    if (ARRAY[i] > max) max = ARRAY[i];
  }
  IDX.push({ max_val: max, start });
}
// Result: IDX[0]={max_val:14,start:0}  IDX[1]={max_val:34,start:5}
//         IDX[2]={max_val:66,start:10} IDX[3]={max_val:85,start:15}
//         IDX[4]={max_val:100,start:20}

// Linked list representation for linked_block_search:
// Each block is an array of values in linked-list order (same as ARRAY order,
// matching the tail-insertion in build_linked_blocks()).
const LINKED_BLOCKS = [];
for (let b = 0; b < NUM_BLOCKS; b++) {
  const nodes = [];
  for (let i = b * BLOCK_SIZE; i < (b + 1) * BLOCK_SIZE; i++) {
    nodes.push(ARRAY[i]);
  }
  LINKED_BLOCKS.push({ max_val: IDX[b].max_val, nodes });
}

// ============================================================
//  STEP BUILDER HELPER
// ============================================================

/**
 * Create a frozen step snapshot.
 * Every field that a renderer might need is captured at the moment
 * the step is generated, so the "player" can just render a stored state.
 *
 * @param {string} algorithm  - 'sequential' | 'binary' | 'linked'
 * @param {string} phase      - short phase tag shown in the UI
 * @param {string} title      - step title
 * @param {string} desc       - detailed description
 * @param {string} fn         - C function name
 * @param {Object} variables  - key-value variable chips
 * @param {Object} highlight  - which elements/rows to highlight
 * @param {Object} algoState  - algorithm-specific state for the state panel
 */
function mkStep(algorithm, phase, title, desc, fn, variables, highlight, algoState) {
  return Object.freeze({
    algorithm,
    phase,
    title,
    description: desc,
    functionName: fn,
    variables: Object.assign({}, variables),
    highlight: Object.assign(
      {
        arrayIndices: [],   // 0-based array indices being examined (orange)
        foundIndex:   -1,   // 0-based index of found element (green), -1=none
        activeBlock:  -1,   // 0-based block index highlighted (light blue), -1=none
        indexRow:     -1,   // 0-based index table row examined (orange), -1=none
        indexFound:   -1,   // 0-based index table row confirmed (green), -1=none
        indexMid:     -1,   // 0-based index table mid row (blue, binary only)
        indexRangeLow:  -1, // binary: current low bound (0-based)
        indexRangeHigh: -1, // binary: current high bound (0-based)
        llBlock:      -1,   // linked: which block's list is shown (-1=none)
        llCurrentNode: -1,  // linked: 0-based node within block being examined
        llFoundNode:   -1   // linked: 0-based node found (green)
      },
      highlight
    ),
    algoState: Object.assign({}, algoState),
    stepIndex:  0,  // will be stamped by initApp()
    totalSteps: 0   // will be stamped by initApp()
  });
}

// ============================================================
//  ALGORITHM 1:  block_search_sequential_index
//  逻辑：顺序扫描索引表 → 找块 → 块内顺序查找
// ============================================================
function generateSequentialSteps() {
  const steps = [];
  const FN = 'block_search_sequential_index';

  // ── Step 0: Initialisation ──────────────────────────────
  // Explain the algorithm before any comparison is made.
  steps.push(mkStep(
    'sequential', '初始化',
    '顺序索引分块查找 — 算法开始',
    '分块查找（索引顺序查找）是一种介于顺序查找和折半查找之间的查找方法。' +
    '基本思路：先建立索引表（每项记录各块的最大关键字和起始下标），' +
    '查找时第一步在索引表中顺序扫描，找到关键字可能所在的块；' +
    '第二步在该块内做顺序查找。本例：顺序表共 25 个元素，分为 5 块，每块 5 个元素，查找关键字 key = 46。',
    FN,
    { key: KEY, n: 25, block_size: BLOCK_SIZE, num_blocks: NUM_BLOCKS },
    {},
    { phase: 'init', b: '—', pos: '—', stepNum: 0, result: -1 }
  ));

  // ── 第一步：在索引表中顺序查找 ──────────────────────────
  // C code: for (int b = 0; b < NUM_BLOCKS; b++) { if (key <= idx[b].max_val) ... }
  let block_id = -1;
  let stepNum = 0;

  for (let b = 0; b < NUM_BLOCKS; b++) {
    stepNum++;
    const found = KEY <= IDX[b].max_val;

    steps.push(mkStep(
      'sequential', `索引扫描 b=${b}`,
      found
        ? `✓ 索引命中！key(${KEY}) ≤ idx[${b}].max(${IDX[b].max_val}) → 关键字在第 ${b + 1} 块`
        : `key(${KEY}) > idx[${b}].max(${IDX[b].max_val}) → 继续向后`,
      found
        ? `比较第 ${b + 1} 项索引：key = ${KEY} ≤ idx[${b}].max_val = ${IDX[b].max_val}，条件成立。` +
          `关键字 ${KEY} 的最大可能所在块确定为第 ${b + 1} 块（数组下标 ${IDX[b].start}~${IDX[b].start + BLOCK_SIZE - 1}）。` +
          `退出索引查找循环，准备进入块内顺序查找。`
        : `比较第 ${b + 1} 项索引：key = ${KEY} > idx[${b}].max_val = ${IDX[b].max_val}，条件不成立。` +
          `关键字不在第 ${b + 1} 块（该块最大元素为 ${IDX[b].max_val}，比 ${KEY} 小），继续扫描下一项。`,
      FN,
      {
        key: KEY,
        b: b,
        [`idx[${b}].max_val`]: IDX[b].max_val,
        [`key <= idx[${b}].max?`]: found ? '是 ✓' : '否',
        比较次数: stepNum
      },
      {
        indexRow:   found ? -1 : b,
        indexFound: found ? b  : -1,
        activeBlock: found ? b : -1
      },
      {
        phase: 'index',
        b,
        pos: '—',
        stepNum,
        result: -1,
        block_id: found ? b : -1
      }
    ));

    if (found) { block_id = b; break; }
  }

  // ── Announce entering block ─────────────────────────────
  steps.push(mkStep(
    'sequential', '进入块内查找',
    `进入第 ${block_id + 1} 块，准备顺序查找（下标 ${IDX[block_id].start}~${IDX[block_id].start + BLOCK_SIZE - 1}）`,
    `索引表确定关键字 ${KEY} 在第 ${block_id + 1} 块内（idx[${block_id}].start = ${IDX[block_id].start}，` +
    `块大小 = ${BLOCK_SIZE}，元素范围：下标 ${IDX[block_id].start} 到 ${IDX[block_id].start + BLOCK_SIZE - 1}）。` +
    `块内元素为 [${ARRAY.slice(IDX[block_id].start, IDX[block_id].start + BLOCK_SIZE).join(', ')}]。` +
    `接下来对这 ${BLOCK_SIZE} 个元素逐一比较，时间复杂度 O(s) = O(${BLOCK_SIZE})。`,
    FN,
    {
      block_id: block_id,
      [`块 ${block_id + 1} 起始下标`]: IDX[block_id].start,
      [`块 ${block_id + 1} 元素`]: `[${ARRAY.slice(IDX[block_id].start, IDX[block_id].start + BLOCK_SIZE).join(',')}]`
    },
    {
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'block', b: block_id, pos: IDX[block_id].start, stepNum, result: -1, block_id }
  ));

  // ── 第二步：块内顺序查找 ────────────────────────────────
  // C code: for (int i = 0; i < BLOCK_SIZE; i++) { pos = idx[block_id].start + i; if (a[pos] == key) ... }
  let found_pos = -1;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const pos = IDX[block_id].start + i;
    stepNum++;
    const isMatch = ARRAY[pos] === KEY;

    steps.push(mkStep(
      'sequential', `块内比较 a[${pos}]`,
      isMatch
        ? `🎉 查找成功！a[${pos}] = ${ARRAY[pos]} == key(${KEY}) → 找到，位置 = ${pos + 1}（1-based）`
        : `a[${pos}] = ${ARRAY[pos]} ≠ key(${KEY}) → 继续`,
      isMatch
        ? `比较 a[${pos}] = ${ARRAY[pos]} 与 key = ${KEY}：相等！查找成功。` +
          `关键字 ${KEY} 位于顺序表第 ${pos + 1} 个位置（0-based 下标 ${pos}），` +
          `即第 ${block_id + 1} 块第 ${i + 1} 个元素。总比较次数 = ${stepNum}（索引 ${block_id + 1} 次 + 块内 ${i + 1} 次）。`
        : `比较 a[${pos}] = ${ARRAY[pos]} 与 key = ${KEY}：不相等，继续检查下一个元素。` +
          `当前在第 ${block_id + 1} 块第 ${i + 1} 个位置，还有 ${BLOCK_SIZE - i - 1} 个元素待检查。`,
      FN,
      {
        key: KEY,
        [`a[${pos}]`]: ARRAY[pos],
        [`a[${pos}] == key?`]: isMatch ? '是 ✓' : '否',
        比较次数: stepNum,
        block_id: block_id,
        pos: pos
      },
      {
        arrayIndices: isMatch ? [] : [pos],
        foundIndex:   isMatch ? pos : -1,
        activeBlock:  block_id,
        indexFound:   block_id
      },
      { phase: 'block', b: block_id, pos, stepNum, result: isMatch ? pos + 1 : -1, block_id }
    ));

    if (isMatch) { found_pos = pos; break; }
  }

  // ── Summary ─────────────────────────────────────────────
  steps.push(mkStep(
    'sequential', '完成',
    found_pos >= 0
      ? `✅ 顺序索引分块查找完成！关键字 ${KEY} 在位置 ${found_pos + 1}（1-based）`
      : `❌ 查找失败，关键字 ${KEY} 不在表中`,
    found_pos >= 0
      ? `顺序索引分块查找成功结束。总比较次数 = ${stepNum}，包括：` +
        `索引查找 ${block_id + 1} 次 + 块内查找 ${stepNum - block_id - 1} 次。` +
        `理论最优：b=5，s=5 时，顺序分块平均比较次数 ≈ (b+1)/2 + (s+1)/2 = 3 + 3 = 6 次。` +
        `本次实际用了 ${stepNum} 次，因为目标元素在第 ${block_id + 1} 块的最后一个位置。`
      : `查找失败。遍历了全部索引表和对应块，均未找到关键字 ${KEY}。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `位置 ${found_pos + 1}` : '未找到',
      总比较次数: stepNum,
      索引比较次数: block_id + 1,
      块内比较次数: stepNum - block_id - 1
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'done', b: block_id, pos: found_pos, stepNum, result: found_pos >= 0 ? found_pos + 1 : -1, block_id }
  ));

  return steps;
}

// ============================================================
//  ALGORITHM 2:  block_search_binary_index
//  逻辑：折半查找索引表 → 找块 → 块内顺序查找
// ============================================================
function generateBinarySteps() {
  const steps = [];
  const FN = 'block_search_binary_index';

  // ── Step 0: Initialisation ──────────────────────────────
  steps.push(mkStep(
    'binary', '初始化',
    '折半索引分块查找 — 算法开始',
    '折半索引分块查找改进了第一阶段：使用折半查找（二分查找）在索引表中定位块，' +
    '将第一阶段时间复杂度从 O(b) 降为 O(log b)，第二阶段仍使用块内顺序查找 O(s)。' +
    '总时间复杂度 O(log b + s)。本例：b = 5，⌈log₂5⌉ = 3，s = 5，最多 8 次比较。' +
    '当 b 较大时，折半索引优势明显。key = 46，索引表共 5 项。',
    FN,
    {
      key: KEY,
      low: 0,
      high: NUM_BLOCKS - 1,
      block_id: -1,
      b: NUM_BLOCKS,
      s: BLOCK_SIZE
    },
    {},
    { phase: 'init', low: 0, high: NUM_BLOCKS - 1, mid: '—', block_id: -1, stepNum: 0, result: -1 }
  ));

  // ── 第一步：折半查找索引表 ──────────────────────────────
  // C code:
  //   int low = 0, high = NUM_BLOCKS - 1, block_id = -1;
  //   while (low <= high) {
  //     int mid = (low + high) / 2;
  //     if (key == idx[mid].max_val)      { block_id = mid; break; }
  //     else if (key < idx[mid].max_val)  { high = mid - 1; block_id = mid; }
  //     else                              { low = mid + 1; }
  //   }
  let low = 0, high = NUM_BLOCKS - 1, block_id = -1;
  let stepNum = 0;
  let binaryStep = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    stepNum++;

    let direction, explanation, newLow = low, newHigh = high, newBlockId = block_id;

    if (KEY === IDX[mid].max_val) {
      direction   = 'equal';
      newBlockId  = mid;
      explanation = `key(${KEY}) == idx[${mid}].max_val(${IDX[mid].max_val})，精确命中第 ${mid + 1} 块！`;
    } else if (KEY < IDX[mid].max_val) {
      direction  = 'left';
      newHigh    = mid - 1;
      newBlockId = mid;  // key < max[mid], so key may be in block mid
      explanation = `key(${KEY}) < idx[${mid}].max_val(${IDX[mid].max_val})，向左缩小范围；` +
                    `同时记录 block_id = ${mid}（key 可能在此块中），high 更新为 ${newHigh}。`;
    } else {
      direction  = 'right';
      newLow     = mid + 1;
      explanation = `key(${KEY}) > idx[${mid}].max_val(${IDX[mid].max_val})，` +
                    `key 不在第 ${mid + 1} 块及其左侧，向右缩小范围；low 更新为 ${newLow}。`;
    }

    steps.push(mkStep(
      'binary', `折半查找第 ${binaryStep} 次`,
      direction === 'equal'
        ? `✓ 精确命中 mid=${mid}！idx[${mid}].max = ${IDX[mid].max_val} == key(${KEY})`
        : direction === 'left'
          ? `key < mid → 向左，high = ${newHigh}，block_id = ${mid}`
          : `key > mid → 向右，low = ${newLow}`,
      `第 ${binaryStep} 次折半：low=${low}, high=${high}, mid=${mid}（idx[mid].max_val=${IDX[mid].max_val}）。${explanation}`,
      FN,
      {
        low,
        high,
        mid,
        [`idx[${mid}].max_val`]: IDX[mid].max_val,
        key: KEY,
        方向: direction === 'equal' ? '精确命中' : direction === 'left' ? '向左 (key < max)' : '向右 (key > max)',
        block_id: newBlockId,
        比较次数: stepNum
      },
      {
        indexMid:       mid,
        indexRangeLow:  low,
        indexRangeHigh: high,
        indexFound:     direction === 'equal' ? mid : newBlockId,
        activeBlock:    direction === 'equal' ? mid : newBlockId
      },
      {
        phase: 'index',
        low,
        high,
        mid,
        block_id: newBlockId,
        stepNum,
        result: -1
      }
    ));

    low      = newLow;
    high     = newHigh;
    block_id = newBlockId;
    binaryStep++;

    if (direction === 'equal') break;
  }

  // Handle fallback: if block_id still -1, use low (C code: if (block_id == -1 && low < NUM_BLOCKS))
  if (block_id === -1) {
    if (low < NUM_BLOCKS) {
      block_id = low;
    }
  }

  // ── Announce block identified ────────────────────────────
  steps.push(mkStep(
    'binary', '确认目标块',
    `折半查找结束 — 确定关键字可能在第 ${block_id + 1} 块`,
    `折半查找循环结束（low=${low} > high=${high}）。根据 C 代码逻辑，` +
    `block_id = ${block_id}（第 ${block_id + 1} 块）。` +
    `索引折半查找共做了 ${stepNum} 次比较，远少于顺序扫描的最多 5 次（本例）。` +
    `接下来进入第 ${block_id + 1} 块（下标 ${IDX[block_id].start}~${IDX[block_id].start + BLOCK_SIZE - 1}）做顺序查找。`,
    FN,
    {
      block_id: block_id,
      low,
      high,
      索引比较次数: stepNum,
      [`块 ${block_id + 1} 范围`]: `[${IDX[block_id].start}, ${IDX[block_id].start + BLOCK_SIZE - 1}]`
    },
    {
      indexFound:  block_id,
      activeBlock: block_id
    },
    { phase: 'block', low, high, mid: '—', block_id, stepNum, result: -1 }
  ));

  // ── 第二步：块内顺序查找（与 sequential 相同逻辑） ──────
  let found_pos = -1;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const pos = IDX[block_id].start + i;
    stepNum++;
    const isMatch = ARRAY[pos] === KEY;

    steps.push(mkStep(
      'binary', `块内比较 a[${pos}]`,
      isMatch
        ? `🎉 查找成功！a[${pos}] = ${ARRAY[pos]} == key(${KEY}) → 位置 ${pos + 1}`
        : `a[${pos}] = ${ARRAY[pos]} ≠ key(${KEY}) → 继续`,
      isMatch
        ? `比较 a[${pos}] = ${ARRAY[pos]} 与 key = ${KEY}：相等！查找成功。` +
          `关键字 ${KEY} 位于顺序表第 ${pos + 1} 个位置（0-based 下标 ${pos}），` +
          `即第 ${block_id + 1} 块第 ${i + 1} 个元素。` +
          `总比较次数：索引折半 ${binaryStep - 1} 次 + 块内 ${i + 1} 次 = ${stepNum} 次。`
        : `比较 a[${pos}] = ${ARRAY[pos]} 与 key = ${KEY}：不相等，继续。` +
          `当前在第 ${block_id + 1} 块第 ${i + 1} 个位置，还剩 ${BLOCK_SIZE - i - 1} 个。`,
      FN,
      {
        key: KEY,
        [`a[${pos}]`]: ARRAY[pos],
        [`a[${pos}] == key?`]: isMatch ? '是 ✓' : '否',
        比较次数: stepNum,
        block_id
      },
      {
        arrayIndices: isMatch ? [] : [pos],
        foundIndex:   isMatch ? pos : -1,
        activeBlock:  block_id,
        indexFound:   block_id
      },
      { phase: 'block', low, high, block_id, pos, stepNum, result: isMatch ? pos + 1 : -1 }
    ));

    if (isMatch) { found_pos = pos; break; }
  }

  // ── Summary ─────────────────────────────────────────────
  steps.push(mkStep(
    'binary', '完成',
    found_pos >= 0
      ? `✅ 折半索引分块查找完成！关键字 ${KEY} 在位置 ${found_pos + 1}（1-based）`
      : `❌ 查找失败，关键字 ${KEY} 不在表中`,
    found_pos >= 0
      ? `折半索引分块查找成功结束。总比较次数 = ${stepNum}，包括：` +
        `索引折半 ${binaryStep - 1} 次 + 块内顺序 ${stepNum - (binaryStep - 1)} 次。` +
        `对比顺序索引查找（本例总计 9 次），折半索引仅用 ${stepNum} 次，节省了索引阶段的比较开销。` +
        `当 b 很大时（如 b=1000），折半索引优势更加显著（log₂1000 ≈ 10 vs 顺序最多 1000）。`
      : `查找失败。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `位置 ${found_pos + 1}` : '未找到',
      总比较次数: stepNum,
      索引折半次数: binaryStep - 1,
      块内顺序次数: stepNum - (binaryStep - 1)
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'done', block_id, pos: found_pos, stepNum, result: found_pos >= 0 ? found_pos + 1 : -1 }
  ));

  return steps;
}

// ============================================================
//  ALGORITHM 3:  linked_block_search
//  逻辑：顺序扫描索引 → 找块 → 遍历单链表查找
// ============================================================
function generateLinkedSteps() {
  const steps = [];
  const FN = 'linked_block_search';

  // ── Step 0: Intro ───────────────────────────────────────
  steps.push(mkStep(
    'linked', '初始化',
    '链式分块查找 — 算法开始',
    '链式分块查找将每个块内的元素改用单链表存储（尾插法保持块内原有顺序，' +
    '对应 C 代码 build_linked_blocks() 中的 tail = NULL; for(...) { p->next = NULL; tail->next = p; }）。' +
    '索引表中每项由 max_val 和指向链表头结点的指针 head 组成（C 中是 LinkedBlock 结构）。' +
    '查找时：第一步顺序扫描索引表确定块（与 sequential 相同）；' +
    '第二步沿链表指针 p = p->next 遍历，逐个比较结点的 data 域。' +
    '优点：支持块内元素的动态插入/删除，无需移动其他元素。' +
    '代价：每个结点需要额外的 next 指针，空间复杂度 O(n)。',
    FN,
    {
      key: KEY,
      n: 25,
      存储结构: '单链表（每块一条）',
      block_size: BLOCK_SIZE,
      num_blocks: NUM_BLOCKS
    },
    {},
    { phase: 'init', b: '—', llPos: '—', stepNum: 0, result: -1 }
  ));

  // ── 第一步：顺序扫描索引（与 sequential_index 相同逻辑）────
  let block_id = -1;
  let stepNum  = 0;

  for (let b = 0; b < NUM_BLOCKS; b++) {
    stepNum++;
    const found = KEY <= LINKED_BLOCKS[b].max_val;

    steps.push(mkStep(
      'linked', `索引扫描 b=${b}`,
      found
        ? `✓ 找到块！key(${KEY}) ≤ linked_blocks[${b}].max(${LINKED_BLOCKS[b].max_val}) → 第 ${b + 1} 块`
        : `key(${KEY}) > linked_blocks[${b}].max(${LINKED_BLOCKS[b].max_val}) → 继续`,
      found
        ? `比较 key = ${KEY} 与 linked_blocks[${b}].max_val = ${LINKED_BLOCKS[b].max_val}：` +
          `key ≤ max，关键字在第 ${b + 1} 块链表中。接下来获取该块链表的头指针 head，开始遍历。`
        : `比较 key = ${KEY} 与 linked_blocks[${b}].max_val = ${LINKED_BLOCKS[b].max_val}：` +
          `key > max，不在第 ${b + 1} 块，继续扫描下一项。`,
      FN,
      {
        key: KEY,
        b,
        [`linked_blocks[${b}].max_val`]: LINKED_BLOCKS[b].max_val,
        [`key <= max?`]: found ? '是 ✓' : '否',
        比较次数: stepNum
      },
      {
        indexRow:    found ? -1 : b,
        indexFound:  found ? b  : -1,
        activeBlock: found ? b  : -1
      },
      { phase: 'index', b, llPos: '—', stepNum, result: -1, block_id: found ? b : -1 }
    ));

    if (found) { block_id = b; break; }
  }

  // ── Announce linked list traversal ──────────────────────
  steps.push(mkStep(
    'linked', '进入链表遍历',
    `进入第 ${block_id + 1} 块链表，head → [${LINKED_BLOCKS[block_id].nodes[0]}] → ...`,
    `索引表确认关键字 ${KEY} 在第 ${block_id + 1} 块链表中。` +
    `C 代码：Node *p = linked_blocks[${block_id}].head; int pos = ${block_id} * BLOCK_SIZE + 1;` +
    `链表结构：HEAD → [${LINKED_BLOCKS[block_id].nodes.join('] → [')}] → NULL。` +
    `接下来逐个检查结点的 data 字段，p = p->next 向后遍历。`,
    FN,
    {
      block_id,
      head指向: `[${LINKED_BLOCKS[block_id].nodes[0]}]`,
      链表长度: LINKED_BLOCKS[block_id].nodes.length,
      起始逻辑位置: block_id * BLOCK_SIZE + 1
    },
    {
      indexFound:  block_id,
      activeBlock: block_id,
      llBlock:     block_id,
      llCurrentNode: 0
    },
    { phase: 'll', b: block_id, llPos: 0, stepNum, result: -1, block_id }
  ));

  // ── 第二步：遍历链表 ─────────────────────────────────────
  // C code:
  //   Node *p = linked_blocks[block_id].head;
  //   int pos = block_id * BLOCK_SIZE + 1;
  //   while (p) {
  //     if (p->data == key) { return pos; }
  //     p = p->next; pos++;
  //   }
  const blockNodes = LINKED_BLOCKS[block_id].nodes;
  let found_pos = -1;

  for (let nodeIdx = 0; nodeIdx < blockNodes.length; nodeIdx++) {
    const nodeVal = blockNodes[nodeIdx];
    const logicPos = block_id * BLOCK_SIZE + nodeIdx + 1; // 1-based logical position (matches C)
    stepNum++;
    const isMatch = nodeVal === KEY;

    steps.push(mkStep(
      'linked', `链表结点 [${nodeVal}]`,
      isMatch
        ? `🎉 查找成功！结点 [${nodeVal}] == key(${KEY}) → 逻辑位置 = ${logicPos}`
        : `结点 [${nodeVal}] ≠ key(${KEY}) → p = p->next`,
      isMatch
        ? `检查结点 p->data = ${nodeVal}，与 key = ${KEY} 相等！查找成功。` +
          `逻辑位置 pos = ${logicPos}，即第 ${block_id + 1} 块第 ${nodeIdx + 1} 个结点。` +
          `与数组存储相比，链表无法随机访问，但支持 O(1) 的结点插入/删除（只需修改指针）。`
        : `检查结点 p->data = ${nodeVal}，与 key = ${KEY} 不相等，执行 p = p->next，pos++ → pos = ${logicPos + 1}。` +
          (blockNodes[nodeIdx + 1] !== undefined
            ? `下一个结点值为 [${blockNodes[nodeIdx + 1]}]。`
            : '这是该块链表的最后一个结点，之后 p = NULL，查找失败。'),
      FN,
      {
        key: KEY,
        [`p->data`]: nodeVal,
        [`p->data == key?`]: isMatch ? '是 ✓' : '否',
        逻辑位置: logicPos,
        比较次数: stepNum
      },
      {
        indexFound:    block_id,
        activeBlock:   block_id,
        llBlock:       block_id,
        llCurrentNode: isMatch ? -1   : nodeIdx,
        llFoundNode:   isMatch ? nodeIdx : -1,
        // Also highlight corresponding array element
        arrayIndices:  isMatch ? []     : [IDX[block_id].start + nodeIdx],
        foundIndex:    isMatch ? IDX[block_id].start + nodeIdx : -1
      },
      { phase: 'll', b: block_id, llPos: nodeIdx, stepNum, result: isMatch ? logicPos : -1, block_id }
    ));

    if (isMatch) { found_pos = IDX[block_id].start + nodeIdx; break; }
  }

  // ── Summary ─────────────────────────────────────────────
  const logicFoundPos = found_pos >= 0 ? found_pos - block_id * BLOCK_SIZE + block_id * BLOCK_SIZE + 1 : -1;
  steps.push(mkStep(
    'linked', '完成',
    found_pos >= 0
      ? `✅ 链式分块查找完成！关键字 ${KEY} 在第 ${block_id + 1} 块第 ${found_pos - IDX[block_id].start + 1} 个结点`
      : `❌ 查找失败，关键字 ${KEY} 不在链表中`,
    found_pos >= 0
      ? `链式分块查找成功结束。总比较次数 = ${stepNum}（索引 ${block_id + 1} 次 + 链表遍历 ${stepNum - block_id - 1} 次）。` +
        `链式存储的主要优势：在块内任意位置插入/删除元素只需 O(1) 指针操作，不需要像顺序表那样移动元素；` +
        `代价是每个结点多占一个 next 指针的空间，且无法随机访问（只能顺序遍历）。` +
        `适合块内元素频繁动态变动的场景。`
      : `查找失败。遍历了全部索引和链表结点，未找到关键字 ${KEY}。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `逻辑位置 ${found_pos + 1}` : '未找到',
      总比较次数: stepNum,
      索引比较: block_id + 1,
      链表遍历: stepNum - block_id - 1,
      空间优劣: 'O(n) 链表结点'
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id,
      llBlock:     block_id,
      llFoundNode: found_pos >= 0 ? found_pos - IDX[block_id].start : -1
    },
    { phase: 'done', b: block_id, llPos: found_pos >= 0 ? found_pos - IDX[block_id].start : -1, stepNum, result: found_pos >= 0 ? found_pos + 1 : -1, block_id }
  ));

  return steps;
}

// ============================================================
//  APP STATE
// ============================================================
const APP = {
  allSteps: { sequential: [], binary: [], linked: [] },
  currentAlgo:  'sequential',
  currentIndex: 0,
  playTimer:    null,
  speed:        1100  // default playback interval (ms); matches "中速" option
};

// ============================================================
//  INIT
// ============================================================
function initApp() {
  // Generate all step sequences upfront; player only renders snapshots.
  APP.allSteps.sequential = generateSequentialSteps();
  APP.allSteps.binary     = generateBinarySteps();
  APP.allSteps.linked     = generateLinkedSteps();

  // Stamp stepIndex / totalSteps into every step object
  ['sequential', 'binary', 'linked'].forEach(algo => {
    const steps = APP.allSteps[algo];
    steps.forEach((s, i) => {
      // Steps are frozen, so we assign via Object.defineProperty trick — or we
      // just use a wrapper. Actually we reassigned after freeze which won't work.
      // Instead we make steps mutable objects (not frozen after stamping).
      s = APP.allSteps[algo][i] = Object.assign({}, s, {
        stepIndex:  i,
        totalSteps: steps.length
      });
    });
  });

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
  // Algorithm tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.algo === APP.currentAlgo) return;
      stopPlayback();
      APP.currentAlgo  = btn.dataset.algo;
      APP.currentIndex = 0;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateHeaderBadge();
      renderStep(currentStep());
      updateNavButtons();
    });
  });

  // Reset
  document.getElementById('btn-reset').addEventListener('click', () => {
    stopPlayback();
    APP.currentIndex = 0;
    renderStep(currentStep());
    updateNavButtons();
  });

  // Previous step
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (APP.currentIndex > 0) {
      APP.currentIndex--;
      renderStep(currentStep());
      updateNavButtons();
    }
  });

  // Next step
  document.getElementById('btn-next').addEventListener('click', () => {
    const last = APP.allSteps[APP.currentAlgo].length - 1;
    if (APP.currentIndex < last) {
      APP.currentIndex++;
      renderStep(currentStep());
      updateNavButtons();
    }
  });

  // Play / Pause
  document.getElementById('btn-play').addEventListener('click', () => {
    APP.playTimer ? stopPlayback() : startPlayback();
  });

  // Speed selector
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
  const names = {
    sequential: '顺序索引分块查找',
    binary:     '折半索引分块查找',
    linked:     '链式分块查找'
  };
  const briefs = {
    sequential: '索引表顺序查找 O(b) + 块内顺序查找 O(s)，总 O(b+s)',
    binary:     '索引表折半查找 O(log b) + 块内顺序查找 O(s)，总 O(log b + s)',
    linked:     '索引顺序查找 O(b) + 链表遍历 O(s)，支持 O(1) 块内动态插删'
  };
  document.getElementById('algo-badge').textContent = names[APP.currentAlgo];
  document.getElementById('algo-brief').textContent = briefs[APP.currentAlgo];
}

// ============================================================
//  RENDER STEP  (main dispatcher)
// ============================================================
function renderStep(step) {
  if (!step) return;

  // Update step explanation panel
  document.getElementById('step-counter').textContent =
    `步骤 ${step.stepIndex + 1} / ${step.totalSteps}`;
  document.getElementById('step-phase-tag').textContent = step.phase;
  document.getElementById('step-title').textContent       = step.title;
  document.getElementById('step-description').textContent = step.description;
  document.getElementById('step-function').textContent    = step.functionName + '()';

  renderVariables(step.variables);
  renderArrayVisual(step);
  renderIndexTable(step);
  renderAlgoState(step);
  updateNavButtons();
}

// ============================================================
//  RENDER: Variable chips
// ============================================================
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

// ============================================================
//  RENDER: Array visual  (25 elements in 5 colored block groups)
// ============================================================
function renderArrayVisual(step) {
  const container = document.getElementById('array-visual');
  container.innerHTML = '';

  const hl         = step.highlight;
  const hlSet      = new Set(hl.arrayIndices || []);
  const foundIdx   = hl.foundIndex;    // -1 or 0-based index
  const activeBlk  = hl.activeBlock;   // -1 or 0-based block

  // Build one row of block groups separated by small gaps
  const row = document.createElement('div');
  row.className = 'array-block-row';

  for (let b = 0; b < NUM_BLOCKS; b++) {
    // Block group container (label + cells)
    const group = document.createElement('div');
    group.className = `block-group block-color-${b}`;
    if (b === activeBlk) group.classList.add('block-active');

    // Block label (e.g., "第1块 max=14")
    const label = document.createElement('div');
    label.className = 'block-label';
    label.textContent = `第${b + 1}块  max=${IDX[b].max_val}`;
    group.appendChild(label);

    // Cells container
    const cellsDiv = document.createElement('div');
    cellsDiv.className = 'block-cells';

    for (let i = 0; i < BLOCK_SIZE; i++) {
      const arrIdx = b * BLOCK_SIZE + i;
      const val    = ARRAY[arrIdx];

      const elem = document.createElement('div');
      elem.className = 'array-element';

      // Determine highlight class
      if (foundIdx === arrIdx) {
        elem.classList.add('hl-found');
      } else if (hlSet.has(arrIdx)) {
        elem.classList.add('hl-current');
      }

      // Index label (0-based shown, but using 0-based internally)
      const idxDiv = document.createElement('div');
      idxDiv.className = 'elem-idx';
      idxDiv.textContent = arrIdx;  // 0-based index to match C array indexing

      // Value box
      const valDiv = document.createElement('div');
      valDiv.className = 'elem-val';
      valDiv.textContent = val;

      elem.appendChild(idxDiv);
      elem.appendChild(valDiv);
      cellsDiv.appendChild(elem);
    }

    group.appendChild(cellsDiv);
    row.appendChild(group);

    // Add small separator between blocks (except after last)
    if (b < NUM_BLOCKS - 1) {
      const sep = document.createElement('div');
      sep.className = 'block-separator';
      row.appendChild(sep);
    }
  }

  container.appendChild(row);
}

// ============================================================
//  RENDER: Index table  (5 rows: 块号, 最大关键字, 起始下标)
// ============================================================
function renderIndexTable(step) {
  const container = document.getElementById('index-table-visual');
  container.innerHTML = '';

  const hl         = step.highlight;
  const currentRow = hl.indexRow;       // orange: row being examined
  const foundRow   = hl.indexFound;     // green: confirmed block
  const midRow     = hl.indexMid;       // blue: mid in binary search
  const rangeLow   = hl.indexRangeLow;  // binary: current low
  const rangeHigh  = hl.indexRangeHigh; // binary: current high

  const wrap = document.createElement('div');
  wrap.className = 'index-table-wrap';

  const tbl = document.createElement('table');
  tbl.className = 'index-table';

  // Header
  const thead = tbl.createTHead();
  const hr    = thead.insertRow();
  ['块号', '最大关键字 (max_val)', '起始下标 (start)', '块内元素'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    hr.appendChild(th);
  });

  // Body
  const tbody = tbl.createTBody();
  for (let b = 0; b < NUM_BLOCKS; b++) {
    const tr = tbody.insertRow();

    // Apply highlight class
    if (b === foundRow && foundRow !== -1) {
      tr.classList.add('hl-index-found');
    } else if (b === midRow && midRow !== -1) {
      tr.classList.add('hl-index-mid');
    } else if (b === currentRow && currentRow !== -1) {
      tr.classList.add('hl-index-current');
    } else if (
      rangeLow !== -1 && rangeHigh !== -1 &&
      (b < rangeLow || b > rangeHigh)
    ) {
      tr.classList.add('hl-index-range');
    }

    // Cells
    [
      b + 1,                    // 块号 (1-based for display)
      IDX[b].max_val,           // max_val
      IDX[b].start,             // start (0-based)
      ARRAY.slice(IDX[b].start, IDX[b].start + BLOCK_SIZE).join(', ')
    ].forEach(val => {
      const td = tr.insertCell();
      td.textContent = val;
    });
  }

  wrap.appendChild(tbl);
  container.appendChild(wrap);
}

// ============================================================
//  RENDER: Algorithm state panel  (dispatches by algorithm)
// ============================================================
function renderAlgoState(step) {
  const el = document.getElementById('state-content');
  el.innerHTML = '';

  if (step.algorithm === 'sequential') {
    renderSequentialState(el, step);
  } else if (step.algorithm === 'binary') {
    renderBinaryState(el, step);
  } else {
    renderLinkedState(el, step);
  }
}

// ── Sequential state ──────────────────────────────────────
function renderSequentialState(el, step) {
  const s       = step.algoState || {};
  const phase   = s.phase   || 'init';
  const b       = s.b;
  const pos     = s.pos;
  const stepNum = s.stepNum || 0;
  const result  = s.result  || -1;

  const bActive     = (typeof b === 'number') ? ' active' : '';
  const posActive   = (typeof pos === 'number') ? ' active' : '';
  const doneActive  = (phase === 'done' && result > 0) ? ' done' : '';

  el.innerHTML = `
    <div class="phase-label-display">当前阶段：<span class="phase-badge">${escHtml(
      phase === 'init'  ? '初始化' :
      phase === 'index' ? '第一步：索引顺序扫描' :
      phase === 'block' ? '第二步：块内顺序查找' :
                          '完成'
    )}</span></div>
    <div class="state-vars-row">
      <div class="state-var">
        <span class="state-label">当前块索引<br>b（0-based）</span>
        <span class="state-value${bActive}">${typeof b === 'number' ? b : '—'}</span>
      </div>
      <div class="state-var">
        <span class="state-label">当前数组位置<br>pos（0-based）</span>
        <span class="state-value${posActive}">${typeof pos === 'number' ? pos : '—'}</span>
      </div>
      <div class="state-var">
        <span class="state-label">比较次数<br>stepNum</span>
        <span class="state-value${stepNum > 0 ? ' active' : ''}">${stepNum}</span>
      </div>
      <div class="state-var">
        <span class="state-label">结果位置<br>（1-based，-1=未找到）</span>
        <span class="state-value${doneActive}">${result > 0 ? result : result === 0 ? 0 : '—'}</span>
      </div>
    </div>
    ${result > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 在位置 ${result}（1-based），0-based 下标 ${result - 1}</div>`
      : phase === 'done'
        ? `<div class="result-summary result-failed">✗ 查找失败：关键字 ${KEY} 不在表中</div>`
        : ''}
    <div class="complexity-note" style="margin-top:8px">
      ⏱ 时间复杂度：O(b + s) = O(${NUM_BLOCKS} + ${BLOCK_SIZE}) = O(${NUM_BLOCKS + BLOCK_SIZE})&emsp;
      本例最多 ${NUM_BLOCKS + BLOCK_SIZE} 次比较
    </div>`;
}

// ── Binary state ──────────────────────────────────────────
function renderBinaryState(el, step) {
  const s       = step.algoState || {};
  const phase   = s.phase   || 'init';
  const low     = s.low;
  const high    = s.high;
  const mid     = s.mid;
  const blockId = s.block_id;
  const stepNum = s.stepNum || 0;
  const result  = s.result  || -1;

  el.innerHTML = `
    <div class="phase-label-display">当前阶段：<span class="phase-badge">${escHtml(
      phase === 'init'  ? '初始化' :
      phase === 'index' ? '第一步：索引折半查找' :
      phase === 'block' ? '第二步：块内顺序查找' :
                          '完成'
    )}</span></div>
    <div class="binary-range-display">
      <div class="range-item">
        <span class="range-label">low</span>
        <span class="range-value low-val">${typeof low === 'number' ? low : '—'}</span>
      </div>
      <div class="range-item">
        <span class="range-label">high</span>
        <span class="range-value high-val">${typeof high === 'number' ? high : '—'}</span>
      </div>
      <div class="range-item">
        <span class="range-label">mid</span>
        <span class="range-value mid-val">${typeof mid === 'number' ? mid : '—'}</span>
      </div>
      <div class="range-item">
        <span class="range-label">block_id</span>
        <span class="range-value block-val">${typeof blockId === 'number' && blockId >= 0 ? blockId : '—'}</span>
      </div>
      <div class="range-item">
        <span class="range-label">比较次数</span>
        <span class="range-value" style="background:#f5f5f5;color:#333;border-color:#ddd">${stepNum}</span>
      </div>
    </div>
    ${result > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 在位置 ${result}（1-based）</div>`
      : phase === 'done'
        ? `<div class="result-summary result-failed">✗ 查找失败</div>`
        : ''}
    <div class="complexity-note" style="margin-top:8px">
      ⏱ 时间复杂度：O(log b + s) = O(⌈log₂${NUM_BLOCKS}⌉ + ${BLOCK_SIZE}) = O(3 + 5) = O(8)&emsp;
      折半索引最多 3 次，块内最多 5 次
    </div>`;
}

// ── Linked state ──────────────────────────────────────────
function renderLinkedState(el, step) {
  const s        = step.algoState || {};
  const phase    = s.phase    || 'init';
  const b        = s.b;
  const llPos    = s.llPos;
  const blockId  = s.block_id;
  const stepNum  = s.stepNum  || 0;
  const result   = s.result   || -1;
  const hl       = step.highlight;

  // Render mini linked-list for the active block
  let llHtml = '';
  if (typeof blockId === 'number' && blockId >= 0) {
    const nodes = LINKED_BLOCKS[blockId].nodes;
    let nodeStr = '<span class="ll-head-label">HEAD</span><span class="ll-arrow">→</span>';
    nodes.forEach((val, ni) => {
      let cls = 'll-node';
      if (hl.llFoundNode === ni)   cls += ' hl-ll-found';
      else if (hl.llCurrentNode === ni) cls += ' hl-ll-current';
      nodeStr += `<div class="${cls}">
        <div class="ll-node-data">${val}</div>
        <div class="ll-node-ptr">*next</div>
      </div>`;
      nodeStr += '<span class="ll-arrow">→</span>';
    });
    nodeStr += '<span class="ll-null">NULL</span>';
    llHtml = `
      <div style="margin-bottom:8px;font-size:0.78rem;color:#555;font-weight:600">
        第 ${blockId + 1} 块链表（max_val = ${LINKED_BLOCKS[blockId].max_val}）：
      </div>
      <div class="linked-list-visual">${nodeStr}</div>`;
  }

  el.innerHTML = `
    <div class="phase-label-display">当前阶段：<span class="phase-badge">${escHtml(
      phase === 'init'  ? '初始化' :
      phase === 'index' ? '第一步：索引顺序扫描' :
      phase === 'll'    ? '第二步：链表遍历查找' :
                          '完成'
    )}</span></div>
    <div class="state-vars-row">
      <div class="state-var">
        <span class="state-label">当前块索引<br>block_id（0-based）</span>
        <span class="state-value${typeof blockId === 'number' && blockId >= 0 ? ' active' : ''}">
          ${typeof blockId === 'number' && blockId >= 0 ? blockId : '—'}
        </span>
      </div>
      <div class="state-var">
        <span class="state-label">链表指针位置<br>（块内第几个结点）</span>
        <span class="state-value${typeof llPos === 'number' ? ' active' : ''}">
          ${typeof llPos === 'number' ? llPos : '—'}
        </span>
      </div>
      <div class="state-var">
        <span class="state-label">比较次数<br>stepNum</span>
        <span class="state-value${stepNum > 0 ? ' active' : ''}">${stepNum}</span>
      </div>
    </div>
    ${llHtml}
    ${result > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 逻辑位置 ${result}（1-based）</div>`
      : phase === 'done'
        ? `<div class="result-summary result-failed">✗ 查找失败</div>`
        : ''}
    <div class="complexity-note" style="margin-top:8px">
      ⏱ 时间复杂度：O(b + s) = O(${NUM_BLOCKS} + ${BLOCK_SIZE})&emsp;
      额外空间：O(n) = O(${ARRAY.length}) 个链表结点（每个结点含 data + *next）
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
