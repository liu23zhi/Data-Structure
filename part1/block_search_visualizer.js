'use strict';

// ============================================================
//  DEFAULT DATA  —  EXACTLY matches part1/block_search.c
// ============================================================

const DEFAULT_ARRAY = [
  8, 14,  6,  9, 10,
 22, 34, 18, 19, 31,
 40, 38, 54, 66, 46,
 71, 78, 68, 80, 85,
100, 94, 88, 96, 87
];
const DEFAULT_BLOCK_SIZE = 5;
const DEFAULT_NUM_BLOCKS = 5;
const DEFAULT_KEY        = 46;

let ARRAY      = [...DEFAULT_ARRAY];
let BLOCK_SIZE = DEFAULT_BLOCK_SIZE;
let NUM_BLOCKS = DEFAULT_NUM_BLOCKS;
let KEY        = DEFAULT_KEY;

let IDX          = [];
let LINKED_BLOCKS = [];

function rebuildDerived() {
  IDX.length = 0;
  for (let b = 0; b < NUM_BLOCKS; b++) {
    const start = b * BLOCK_SIZE;
    let max = ARRAY[start];
    for (let i = start + 1; i < start + BLOCK_SIZE; i++) {
      if (ARRAY[i] > max) max = ARRAY[i];
    }
    IDX.push({ max_val: max, start });
  }
  LINKED_BLOCKS.length = 0;
  for (let b = 0; b < NUM_BLOCKS; b++) {
    const nodes = [];
    for (let i = b * BLOCK_SIZE; i < (b + 1) * BLOCK_SIZE; i++) {
      nodes.push(ARRAY[i]);
    }
    LINKED_BLOCKS.push({ max_val: IDX[b].max_val, nodes, size: BLOCK_SIZE });
  }
}
rebuildDerived();

// ============================================================
//  SEARCH RESULT STRUCT  —  matches C's SearchResult
// ============================================================
class SearchResult {
  constructor() {
    this.position = -1;       // 1-based position, -1 = not found
    this.index_compares = 0;  // number of comparisons in index table
    this.block_compares = 0;  // number of comparisons in block
    this.total_compares = 0;  // total comparisons
  }
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
 * @param {SearchResult} searchResult - current search result (matches C)
 */
function mkStep(algorithm, phase, title, desc, fn, variables, highlight, algoState, searchResult) {
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
    searchResult: searchResult ? Object.assign({}, searchResult) : new SearchResult(),
    stepIndex:  0,  // will be stamped by initApp()
    totalSteps: 0   // will be stamped by initApp()
  });
}

// ============================================================
//  ALGORITHM 1:  block_search_sequential_index
//  Logic: EXACTLY matches C code
// ============================================================
function generateSequentialSteps() {
  const steps = [];
  const FN = 'block_search_sequential_index';
  const result = new SearchResult();

  // ── Step 0: Initialisation ──────────────────────────────
  steps.push(mkStep(
    'sequential', '初始化',
    '顺序索引分块查找 — 算法开始',
    '分块查找（索引顺序查找）是一种介于顺序查找和折半查找之间的查找方法。' +
    '基本思路：先建立索引表（每项记录各块的最大关键字和起始下标），' +
    '查找时第一步在索引表中顺序扫描，找到关键字可能所在的块；' +
    '第二步在该块内做顺序查找。本例：顺序表共 25 个元素，分为 5 块，每块 5 个元素，查找关键字 key = ' + KEY + '。',
    FN,
    { key: KEY, n: 25, block_size: BLOCK_SIZE, num_blocks: NUM_BLOCKS },
    {},
    { phase: 'init', b: '—', pos: '—', stepNum: 0 },
    result
  ));

  // ── 第一步：在索引表中顺序查找 ──────────────────────────
  // EXACT C code: for (int b = 0; b < NUM_BLOCKS; b++) { if (key <= idx[b].max_val) ... }
  let block_id = -1;

  for (let b = 0; b < NUM_BLOCKS; b++) {
    result.index_compares++;
    result.total_compares = result.index_compares + result.block_compares;
    
    const found = KEY <= IDX[b].max_val;

    steps.push(mkStep(
      'sequential', `索引扫描 b=${b}`,
      found
        ? `✓ 索引命中！key(${KEY}) ≤ idx[${b}].max(${IDX[b].max_val}) → 关键字在第 ${b + 1} 块`
        : `key(${KEY}) > idx[${b}].max(${IDX[b].max_val}) → 继续向后`,
      found
        ? `比较第 ${b + 1} 项索引：key = ${KEY} ≤ idx[${b}].max_val = ${IDX[b].max_val}，条件成立。` +
          `关键字 ${KEY} 的最大可能所在块确定为第 ${b + 1} 块（数组下标 ${IDX[b].start + 1}~${IDX[b].start + BLOCK_SIZE}）。` +
          `退出索引查找循环，准备进入块内顺序查找。`
        : `比较第 ${b + 1} 项索引：key = ${KEY} > idx[${b}].max_val = ${IDX[b].max_val}，条件不成立。` +
          `关键字不在第 ${b + 1} 块（该块最大元素为 ${IDX[b].max_val}，比 ${KEY} 小），继续扫描下一项。`,
      FN,
      {
        key: KEY,
        b: b,
        [`idx[${b}].max_val`]: IDX[b].max_val,
        [`key <= idx[${b}].max?`]: found ? '是 ✓' : '否',
        索引比较次数: result.index_compares,
        总比较次数: result.total_compares
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
        block_id: found ? b : -1
      },
      result
    ));

    if (found) { block_id = b; break; }
  }

  if (block_id === -1) {
    steps.push(mkStep(
      'sequential', '完成',
      `❌ 查找失败，关键字 ${KEY} 不在表中`,
      `未找到对应块，查找失败。遍历了全部索引表，共 ${result.index_compares} 次比较。`,
      FN,
      {
        key: KEY,
        结果: '未找到',
        索引比较次数: result.index_compares,
        块内比较次数: result.block_compares,
        总比较次数: result.total_compares
      },
      {},
      { phase: 'done', b: '—', pos: '—', result: -1 },
      result
    ));
    return steps;
  }

  // ── Announce entering block ─────────────────────────────
  steps.push(mkStep(
    'sequential', '进入块内查找',
    `进入第 ${block_id + 1} 块，准备顺序查找（下标 ${IDX[block_id].start + 1}~${IDX[block_id].start + BLOCK_SIZE}）`,
    `索引表确定关键字 ${KEY} 在第 ${block_id + 1} 块内（idx[${block_id}].start = ${IDX[block_id].start}，` +
    `块大小 = ${BLOCK_SIZE}，元素范围：下标 ${IDX[block_id].start + 1} 到 ${IDX[block_id].start + BLOCK_SIZE}）。` +
    `块内元素为 [${ARRAY.slice(IDX[block_id].start, IDX[block_id].start + BLOCK_SIZE).join(', ')}]。` +
    `接下来对这 ${BLOCK_SIZE} 个元素逐一比较，时间复杂度 O(s) = O(${BLOCK_SIZE})。`,
    FN,
    {
      block_id: block_id,
      [`块 ${block_id + 1} 起始下标`]: IDX[block_id].start + 1,
      [`块 ${block_id + 1} 元素`]: `[${ARRAY.slice(IDX[block_id].start, IDX[block_id].start + BLOCK_SIZE).join(',')}]`
    },
    {
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'block', b: block_id, pos: IDX[block_id].start, block_id },
    result
  ));

  // ── 第二步：块内顺序查找 ────────────────────────────────
  // EXACT C code: for (int i = 0; i < BLOCK_SIZE; i++) { pos = idx[block_id].start + i; if (a[pos] == key) ... }
  let found_pos = -1;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const pos = IDX[block_id].start + i;
    result.block_compares++;
    result.total_compares = result.index_compares + result.block_compares;
    
    const isMatch = ARRAY[pos] === KEY;

    steps.push(mkStep(
      'sequential', `块内比较 a[${pos + 1}]`,
      isMatch
        ? `🎉 查找成功！a[${pos + 1}] = ${ARRAY[pos]} == key(${KEY}) → 找到，位置 = ${pos + 1}（1-based）`
        : `a[${pos + 1}] = ${ARRAY[pos]} ≠ key(${KEY}) → 继续`,
      isMatch
        ? `比较 a[${pos + 1}] = ${ARRAY[pos]} 与 key = ${KEY}：相等！查找成功。` +
          `关键字 ${KEY} 位于顺序表第 ${pos + 1} 个位置（0-based 下标 ${pos}），` +
          `即第 ${block_id + 1} 块第 ${i + 1} 个元素。总比较次数 = ${result.total_compares}（索引 ${result.index_compares} 次 + 块内 ${result.block_compares} 次）。`
        : `比较 a[${pos + 1}] = ${ARRAY[pos]} 与 key = ${KEY}：不相等，继续检查下一个元素。` +
          `当前在第 ${block_id + 1} 块第 ${i + 1} 个位置，还有 ${BLOCK_SIZE - i - 1} 个元素待检查。`,
      FN,
      {
        key: KEY,
        [`a[${pos + 1}]`]: ARRAY[pos],
        [`a[${pos + 1}] == key?`]: isMatch ? '是 ✓' : '否',
        块内比较次数: result.block_compares,
        总比较次数: result.total_compares,
        block_id: block_id,
        pos: pos + 1
      },
      {
        arrayIndices: isMatch ? [] : [pos],
        foundIndex:   isMatch ? pos : -1,
        activeBlock:  block_id,
        indexFound:   block_id
      },
      { phase: 'block', b: block_id, pos: pos + 1, result: isMatch ? pos + 1 : -1, block_id },
      result
    ));

    if (isMatch) { 
      found_pos = pos; 
      result.position = pos + 1;
      break; 
    }
  }

  // ── Summary ─────────────────────────────────────────────
  steps.push(mkStep(
    'sequential', '完成',
    found_pos >= 0
      ? `✅ 顺序索引分块查找完成！关键字 ${KEY} 在位置 ${found_pos + 1}（1-based）`
      : `❌ 查找失败，关键字 ${KEY} 不在表中`,
    found_pos >= 0
      ? `顺序索引分块查找成功结束。总比较次数 = ${result.total_compares}，包括：` +
        `索引查找 ${result.index_compares} 次 + 块内查找 ${result.block_compares} 次。` +
        `理论最优：b=5，s=5 时，顺序分块平均比较次数 ≈ (b+1)/2 + (s+1)/2 = 3 + 3 = 6 次。` +
        `本次实际用了 ${result.total_compares} 次，因为目标元素在第 ${block_id + 1} 块的最后一个位置。`
      : `查找失败。遍历了全部索引表和对应块，均未找到关键字 ${KEY}。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `位置 ${found_pos + 1}` : '未找到',
      总比较次数: result.total_compares,
      索引比较次数: result.index_compares,
      块内比较次数: result.block_compares
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'done', b: block_id, pos: found_pos + 1, result: found_pos >= 0 ? found_pos + 1 : -1, block_id },
    result
  ));

  return steps;
}

// ============================================================
//  ALGORITHM 2:  block_search_binary_index
//  Logic: EXACTLY matches C code
// ============================================================
function generateBinarySteps() {
  const steps = [];
  const FN = 'block_search_binary_index';
  const result = new SearchResult();

  // ── Step 0: Initialisation ──────────────────────────────
  steps.push(mkStep(
    'binary', '初始化',
    '折半索引分块查找 — 算法开始',
    '折半索引分块查找改进了第一阶段：使用折半查找（二分查找）在索引表中定位块，' +
    '将第一阶段时间复杂度从 O(b) 降为 O(log b)，第二阶段仍使用块内顺序查找 O(s)。' +
    '总时间复杂度 O(log b + s)。本例：b = 5，⌈log₂5⌉ = 3，s = 5，最多 8 次比较。' +
    '当 b 较大时，折半索引优势明显。key = ' + KEY + '，索引表共 5 项。',
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
    { phase: 'init', low: 0, high: NUM_BLOCKS - 1, mid: '—', block_id: -1 },
    result
  ));

  // ── 第一步：折半查找索引表 ──────────────────────────────
  // EXACT C code:
  //   int low = 0, high = NUM_BLOCKS - 1, block_id = -1;
  //   while (low <= high) {
  //     int mid = (low + high) / 2;
  //     if (key == idx[mid].max_val)      { block_id = mid; break; }
  //     else if (key < idx[mid].max_val)  { high = mid - 1; block_id = mid; }
  //     else                              { low = mid + 1; }
  //   }
  let low = 0, high = NUM_BLOCKS - 1, block_id = -1;
  let binaryStep = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    result.index_compares++;
    result.total_compares = result.index_compares + result.block_compares;

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
        索引比较次数: result.index_compares,
        总比较次数: result.total_compares
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
        block_id: newBlockId
      },
      result
    ));

    low      = newLow;
    high     = newHigh;
    block_id = newBlockId;
    binaryStep++;

    if (direction === 'equal') break;
  }

  // EXACT C code: if (block_id == -1) { if (low < NUM_BLOCKS) { block_id = low; } else { ... } }
  if (block_id === -1) {
    if (low < NUM_BLOCKS) {
      block_id = low;
    } else {
      steps.push(mkStep(
        'binary', '完成',
        `❌ 查找失败，关键字 ${KEY} 不在表中`,
        `超出索引范围，查找失败。折半查找共 ${result.index_compares} 次比较。`,
        FN,
        {
          key: KEY,
          结果: '未找到',
          索引比较次数: result.index_compares,
          块内比较次数: result.block_compares,
          总比较次数: result.total_compares
        },
        {},
        { phase: 'done', low, high, mid: '—', result: -1 },
        result
      ));
      return steps;
    }
  }

  // ── Announce block identified ────────────────────────────
  steps.push(mkStep(
    'binary', '确认目标块',
    `折半查找结束 — 确定关键字可能在第 ${block_id + 1} 块`,
    `折半查找循环结束（low=${low} > high=${high}）。根据 C 代码逻辑，` +
    `block_id = ${block_id}（第 ${block_id + 1} 块）。` +
    `索引折半查找共做了 ${result.index_compares} 次比较，远少于顺序扫描的最多 5 次（本例）。` +
    `接下来进入第 ${block_id + 1} 块（下标 ${IDX[block_id].start + 1}~${IDX[block_id].start + BLOCK_SIZE}）做顺序查找。`,
    FN,
    {
      block_id: block_id,
      low,
      high,
      索引比较次数: result.index_compares,
      [`块 ${block_id + 1} 范围`]: `[${IDX[block_id].start + 1}, ${IDX[block_id].start + BLOCK_SIZE}]`
    },
    {
      indexFound:  block_id,
      activeBlock: block_id
    },
    { phase: 'block', low, high, mid: '—', block_id },
    result
  ));

  // ── 第二步：块内顺序查找（与 sequential 相同逻辑） ──────
  let found_pos = -1;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const pos = IDX[block_id].start + i;
    result.block_compares++;
    result.total_compares = result.index_compares + result.block_compares;
    
    const isMatch = ARRAY[pos] === KEY;

    steps.push(mkStep(
      'binary', `块内比较 a[${pos + 1}]`,
      isMatch
        ? `🎉 查找成功！a[${pos + 1}] = ${ARRAY[pos]} == key(${KEY}) → 位置 ${pos + 1}`
        : `a[${pos + 1}] = ${ARRAY[pos]} ≠ key(${KEY}) → 继续`,
      isMatch
        ? `比较 a[${pos + 1}] = ${ARRAY[pos]} 与 key = ${KEY}：相等！查找成功。` +
          `关键字 ${KEY} 位于顺序表第 ${pos + 1} 个位置（0-based 下标 ${pos}），` +
          `即第 ${block_id + 1} 块第 ${i + 1} 个元素。` +
          `总比较次数：索引折半 ${result.index_compares} 次 + 块内顺序 ${result.block_compares} 次 = ${result.total_compares} 次。`
        : `比较 a[${pos + 1}] = ${ARRAY[pos]} 与 key = ${KEY}：不相等，继续。` +
          `当前在第 ${block_id + 1} 块第 ${i + 1} 个位置，还剩 ${BLOCK_SIZE - i - 1} 个。`,
      FN,
      {
        key: KEY,
        [`a[${pos + 1}]`]: ARRAY[pos],
        [`a[${pos + 1}] == key?`]: isMatch ? '是 ✓' : '否',
        块内比较次数: result.block_compares,
        总比较次数: result.total_compares,
        block_id
      },
      {
        arrayIndices: isMatch ? [] : [pos],
        foundIndex:   isMatch ? pos : -1,
        activeBlock:  block_id,
        indexFound:   block_id
      },
      { phase: 'block', low, high, block_id, pos: pos + 1, result: isMatch ? pos + 1 : -1 },
      result
    ));

    if (isMatch) { 
      found_pos = pos; 
      result.position = pos + 1;
      break; 
    }
  }

  // ── Summary ─────────────────────────────────────────────
  steps.push(mkStep(
    'binary', '完成',
    found_pos >= 0
      ? `✅ 折半索引分块查找完成！关键字 ${KEY} 在位置 ${found_pos + 1}（1-based）`
      : `❌ 查找失败，关键字 ${KEY} 不在表中`,
    found_pos >= 0
      ? `折半索引分块查找成功结束。总比较次数 = ${result.total_compares}，包括：` +
        `索引折半 ${result.index_compares} 次 + 块内顺序 ${result.block_compares} 次。` +
        `对比顺序索引查找（本例总计 9 次），折半索引仅用 ${result.total_compares} 次，节省了索引阶段的比较开销。` +
        `当 b 很大时（如 b=1000），折半索引优势更加显著（log₂1000 ≈ 10 vs 顺序最多 1000）。`
      : `查找失败。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `位置 ${found_pos + 1}` : '未找到',
      总比较次数: result.total_compares,
      索引折半次数: result.index_compares,
      块内顺序次数: result.block_compares
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id
    },
    { phase: 'done', block_id, pos: found_pos + 1, result: found_pos >= 0 ? found_pos + 1 : -1 },
    result
  ));

  return steps;
}

// ============================================================
//  ALGORITHM 3:  linked_block_search
//  Logic: EXACTLY matches C code
// ============================================================
function generateLinkedSteps() {
  const steps = [];
  const FN = 'linked_block_search';
  const result = new SearchResult();

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
    { phase: 'init', b: '—', llPos: '—' },
    result
  ));

  // ── 第一步：顺序扫描索引（与 sequential_index 相同逻辑）────
  let block_id = -1;

  for (let b = 0; b < NUM_BLOCKS; b++) {
    result.index_compares++;
    result.total_compares = result.index_compares + result.block_compares;
    
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
        索引比较次数: result.index_compares,
        总比较次数: result.total_compares
      },
      {
        indexRow:    found ? -1 : b,
        indexFound:  found ? b  : -1,
        activeBlock: found ? b  : -1
      },
      { phase: 'index', b, llPos: '—', block_id: found ? b : -1 },
      result
    ));

    if (found) { block_id = b; break; }
  }

  if (block_id === -1) {
    steps.push(mkStep(
      'linked', '完成',
      `❌ 查找失败，关键字 ${KEY} 不在表中`,
      `未找到对应块，查找失败。遍历了全部索引表，共 ${result.index_compares} 次比较。`,
      FN,
      {
        key: KEY,
        结果: '未找到',
        索引比较次数: result.index_compares,
        块内比较次数: result.block_compares,
        总比较次数: result.total_compares
      },
      {},
      { phase: 'done', b: '—', llPos: '—', result: -1 },
      result
    ));
    return steps;
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
      链表长度: LINKED_BLOCKS[block_id].size,
      起始逻辑位置: block_id * BLOCK_SIZE + 1
    },
    {
      indexFound:  block_id,
      activeBlock: block_id,
      llBlock:     block_id,
      llCurrentNode: 0
    },
    { phase: 'll', b: block_id, llPos: 0, block_id },
    result
  ));

  // ── 第二步：遍历链表 ─────────────────────────────────────
  // EXACT C code:
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
    result.block_compares++;
    result.total_compares = result.index_compares + result.block_compares;
    
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
        块内比较次数: result.block_compares,
        总比较次数: result.total_compares
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
      { phase: 'll', b: block_id, llPos: nodeIdx, result: isMatch ? logicPos : -1, block_id },
      result
    ));

    if (isMatch) { 
      found_pos = IDX[block_id].start + nodeIdx; 
      result.position = logicPos;
      break; 
    }
  }

  // ── Summary ─────────────────────────────────────────────
  const logicFoundPos = found_pos >= 0 ? found_pos + 1 : -1;
  steps.push(mkStep(
    'linked', '完成',
    found_pos >= 0
      ? `✅ 链式分块查找完成！关键字 ${KEY} 在第 ${block_id + 1} 块第 ${found_pos - IDX[block_id].start + 1} 个结点`
      : `❌ 查找失败，关键字 ${KEY} 不在链表中`,
    found_pos >= 0
      ? `链式分块查找成功结束。总比较次数 = ${result.total_compares}（索引 ${result.index_compares} 次 + 链表遍历 ${result.block_compares} 次）。` +
        `链式存储的主要优势：在块内任意位置插入/删除元素只需 O(1) 指针操作，不需要像顺序表那样移动元素；` +
        `代价是每个结点多占一个 next 指针的空间，且无法随机访问（只能顺序遍历）。` +
        `适合块内元素频繁动态变动的场景。`
      : `查找失败。遍历了全部索引和链表结点，未找到关键字 ${KEY}。`,
    FN,
    {
      key: KEY,
      结果: found_pos >= 0 ? `逻辑位置 ${found_pos + 1}` : '未找到',
      总比较次数: result.total_compares,
      索引比较: result.index_compares,
      链表遍历: result.block_compares,
      空间优劣: 'O(n) 链表结点'
    },
    {
      foundIndex:  found_pos,
      activeBlock: block_id,
      indexFound:  block_id,
      llBlock:     block_id,
      llFoundNode: found_pos >= 0 ? found_pos - IDX[block_id].start : -1
    },
    { phase: 'done', b: block_id, llPos: found_pos >= 0 ? found_pos - IDX[block_id].start : -1, result: found_pos >= 0 ? found_pos + 1 : -1, block_id },
    result
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
      // Overwrite each step with a new object that includes the stamped fields.
      // Object.assign creates a fresh copy so the original (partially frozen) object
      // is not mutated, and stepIndex/totalSteps are cleanly added.
      s = APP.allSteps[algo][i] = Object.assign({}, s, {
        stepIndex:  i,
        totalSteps: steps.length
      });
    });
  });

  setupEventListeners();
  setupDataSourceHandlers();
  setupFileIOHandlers();
  updateHeaderInfo();
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

      // Index label (1-based to match C output)
      const idxDiv = document.createElement('div');
      idxDiv.className = 'elem-idx';
      idxDiv.textContent = arrIdx + 1;  // 1-based index to match C output

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
      IDX[b].start + 1,         // start (1-based to match C output)
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
  const result  = step.searchResult || new SearchResult();

  const bActive     = (typeof b === 'number') ? ' active' : '';
  const posActive   = (typeof pos === 'number') ? ' active' : '';
  const doneActive  = (phase === 'done' && result.position > 0) ? ' done' : '';

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
        <span class="state-label">当前数组位置<br>pos（1-based）</span>
        <span class="state-value${posActive}">${typeof pos === 'number' ? pos : '—'}</span>
      </div>
      <div class="state-var">
        <span class="state-label">索引比较次数<br>index_compares</span>
        <span class="state-value${result.index_compares > 0 ? ' active' : ''}">${result.index_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">块内比较次数<br>block_compares</span>
        <span class="state-value${result.block_compares > 0 ? ' active' : ''}">${result.block_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">总比较次数<br>total_compares</span>
        <span class="state-value${result.total_compares > 0 ? ' active' : ''}">${result.total_compares}</span>
      </div>
    </div>
    ${result.position > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 在位置 ${result.position}（1-based），0-based 下标 ${result.position - 1}</div>`
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
  const result  = step.searchResult || new SearchResult();

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
    </div>
    <div class="state-vars-row" style="margin-top:10px">
      <div class="state-var">
        <span class="state-label">索引比较次数<br>index_compares</span>
        <span class="state-value${result.index_compares > 0 ? ' active' : ''}">${result.index_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">块内比较次数<br>block_compares</span>
        <span class="state-value${result.block_compares > 0 ? ' active' : ''}">${result.block_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">总比较次数<br>total_compares</span>
        <span class="state-value${result.total_compares > 0 ? ' active' : ''}">${result.total_compares}</span>
      </div>
    </div>
    ${result.position > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 在位置 ${result.position}（1-based）</div>`
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
  const result   = step.searchResult || new SearchResult();
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
        <span class="state-label">索引比较次数<br>index_compares</span>
        <span class="state-value${result.index_compares > 0 ? ' active' : ''}">${result.index_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">块内比较次数<br>block_compares</span>
        <span class="state-value${result.block_compares > 0 ? ' active' : ''}">${result.block_compares}</span>
      </div>
      <div class="state-var">
        <span class="state-label">总比较次数<br>total_compares</span>
        <span class="state-value${result.total_compares > 0 ? ' active' : ''}">${result.total_compares}</span>
      </div>
    </div>
    ${llHtml}
    ${result.position > 0
      ? `<div class="result-summary">✓ 查找成功：关键字 ${KEY} 逻辑位置 ${result.position}（1-based）</div>`
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
//  REBUILD APP  (called after data changes)
// ============================================================
function rebuildApp() {
  rebuildDerived();
  APP.allSteps.sequential = generateSequentialSteps();
  APP.allSteps.binary     = generateBinarySteps();
  APP.allSteps.linked     = generateLinkedSteps();

  ['sequential', 'binary', 'linked'].forEach(algo => {
    const steps = APP.allSteps[algo];
    steps.forEach((s, i) => {
      APP.allSteps[algo][i] = Object.assign({}, s, { stepIndex: i, totalSteps: steps.length });
    });
  });

  stopPlayback();
  APP.currentIndex = 0;
  updateHeaderInfo();
  renderStep(currentStep());
  updateNavButtons();
}

function updateHeaderInfo() {
  const subtitle = document.querySelector('.header-subtitle');
  if (subtitle) {
    subtitle.textContent =
      `part1/block_search.c 教学演示 · ${ARRAY.length}个元素，${NUM_BLOCKS}块，每块${BLOCK_SIZE}个，查找关键字 ${KEY}`;
  }
  const arrayTitle = document.getElementById('panel-title-array');
  if (arrayTitle) {
    arrayTitle.textContent = `顺序表（${ARRAY.length}个元素，${NUM_BLOCKS}块，每块${BLOCK_SIZE}个）`;
  }
  const indexTitle = document.getElementById('panel-title-index');
  if (indexTitle) {
    indexTitle.textContent = `索引表（${NUM_BLOCKS}项）`;
  }
}

// ============================================================
//  DATA SOURCE HANDLERS
// ============================================================
function setupDataSourceHandlers() {
  document.querySelectorAll('input[name="data-source"]').forEach(radio => {
    radio.addEventListener('change', e => {
      document.getElementById('manual-input-panel').classList.toggle('hidden', e.target.value !== 'manual');
      document.getElementById('random-input-panel').classList.toggle('hidden', e.target.value !== 'random');
      if (e.target.value === 'default') {
        ARRAY      = [...DEFAULT_ARRAY];
        BLOCK_SIZE = DEFAULT_BLOCK_SIZE;
        NUM_BLOCKS = DEFAULT_NUM_BLOCKS;
        KEY        = DEFAULT_KEY;
        rebuildApp();
      }
    });
  });

  document.getElementById('btn-apply-manual').addEventListener('click', () => {
    const bs = Math.min(10, Math.max(2, parseInt(document.getElementById('manual-block-size').value) || 5));
    const nb = Math.min(10, Math.max(2, parseInt(document.getElementById('manual-num-blocks').value) || 5));
    const k  = parseInt(document.getElementById('manual-key').value) || 0;
    const raw = document.getElementById('manual-array-input').value;
    const vals = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    const needed = bs * nb;
    if (vals.length < needed) {
      alert(`需要 ${needed} 个整数（当前仅 ${vals.length} 个）`);
      return;
    }
    ARRAY      = vals.slice(0, needed);
    BLOCK_SIZE = bs;
    NUM_BLOCKS = nb;
    KEY        = k;
    rebuildApp();
  });

  document.getElementById('btn-generate-random').addEventListener('click', () => {
    const bs = Math.min(10, Math.max(2, parseInt(document.getElementById('random-block-size').value) || 5));
    const nb = Math.min(10, Math.max(2, parseInt(document.getElementById('random-num-blocks').value) || 5));
    ARRAY      = generateSortedBlockArray(bs, nb);
    BLOCK_SIZE = bs;
    NUM_BLOCKS = nb;
    KEY        = ARRAY[Math.floor(Math.random() * ARRAY.length)];
    document.getElementById('random-key-display').textContent = `查找键：${KEY}`;
    rebuildApp();
  });
}

function generateSortedBlockArray(blockSize, numBlocks) {
  const arr = [];
  const gap = 15;
  for (let b = 0; b < numBlocks; b++) {
    const base = b * gap;
    for (let i = 0; i < blockSize; i++) {
      arr.push(base + Math.floor(Math.random() * gap) + 1);
    }
  }
  return arr;
}

// ============================================================
//  FILE I/O HANDLERS
// ============================================================
function setupFileIOHandlers() {
  let parsedKeys = null;

  document.getElementById('file-input-p1').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      document.getElementById('input-display-p1').value = text;
      parsedKeys = parseInputFile(text);
      document.getElementById('btn-apply-file-p1').disabled = !parsedKeys;
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-apply-file-p1').addEventListener('click', () => {
    if (!parsedKeys) return;
    const output = runSearchKeys(parsedKeys);
    document.getElementById('output-display-p1').value = output;
    document.getElementById('btn-download-output-p1').disabled = false;
    document._part1OutputText = output;
  });

  document.getElementById('btn-generate-output-p1').addEventListener('click', () => {
    const output = generateOutputText();
    document.getElementById('output-display-p1').value = output;
    document.getElementById('btn-download-output-p1').disabled = false;
    document._part1OutputText = output;
  });

  document.getElementById('btn-download-output-p1').addEventListener('click', () => {
    const text = document._part1OutputText || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'part1-output.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function parseInputFile(text) {
  const lines = text.trim().split(/\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 1) return null;
  const n = parseInt(lines[0]);
  if (!n || n < 1) return null;
  const keys = [];
  for (let i = 1; i <= n && i < lines.length; i++) {
    const k = parseInt(lines[i]);
    if (!isNaN(k)) keys.push(k);
  }
  return keys.length > 0 ? keys : null;
}

function runSearchKeys(keys) {
  let out = '========================================\n';
  out += '分块查找 — 批量查找结果\n';
  out += `顺序表：${ARRAY.length} 个元素，${NUM_BLOCKS} 块，每块 ${BLOCK_SIZE} 个\n`;
  out += '========================================\n\n';
  keys.forEach(k => {
    out += `查找关键字 ${k}：\n`;
    let result = sequentialSearchKey(k);
    out += `  顺序索引分块查找：${result >= 0 ? `找到，位置 ${result + 1}` : '未找到'}\n`;
    result = binarySearchKey(k);
    out += `  折半索引分块查找：${result >= 0 ? `找到，位置 ${result + 1}` : '未找到'}\n`;
    out += '\n';
  });
  return out;
}

function sequentialSearchKey(key) {
  let blockId = -1;
  for (let b = 0; b < NUM_BLOCKS; b++) {
    if (key <= IDX[b].max_val) { blockId = b; break; }
  }
  if (blockId < 0) return -1;
  const start = IDX[blockId].start;
  for (let i = start; i < start + BLOCK_SIZE; i++) {
    if (ARRAY[i] === key) return i;
  }
  return -1;
}

function binarySearchKey(key) {
  let lo = 0, hi = NUM_BLOCKS - 1, blockId = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key <= IDX[mid].max_val) {
      if (mid === 0 || key > IDX[mid - 1].max_val) { blockId = mid; break; }
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  if (blockId < 0) { blockId = lo < NUM_BLOCKS ? lo : -1; }
  if (blockId < 0) return -1;
  const start = IDX[blockId].start;
  for (let i = start; i < start + BLOCK_SIZE; i++) {
    if (ARRAY[i] === key) return i;
  }
  return -1;
}

function generateOutputText() {
  return runSearchKeys([KEY]);
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);