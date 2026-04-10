'use strict';

// ============================================================
//  DATA — mirrors part2/graph_path.c exactly
// ============================================================
const NUM_VERTICES = 6;
const SRC_V = 5, DST_V = 2;

// Adjacency list (1-indexed). Built by head-insert in C code order:
// add_edge(5,3), add_edge(5,1) → adj[5]=[1,3]
// add_edge(1,4), add_edge(1,2) → adj[1]=[2,4]
// add_edge(3,4), add_edge(3,2) → adj[3]=[2,4]
// add_edge(4,6), add_edge(4,2) → adj[4]=[2,6]
// add_edge(6,2)                → adj[6]=[2]
const ADJ_LIST = [
  [],       // 0: unused
  [2, 4],   // 1
  [],       // 2: no outgoing edges
  [2, 4],   // 3
  [2, 6],   // 4
  [1, 3],   // 5
  [2],      // 6
];

// Adjacency matrix (1-indexed, row=source, col=dest)
const ADJ_MATRIX = [
  [0,0,0,0,0,0,0], // row 0: unused
  [0,0,1,0,1,0,0], // row 1: edges 1→2, 1→4
  [0,0,0,0,0,0,0], // row 2: no edges
  [0,0,1,0,1,0,0], // row 3: edges 3→2, 3→4
  [0,0,1,0,0,0,1], // row 4: edges 4→2, 4→6
  [0,1,0,1,0,0,0], // row 5: edges 5→1, 5→3
  [0,0,1,0,0,0,0], // row 6: edge 6→2
];

// SVG vertex positions (cx, cy inside a 540×460 viewport)
const VERTEX_POS = {
  1: { x: 130, y: 205 },
  2: { x: 270, y: 400 },
  3: { x: 410, y: 205 },
  4: { x: 130, y: 340 },
  5: { x: 270, y:  60 },
  6: { x: 410, y: 340 },
};

// All directed edges for SVG rendering
const EDGES = [
  { from: 5, to: 1 }, { from: 5, to: 3 },
  { from: 1, to: 2 }, { from: 1, to: 4 },
  { from: 3, to: 2 }, { from: 3, to: 4 },
  { from: 4, to: 2 }, { from: 4, to: 6 },
  { from: 6, to: 2 },
];

// ============================================================
//  APP STATE
// ============================================================
const APP = {
  allSteps: { 'dfs-all': [], 'dfs-len3': [], 'bfs-list': [], 'bfs-matrix': [] },
  currentAlgo: 'dfs-all',
  currentIndex: 0,
  playTimer: null,
  speed: 1100,
};

// ============================================================
//  STEP BUILDER HELPERS
// ============================================================
function mkStep(algo, phase, title, desc, fn, vars, hlOverride, stateOverride) {
  return {
    algorithm: algo,
    phase,
    title,
    description: desc,
    functionName: fn,
    variables: vars || {},
    highlight: Object.assign({
      currentVertex:    null,
      pathVertices:     [],
      pathEdges:        [],
      visitedVertices:  [],
      foundPathVertices:[],
      foundPathEdges:   [],
      queueVertices:    [],
      matrixRow:        null,
      matrixCol:        null,
      checkingEdge:     null,
    }, hlOverride || {}),
    algoState: Object.assign({
      dfsPath:    [],
      dfsVisited: new Array(7).fill(0),
      bfsQueue:   [],
      bfsDist:    new Array(7).fill(-1),
      bfsParent:  new Array(7).fill(-1),
      foundPaths: [],
      stepCount:  0,
    }, stateOverride || {}),
    stepIndex:  0,
    totalSteps: 0,
  };
}

// Derive path edges [{from,to}] from an array of vertex indices
function pathToEdges(verts) {
  const edges = [];
  for (let i = 0; i < verts.length - 1; i++)
    edges.push({ from: verts[i], to: verts[i + 1] });
  return edges;
}

// ============================================================
//  ALGORITHM 1 — DFS: ALL SIMPLE PATHS
// ============================================================
function generateDfsAllSteps() {
  const steps    = [];
  const vis      = new Array(7).fill(0);   // visited[1..6], live
  const pathV    = [];                      // current path vertices, live
  let   found    = [];                      // found paths so far
  let   opCount  = 0;

  // Snapshot helpers — deep copies of live state
  function snap()  { return { dfsPath: [...pathV], dfsVisited: vis.slice(), foundPaths: found.map(p=>[...p]) }; }
  function visArr(){ return vis.slice(); }

  // Vertices in path (excluding tip) that are "visited but in path"
  function inPathSet() { return new Set(pathV); }
  function visitedNotInPath() { return [1,2,3,4,5,6].filter(v => vis[v] && !inPathSet().has(v)); }

  function push(phase, title, desc, fn, vars, hlExtra) {
    const pv = [...pathV];
    steps.push(mkStep(
      'dfs-all', phase, title, desc, fn, vars,
      Object.assign({
        currentVertex:   pv.length ? pv[pv.length - 1] : null,
        pathVertices:    pv,
        pathEdges:       pathToEdges(pv),
        visitedVertices: visitedNotInPath(),
        foundPaths:      found.map(p=>[...p]),
      }, hlExtra || {}),
      Object.assign(snap(), { stepCount: opCount })
    ));
  }

  // ---- Initialization ----
  vis[SRC_V] = 1;
  pathV.push(SRC_V);
  push('初始化',
    `DFS 搜索初始化：从顶点 ${SRC_V} 出发，寻找到顶点 ${DST_V} 的全部简单路径`,
    `初始化 visited[] 数组（全部置 0），设置 visited[${SRC_V}] = 1，将起点 ${SRC_V} 放入路径数组 path[0]。` +
    `简单路径要求不重复经过同一顶点，因此每次访问顶点前先检查 visited[]，回溯后将其清零。` +
    `limit = 0 表示不限制路径长度，DFS 将枚举所有可能的简单路径。`,
    'dfs',
    { src: SRC_V, dst: DST_V, limit: 0, 'path[0]': SRC_V, [`visited[${SRC_V}]`]: 1 },
  );

  // ---- Recursive DFS (mirrors C code dfs() with limit=0) ----
  function dfs(cur, depth) {
    opCount++;

    // Check if cur == dst
    if (cur === DST_V) {
      const fp = [...pathV];
      found = [...found, fp];
      push('找到路径',
        `✓ 找到路径 ${fp.join('→')}（长度 = ${depth}）`,
        `当前顶点 cur = ${cur} 等于目标终点 dst = ${DST_V}，且 limit = 0（不限长度），` +
        `记录路径 ${fp.join(' → ')}（共经过 ${depth} 条边）。这是第 ${found.length} 条简单路径。` +
        `找到路径后直接 return，由调用方执行 visited[${cur}] = 0 的回溯操作。`,
        'dfs',
        { cur, depth, '路径': fp.join('→'), '路径数': found.length },
        { foundPathVertices: fp, foundPathEdges: pathToEdges(fp) }
      );
      return;
    }

    // Iterate over adjacency list of cur
    const neighbors = ADJ_LIST[cur];
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      opCount++;

      push('检查邻居',
        `dfs(${cur}, depth=${depth})：检查邻居 v = ${v}，visited[${v}] = ${vis[v]}`,
        `遍历顶点 ${cur} 的邻接表，当前邻居 v = ${v}（第 ${i+1} 个邻居）。` +
        `检查 visited[${v}] = ${vis[v]}：${vis[v] ? `顶点 ${v} 已在当前路径中，跳过（避免环路）。` : `顶点 ${v} 未访问，可以深搜。`}`,
        'dfs',
        { cur, depth, 'v (邻居)': v, [`visited[${v}]`]: vis[v], '结果': vis[v] ? '已访问 → 跳过' : '未访问 → 进入' },
        { checkingEdge: { from: cur, to: v } }
      );

      if (!vis[v]) {
        vis[v]    = 1;
        pathV.push(v);
        push('访问顶点',
          `访问顶点 ${v}，加入路径 → 路径：${pathV.join('→')}`,
          `顶点 ${v} 未访问，执行：visited[${v}] = 1，path[${depth + 1}] = ${v}。` +
          `当前路径为 ${pathV.join(' → ')}（长度 = ${depth + 1}）。` +
          `递归调用 dfs(${v}, ${depth + 1}) 继续向下搜索。`,
          'dfs',
          { cur, 'v': v, [`visited[${v}]`]: 1, '当前路径': pathV.join('→'), depth: depth + 1 },
        );
        dfs(v, depth + 1);
        vis[v] = 0;
        pathV.pop();
        push('回溯',
          `回溯：从顶点 ${v} 返回，路径恢复为 ${pathV.join('→') || String(SRC_V)}`,
          `dfs(${v}, ${depth + 1}) 全部邻居处理完毕，执行回溯：visited[${v}] = 0，从 path 中移除顶点 ${v}。` +
          `路径恢复为 ${pathV.join(' → ')}，继续处理顶点 ${cur} 的下一个邻居。`,
          'dfs',
          { '从': v, '回溯到': cur, [`visited[${v}]`]: 0, '路径': pathV.join('→') || String(SRC_V) },
        );
      }
    }
  }

  dfs(SRC_V, 0);

  push('完成',
    `🎉 DFS 搜索完成！共找到 ${found.length} 条简单路径`,
    `从顶点 ${SRC_V} 到顶点 ${DST_V} 的全部简单路径搜索完毕，共找到 ${found.length} 条：` +
    found.map(p => p.join('→')).join('；') + `。` +
    `DFS 通过 visited[] 标记避免环路，通过回溯系统枚举了所有可能的简单路径，时间复杂度为 O(V! × (V+E))。`,
    'dfs',
    { '起点': SRC_V, '终点': DST_V, '总路径数': found.length, '操作次数': opCount },
    { foundPaths: found.map(p=>[...p]) }
  );

  return steps;
}

// ============================================================
//  ALGORITHM 2 — DFS: LENGTH-3 SIMPLE PATHS
// ============================================================
function generateDfsLen3Steps() {
  const LIMIT    = 3;
  const steps    = [];
  const vis      = new Array(7).fill(0);
  const pathV    = [];
  let   found    = [];
  let   opCount  = 0;

  function snap()  { return { dfsPath: [...pathV], dfsVisited: vis.slice(), foundPaths: found.map(p=>[...p]) }; }
  function visitedNotInPath() {
    const s = new Set(pathV);
    return [1,2,3,4,5,6].filter(v => vis[v] && !s.has(v));
  }

  function push(phase, title, desc, fn, vars, hlExtra) {
    const pv = [...pathV];
    steps.push(mkStep(
      'dfs-len3', phase, title, desc, fn, vars,
      Object.assign({
        currentVertex:   pv.length ? pv[pv.length - 1] : null,
        pathVertices:    pv,
        pathEdges:       pathToEdges(pv),
        visitedVertices: visitedNotInPath(),
      }, hlExtra || {}),
      Object.assign(snap(), { stepCount: opCount })
    ));
  }

  vis[SRC_V] = 1;
  pathV.push(SRC_V);
  push('初始化',
    `DFS 搜索初始化：寻找从顶点 ${SRC_V} 到顶点 ${DST_V}、长度恰好为 ${LIMIT} 的路径`,
    `初始化同上，但 limit = ${LIMIT}：只输出恰好经过 ${LIMIT} 条边的路径。` +
    `剪枝规则：若 depth ≥ ${LIMIT} 且当前顶点不是终点，则不再继续（深度剪枝）；` +
    `若到达终点但 depth ≠ ${LIMIT}，也不输出。这大幅减少了搜索空间。`,
    'dfs',
    { src: SRC_V, dst: DST_V, limit: LIMIT, 'path[0]': SRC_V }
  );

  function dfs(cur, depth) {
    opCount++;

    if (cur === DST_V) {
      if (depth === LIMIT) {
        const fp = [...pathV];
        found = [...found, fp];
        push('找到路径',
          `✓ 找到长度为 ${LIMIT} 的路径 ${fp.join('→')}`,
          `cur = ${cur} = dst，且 depth = ${depth} = limit = ${LIMIT}，满足条件，记录路径 ${fp.join(' → ')}。` +
          `这是第 ${found.length} 条长度为 ${LIMIT} 的简单路径。`,
          'dfs',
          { cur, depth, limit: LIMIT, '路径': fp.join('→'), '路径数': found.length },
          { foundPathVertices: fp, foundPathEdges: pathToEdges(fp) }
        );
      } else {
        push('到达终点（长度不符）',
          `到达终点 ${DST_V}，但 depth = ${depth} ≠ limit = ${LIMIT}，不输出`,
          `cur = ${cur} = dst，但当前深度 depth = ${depth} 不等于 limit = ${LIMIT}，不符合长度要求，跳过此路径。`,
          'dfs',
          { cur, depth, limit: LIMIT, '结果': `depth(${depth}) ≠ limit(${LIMIT}) → 不输出` }
        );
      }
      return;
    }

    // Depth pruning: if depth >= limit and not at dst, prune
    if (depth >= LIMIT) {
      push('深度剪枝',
        `深度剪枝：depth = ${depth} ≥ limit = ${LIMIT}，且 cur = ${cur} ≠ dst，停止`,
        `当前深度 depth = ${depth} 已达到或超过 limit = ${LIMIT}，且当前顶点 ${cur} 不是终点 ${DST_V}，` +
        `继续深搜也不可能在恰好 ${LIMIT} 步内到达终点，执行剪枝。这是限长路径搜索的核心优化。`,
        'dfs',
        { cur, depth, limit: LIMIT, '剪枝原因': `depth(${depth}) ≥ limit(${LIMIT})` }
      );
      return;
    }

    const neighbors = ADJ_LIST[cur];
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      opCount++;

      push('检查邻居',
        `dfs(${cur}, depth=${depth})：检查邻居 v = ${v}，visited[${v}] = ${vis[v]}`,
        `检查顶点 ${cur} 的第 ${i + 1} 个邻居 v = ${v}（剩余可用深度 = ${LIMIT - depth}）。` +
        `visited[${v}] = ${vis[v]}：${vis[v] ? '已访问，跳过。' : '未访问，继续。'}`,
        'dfs',
        { cur, depth, 'v': v, [`visited[${v}]`]: vis[v], '剩余深度': LIMIT - depth },
        { checkingEdge: { from: cur, to: v } }
      );

      if (!vis[v]) {
        vis[v] = 1;
        pathV.push(v);
        push('访问顶点',
          `访问顶点 ${v}，路径：${pathV.join('→')}`,
          `visited[${v}] = 1，path[${depth + 1}] = ${v}，当前路径 ${pathV.join(' → ')}。递归调用 dfs(${v}, ${depth + 1})。`,
          'dfs',
          { 'v': v, [`visited[${v}]`]: 1, '路径': pathV.join('→'), depth: depth + 1 }
        );
        dfs(v, depth + 1);
        vis[v] = 0;
        pathV.pop();
        push('回溯',
          `回溯：从顶点 ${v} 返回，路径：${pathV.join('→') || String(SRC_V)}`,
          `dfs(${v}) 返回，visited[${v}] = 0，路径恢复为 ${pathV.join(' → ') || String(SRC_V)}。`,
          'dfs',
          { '从': v, '回到': cur, [`visited[${v}]`]: 0, '路径': pathV.join('→') || String(SRC_V) }
        );
      }
    }
  }

  dfs(SRC_V, 0);

  push('完成',
    `🎉 限长 DFS 完成！共找到 ${found.length} 条长度为 ${LIMIT} 的路径`,
    `从顶点 ${SRC_V} 到顶点 ${DST_V}、长度恰为 ${LIMIT} 的简单路径共 ${found.length} 条：` +
    (found.length ? found.map(p => p.join('→')).join('；') : '（无）') + `。` +
    `深度剪枝在 depth = ${LIMIT} 时终止不必要的搜索，操作次数约为 O(V^k)（k = ${LIMIT}）。`,
    'dfs',
    { '起点': SRC_V, '终点': DST_V, 'limit': LIMIT, '路径数': found.length }
  );

  return steps;
}

// ============================================================
//  ALGORITHM 3 — BFS SHORTEST PATH (adjacency list)
// ============================================================
function generateBfsListSteps() {
  const steps    = [];
  const INF      = 0x3f3f3f3f;
  const dist     = new Array(7).fill(INF);   // dist[1..6]
  const parent   = new Array(7).fill(-1);    // parent[1..6]
  let   queue    = [];                        // BFS queue (vertex values)
  let   opCount  = 0;

  function snap() {
    return {
      bfsQueue:  [...queue],
      bfsDist:   dist.slice(),
      bfsParent: parent.slice(),
      dfsPath:   [],
      dfsVisited:new Array(7).fill(0),
      foundPaths:[],
      stepCount: opCount,
    };
  }

  function push(phase, title, desc, fn, vars, hlExtra) {
    steps.push(mkStep(
      'bfs-list', phase, title, desc, fn, vars,
      Object.assign({ queueVertices: [...queue] }, hlExtra || {}),
      snap()
    ));
  }

  // ---- Init ----
  dist[SRC_V] = 0;
  queue.push(SRC_V);
  push('初始化',
    `BFS 初始化：dist[${SRC_V}] = 0，顶点 ${SRC_V} 入队`,
    `初始化所有 dist[] = INF（∞），parent[] = -1。设 dist[${SRC_V}] = 0，将起点 ${SRC_V} 入队。` +
    `BFS 按层扩展，第一次到达某顶点时记录的距离即为最短距离（因为每条边权重为 1）。`,
    'bfs_shortest',
    { src: SRC_V, dst: DST_V, [`dist[${SRC_V}]`]: 0, 'queue': `[${SRC_V}]` }
  );

  // ---- BFS loop ----
  while (queue.length > 0) {
    const u = queue.shift();
    opCount++;

    push('出队',
      `出队顶点 u = ${u}${u === DST_V ? `（到达终点 ${DST_V}，BFS 结束）` : ''}`,
      u === DST_V
        ? `出队顶点 u = ${u} 等于终点 ${DST_V}，BFS 找到最短路径，跳出循环。` +
          `最短距离 dist[${DST_V}] = ${dist[DST_V]}，沿 parent[] 反向回溯即可得到路径。`
        : `出队顶点 u = ${u}（dist[${u}] = ${dist[u]}），开始处理其邻接表，检查每个邻居是否未访问。`,
      'bfs_shortest',
      { u, [`dist[${u}]`]: dist[u], '队列': `[${queue.join(', ')}]`, 'u==dst?': u === DST_V ? 'YES → break' : 'NO' },
      { currentVertex: u }
    );

    if (u === DST_V) break;

    // Process adjacency list
    const neighbors = ADJ_LIST[u];
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      opCount++;
      if (dist[v] === INF) {
        dist[v]   = dist[u] + 1;
        parent[v] = u;
        queue.push(v);
        push('入队',
          `邻居 v = ${v} 未访问 → dist[${v}] = ${dist[v]}，parent[${v}] = ${u}，${v} 入队`,
          `检查 u = ${u} 的邻居 v = ${v}：dist[${v}] = INF（未访问），` +
          `设 dist[${v}] = dist[${u}] + 1 = ${dist[v]}，parent[${v}] = ${u}，顶点 ${v} 入队。` +
          `parent[] 数组记录 BFS 树中的前驱节点，用于事后回溯路径。`,
          'bfs_shortest',
          { u, v, [`dist[${v}]`]: dist[v], [`parent[${v}]`]: u, '队列': `[${queue.join(', ')}]` },
          { currentVertex: u, queueVertices: [...queue] }
        );
      } else {
        push('邻居已访问',
          `邻居 v = ${v} 已访问（dist[${v}] = ${dist[v]}），跳过`,
          `检查 u = ${u} 的邻居 v = ${v}：dist[${v}] = ${dist[v]} ≠ INF，顶点 ${v} 已经被访问过，跳过。` +
          `BFS 中每个顶点只入队一次，保证了最短路径的正确性。`,
          'bfs_shortest',
          { u, v, [`dist[${v}]`]: dist[v], '结果': '已访问 → 跳过' },
          { currentVertex: u, queueVertices: [...queue] }
        );
      }
    }
  }

  // Reconstruct shortest path
  const shortestPath = [];
  let cur = DST_V;
  while (cur !== -1) { shortestPath.unshift(cur); cur = parent[cur]; }

  push('回溯路径',
    `回溯 parent[] 数组，重建最短路径：${shortestPath.join('→')}`,
    `BFS 结束，沿 parent[] 从终点 ${DST_V} 反向追踪到起点 ${SRC_V}：` +
    `parent[${DST_V}] = ${parent[DST_V]}，parent[${parent[DST_V]}] = ${parent[parent[DST_V]]}，` +
    `parent[${SRC_V}] = -1（到达起点）。正向路径为 ${shortestPath.join(' → ')}，长度 = ${shortestPath.length - 1}。`,
    'print_shortest_path_visual',
    { '最短路径': shortestPath.join('→'), '长度': shortestPath.length - 1 },
    { foundPathVertices: shortestPath, foundPathEdges: pathToEdges(shortestPath) }
  );

  push('完成',
    `🎉 BFS（邻接表）完成！最短路径：${shortestPath.join('→')}，长度 = ${shortestPath.length - 1}`,
    `BFS 保证了首次到达终点时路径最短（无权图）。最短路径为 ${shortestPath.join(' → ')}，` +
    `共经过 ${shortestPath.length - 1} 条边。邻接表 BFS 时间复杂度 O(V+E)，本例 V=6，E=9。`,
    'bfs_shortest',
    { '最短路径': shortestPath.join('→'), '距离': shortestPath.length - 1, 'O(V+E)': `O(${NUM_VERTICES}+9)` },
    { foundPathVertices: shortestPath, foundPathEdges: pathToEdges(shortestPath) }
  );

  return steps;
}

// ============================================================
//  ALGORITHM 4 — BFS SHORTEST PATH (adjacency matrix)
// ============================================================
function generateBfsMatrixSteps() {
  const steps    = [];
  const INF      = 0x3f3f3f3f;
  const dist     = new Array(7).fill(INF);
  const parent   = new Array(7).fill(-1);
  let   queue    = [];
  let   opCount  = 0;

  function snap() {
    return {
      bfsQueue:  [...queue],
      bfsDist:   dist.slice(),
      bfsParent: parent.slice(),
      dfsPath:   [],
      dfsVisited:new Array(7).fill(0),
      foundPaths:[],
      stepCount: opCount,
    };
  }

  function push(phase, title, desc, fn, vars, hlExtra) {
    steps.push(mkStep(
      'bfs-matrix', phase, title, desc, fn, vars,
      Object.assign({ queueVertices: [...queue] }, hlExtra || {}),
      snap()
    ));
  }

  dist[SRC_V] = 0;
  queue.push(SRC_V);
  push('初始化',
    `BFS（邻接矩阵）初始化：dist[${SRC_V}] = 0，顶点 ${SRC_V} 入队`,
    `与邻接表版相同的初始化：dist[] = INF，parent[] = -1，dist[${SRC_V}] = 0，${SRC_V} 入队。` +
    `区别在于处理邻居时：不遍历链表，而是扫描邻接矩阵的整行（列 v = 1..6），检查 adj_matrix[u][v] = 1。` +
    `这意味着每次出队需要 O(V) 次检查，总时间复杂度为 O(V²)。`,
    'bfs_shortest',
    { src: SRC_V, dst: DST_V, 'use_matrix': 1, [`dist[${SRC_V}]`]: 0 }
  );

  while (queue.length > 0) {
    const u = queue.shift();
    opCount++;

    push('出队',
      `出队顶点 u = ${u}${u === DST_V ? `（到达终点，结束）` : ''}，扫描矩阵第 ${u} 行`,
      u === DST_V
        ? `出队顶点 u = ${u} = dst，BFS 结束，最短距离 dist[${DST_V}] = ${dist[DST_V]}。`
        : `出队顶点 u = ${u}（dist[${u}] = ${dist[u]}）。邻接矩阵版逐列扫描第 ${u} 行：对每个 v = 1..${NUM_VERTICES} 检查 adj_matrix[${u}][v] 是否为 1。`,
      'bfs_shortest',
      { u, [`dist[${u}]`]: dist[u], '队列': `[${queue.join(', ')}]`, '扫描行': u },
      { currentVertex: u, matrixRow: u }
    );

    if (u === DST_V) break;

    // Scan entire row of adjacency matrix
    for (let v = 1; v <= NUM_VERTICES; v++) {
      if (ADJ_MATRIX[u][v]) {
        opCount++;
        if (dist[v] === INF) {
          dist[v]   = dist[u] + 1;
          parent[v] = u;
          queue.push(v);
          push('发现边 → 入队',
            `adj_matrix[${u}][${v}] = 1，v = ${v} 未访问 → dist[${v}] = ${dist[v]}，入队`,
            `adj_matrix[${u}][${v}] = 1，存在边 ${u}→${v}。dist[${v}] = INF（未访问），` +
            `更新 dist[${v}] = ${dist[v]}，parent[${v}] = ${u}，顶点 ${v} 入队。`,
            'bfs_shortest',
            { u, v, [`adj_matrix[${u}][${v}]`]: 1, [`dist[${v}]`]: dist[v], [`parent[${v}]`]: u },
            { currentVertex: u, matrixRow: u, matrixCol: v, queueVertices: [...queue] }
          );
        } else {
          push('发现边 → 已访问',
            `adj_matrix[${u}][${v}] = 1，但 v = ${v} 已访问（dist[${v}] = ${dist[v]}），跳过`,
            `adj_matrix[${u}][${v}] = 1，存在边 ${u}→${v}，但 dist[${v}] = ${dist[v]} ≠ INF，顶点 ${v} 已被访问，跳过。`,
            'bfs_shortest',
            { u, v, [`adj_matrix[${u}][${v}]`]: 1, [`dist[${v}]`]: dist[v], '结果': '已访问 → 跳过' },
            { currentVertex: u, matrixRow: u, matrixCol: v, queueVertices: [...queue] }
          );
        }
      }
    }
  }

  const shortestPath = [];
  let c2 = DST_V;
  while (c2 !== -1) { shortestPath.unshift(c2); c2 = parent[c2]; }

  push('回溯路径',
    `回溯 parent[] 重建最短路径：${shortestPath.join('→')}`,
    `沿 parent[] 从终点反向追踪：parent[${DST_V}]=${parent[DST_V]}，parent[${parent[DST_V]}]=${parent[parent[DST_V]]}，parent[${SRC_V}]=-1。` +
    `最短路径 ${shortestPath.join(' → ')}，与邻接表 BFS 结果一致。`,
    'print_shortest_path_visual',
    { '最短路径': shortestPath.join('→'), '长度': shortestPath.length - 1 },
    { foundPathVertices: shortestPath, foundPathEdges: pathToEdges(shortestPath) }
  );

  push('完成',
    `🎉 BFS（邻接矩阵）完成！最短路径：${shortestPath.join('→')}，长度 = ${shortestPath.length - 1}`,
    `邻接矩阵 BFS 结果与邻接表版完全一致：最短路径 ${shortestPath.join(' → ')}，长度 ${shortestPath.length - 1}。` +
    `邻接矩阵版每次出队需扫描整行（V 次），总复杂度 O(V²) = O(${NUM_VERTICES * NUM_VERTICES})；` +
    `邻接表版仅遍历实际边，总复杂度 O(V+E) = O(${NUM_VERTICES + 9})。`,
    'bfs_shortest',
    { '最短路径': shortestPath.join('→'), '距离': shortestPath.length - 1, 'O(V²)': `O(${NUM_VERTICES}²=${NUM_VERTICES*NUM_VERTICES})` },
    { foundPathVertices: shortestPath, foundPathEdges: pathToEdges(shortestPath) }
  );

  return steps;
}

// ============================================================
//  APP STATE & INIT
// ============================================================
function initApp() {
  // Generate all step sequences
  APP.allSteps['dfs-all']    = generateDfsAllSteps();
  APP.allSteps['dfs-len3']   = generateDfsLen3Steps();
  APP.allSteps['bfs-list']   = generateBfsListSteps();
  APP.allSteps['bfs-matrix'] = generateBfsMatrixSteps();

  // Stamp stepIndex / totalSteps
  ['dfs-all','dfs-len3','bfs-list','bfs-matrix'].forEach(algo => {
    const arr = APP.allSteps[algo];
    arr.forEach((s, i) => { s.stepIndex = i; s.totalSteps = arr.length; });
  });

  setupEventListeners();
  renderStep(currentStep());
  updateHeaderBadge();
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
      APP.currentAlgo  = btn.dataset.algo;
      APP.currentIndex = 0;
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
  const names = {
    'dfs-all':    '全部简单路径（DFS）',
    'dfs-len3':   '长度为 3 的路径（DFS）',
    'bfs-list':   'BFS 最短路径（邻接表）',
    'bfs-matrix': 'BFS 最短路径（邻接矩阵）',
  };
  const briefs = {
    'dfs-all':    '邻接表 DFS 回溯，limit=0，枚举所有简单路径',
    'dfs-len3':   '邻接表 DFS + 深度剪枝，limit=3，仅输出长度恰好为 3 的路径',
    'bfs-list':   '邻接表 BFS，O(V+E)，首次到达终点即为最短路径',
    'bfs-matrix': '邻接矩阵 BFS，O(V²)，每次出队扫描整行',
  };
  document.getElementById('algo-badge').textContent = names[APP.currentAlgo];
  document.getElementById('algo-brief').textContent = briefs[APP.currentAlgo];
}

// ============================================================
//  MASTER RENDER
// ============================================================
function renderStep(step) {
  if (!step) return;

  document.getElementById('step-counter').textContent =
    `步骤 ${step.stepIndex + 1} / ${step.totalSteps}`;
  document.getElementById('step-phase-tag').textContent = step.phase;
  document.getElementById('step-title').textContent      = step.title;
  document.getElementById('step-description').textContent = step.description;
  document.getElementById('step-function').textContent   = step.functionName + '()';

  renderVariables(step.variables);
  renderGraph(step);
  renderAdjStructure(step);
  renderFoundPaths(step);
  renderAlgoState(step);
  updateNavButtons();
}

// ============================================================
//  RENDER: VARIABLE CHIPS
// ============================================================
function renderVariables(vars) {
  const el = document.getElementById('step-variables');
  el.innerHTML = '';
  Object.entries(vars || {}).forEach(([k, v]) => {
    const chip = document.createElement('span');
    chip.className = 'var-chip';
    chip.innerHTML =
      `<span class="var-key">${escHtml(String(k))}</span>` +
      `<span class="var-val">${escHtml(String(v))}</span>`;
    el.appendChild(chip);
  });
}

// ============================================================
//  RENDER: SVG GRAPH
// ============================================================
function renderGraph(step) {
  const hl = step.highlight;

  // Determine vertex color category
  const foundSet    = new Set(hl.foundPathVertices || []);
  const pathSet     = new Set(hl.pathVertices || []);
  const visitedSet  = new Set(hl.visitedVertices || []);
  const queueSet    = new Set(hl.queueVertices || []);
  const curV        = hl.currentVertex;

  function vertexClass(v) {
    if (foundSet.has(v))   return 'v-found';
    if (v === curV)         return 'v-cur';
    if (pathSet.has(v))     return 'v-path';
    if (queueSet.has(v))    return 'v-queue';
    if (visitedSet.has(v))  return 'v-visited';
    if (v === SRC_V)        return 'v-src';
    if (v === DST_V)        return 'v-dst';
    return 'v-default';
  }

  const VCOLORS = {
    'v-found':   { fill: '#2e7d32', stroke: '#1b5e20', text: 'white' },
    'v-cur':     { fill: '#ff6f00', stroke: '#e65100', text: 'white' },
    'v-path':    { fill: '#c8e6c9', stroke: '#2e7d32', text: '#1b5e20' },
    'v-queue':   { fill: '#fff9c4', stroke: '#f9a825', text: '#e65100' },
    'v-visited': { fill: '#1565c0', stroke: '#0d47a1', text: 'white' },
    'v-src':     { fill: '#7b1fa2', stroke: '#4a148c', text: 'white' },
    'v-dst':     { fill: '#c62828', stroke: '#b71c1c', text: 'white' },
    'v-default': { fill: '#e8eaf6', stroke: '#3949ab', text: '#1a237e' },
  };

  // Determine edge color category
  const foundEdgeSet = new Set((hl.foundPathEdges || []).map(e => `${e.from}-${e.to}`));
  const pathEdgeSet  = new Set((hl.pathEdges || []).map(e => `${e.from}-${e.to}`));
  const checkEdge    = hl.checkingEdge ? `${hl.checkingEdge.from}-${hl.checkingEdge.to}` : null;

  function edgeStyle(e) {
    const key = `${e.from}-${e.to}`;
    if (foundEdgeSet.has(key))  return { stroke: '#2e7d32', width: 2.5, dash: '', markerKey: 'green' };
    if (key === checkEdge)      return { stroke: '#ff6f00', width: 2,   dash: '5,4', markerKey: 'orange' };
    if (pathEdgeSet.has(key))   return { stroke: '#ff6f00', width: 2.5, dash: '', markerKey: 'orange' };
    return { stroke: '#90a4ae', width: 1.5, dash: '', markerKey: 'gray' };
  }

  const R = 22;  // vertex circle radius
  const W = 540, H = 460;

  // Build SVG string
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;

  // Arrowhead markers
  svg += `<defs>`;
  [['gray','#90a4ae'],['orange','#ff6f00'],['green','#2e7d32'],['blue','#1565c0']].forEach(([id, color]) => {
    svg += `<marker id="arr-${id}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="${color}"/>
    </marker>`;
  });
  svg += `</defs>`;

  // Draw edges
  EDGES.forEach(e => {
    const style = edgeStyle(e);
    const fp    = VERTEX_POS[e.from];
    const tp    = VERTEX_POS[e.to];
    const dx    = tp.x - fp.x;
    const dy    = tp.y - fp.y;
    const len   = Math.sqrt(dx * dx + dy * dy);
    const ux    = dx / len, uy = dy / len;
    const x1    = fp.x + ux * (R + 2);
    const y1    = fp.y + uy * (R + 2);
    const x2    = tp.x - ux * (R + 10);
    const y2    = tp.y - uy * (R + 10);

    svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
                  x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                  stroke="${style.stroke}" stroke-width="${style.width}"
                  ${style.dash ? `stroke-dasharray="${style.dash}"` : ''}
                  marker-end="url(#arr-${style.markerKey})"/>`;
  });

  // Draw vertex circles + labels
  for (let v = 1; v <= NUM_VERTICES; v++) {
    const pos = VERTEX_POS[v];
    const vc  = vertexClass(v);
    const col = VCOLORS[vc];
    svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${R}"
                    fill="${col.fill}" stroke="${col.stroke}" stroke-width="2.5"/>`;
    svg += `<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle"
                  font-size="15" font-weight="bold" font-family="Courier New, monospace"
                  fill="${col.text}">${v}</text>`;

    // Small label for src/dst
    if (v === SRC_V) {
      svg += `<text x="${pos.x}" y="${pos.y - R - 5}" text-anchor="middle"
                    font-size="10" fill="#7b1fa2" font-family="sans-serif">起点</text>`;
    } else if (v === DST_V) {
      svg += `<text x="${pos.x}" y="${pos.y + R + 13}" text-anchor="middle"
                    font-size="10" fill="#c62828" font-family="sans-serif">终点</text>`;
    }
  }

  svg += `</svg>`;
  document.getElementById('graph-svg-container').innerHTML = svg;
}

// ============================================================
//  RENDER: ADJACENCY STRUCTURE (list or matrix)
// ============================================================
function renderAdjStructure(step) {
  const isMatrix = (step.algorithm === 'bfs-matrix');
  const titleEl  = document.getElementById('adj-panel-title');
  const contentEl = document.getElementById('adj-structure-content');

  if (isMatrix) {
    titleEl.textContent = '邻接矩阵（adj_matrix，1-indexed）';
    contentEl.innerHTML = buildAdjMatrixHTML(step);
  } else {
    titleEl.textContent = '邻接表（adj_list，head-insert 头插）';
    contentEl.innerHTML = buildAdjListHTML(step);
  }
}

function buildAdjListHTML(step) {
  const hl    = step.highlight;
  const curV  = hl.currentVertex;
  const chk   = hl.checkingEdge;          // {from, to} or null
  const pathSet    = new Set(hl.pathVertices || []);
  const visitedSet = new Set(hl.visitedVertices || []);
  const queueSet   = new Set(hl.queueVertices || []);
  const foundSet   = new Set(hl.foundPathVertices || []);

  function nodeClass(v) {
    if (foundSet.has(v))   return 'hl-found';
    if (v === curV)         return 'hl-active';
    if (chk && v === chk.to && chk.from === curV) return 'hl-checking';
    if (queueSet.has(v))    return 'hl-visited';  // reuse blue for queue
    if (visitedSet.has(v) || pathSet.has(v)) return 'hl-visited';
    return '';
  }

  let html = `<div class="adj-list-container"><table class="adj-list-table">
    <thead><tr><th style="width:60px">顶点</th><th>邻接表</th></tr></thead><tbody>`;

  for (let v = 1; v <= NUM_VERTICES; v++) {
    const rowHl = (v === curV || (chk && chk.from === v)) ? ' hl-current' : '';
    html += `<tr class="adj-row${rowHl}">
      <td><span class="adj-vertex-label">[${v}]</span></td>
      <td><div class="adj-chain">`;

    const nbrs = ADJ_LIST[v];
    if (nbrs.length === 0) {
      html += `<span class="adj-null">NULL</span>`;
    } else {
      nbrs.forEach((nb, i) => {
        const nc = nodeClass(nb);
        html += `<span class="adj-node${nc ? ' ' + nc : ''}">${nb}</span>
                 <span class="adj-arrow-sym">→</span>`;
      });
      html += `<span class="adj-null">NULL</span>`;
    }
    html += `</div></td></tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

function buildAdjMatrixHTML(step) {
  const hl  = step.highlight;
  const mR  = hl.matrixRow;
  const mC  = hl.matrixCol;

  let html = `<div class="adj-matrix-wrap"><table class="adj-matrix-table">
    <thead><tr><th></th>`;
  for (let c = 1; c <= NUM_VERTICES; c++) {
    const colHl = (c === mC) ? ' col-header-hl' : '';
    html += `<th class="${colHl}">${c}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let r = 1; r <= NUM_VERTICES; r++) {
    const rowHl = (r === mR) ? ' row-header-hl' : '';
    html += `<tr><th class="${rowHl}">${r}</th>`;
    for (let c = 1; c <= NUM_VERTICES; c++) {
      const val = ADJ_MATRIX[r][c];
      let cls = 'matrix-cell';
      if (val === 0) cls += ' zero-cell'; else cls += ' edge-cell';
      if (r === mR && c === mC) cls += ' hl-active';
      else if (r === mR)        cls += ' hl-row';
      else if (c === mC)        cls += ' hl-col';
      html += `<td class="${cls}">${val}</td>`;
    }
    html += `</tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

// ============================================================
//  RENDER: FOUND PATHS
// ============================================================
function renderFoundPaths(step) {
  const panel    = document.getElementById('found-paths-panel');
  const titleEl  = document.getElementById('found-paths-title');
  const contentEl = document.getElementById('found-paths-content');

  const isDfs = step.algorithm === 'dfs-all' || step.algorithm === 'dfs-len3';

  // For BFS, show shortest path result if available
  const fpHl = step.highlight.foundPathVertices || [];
  const found = (step.algoState.foundPaths && step.algoState.foundPaths.length)
    ? step.algoState.foundPaths
    : (fpHl.length ? [fpHl] : []);

  if (!isDfs && fpHl.length === 0 && found.length === 0) {
    contentEl.innerHTML = `<p class="empty-notice">BFS 完成后将在此显示最短路径。</p>`;
    titleEl.textContent = '最短路径（BFS 结果）';
    return;
  }
  if (!isDfs) {
    titleEl.textContent = '最短路径（BFS 结果）';
  } else {
    const limitStr = step.algorithm === 'dfs-len3' ? '长度为 3 的' : '';
    titleEl.textContent = `已找到的${limitStr}路径（共 ${found.length} 条）`;
  }

  if (found.length === 0 && fpHl.length === 0) {
    contentEl.innerHTML = `<p class="empty-notice">暂未找到路径，请开始演示。</p>`;
    return;
  }

  // Determine which path was just found (last in found list, or foundPathVertices)
  const justFound = fpHl.length ? fpHl.join(',') : '';

  let html = `<div class="found-paths-list">`;
  const displayPaths = found.length ? found : (fpHl.length ? [fpHl] : []);
  displayPaths.forEach((path, idx) => {
    const isNew = (path.join(',') === justFound);
    html += `<div class="path-item${isNew ? ' path-new' : ''}">
      <span class="path-item-label">${isDfs ? `路径 ${idx + 1}` : '最短路径'}</span>`;
    path.forEach((v, vi) => {
      let vcls = 'v-mid';
      if (v === SRC_V) vcls = 'v-src';
      else if (v === DST_V) vcls = 'v-dst';
      html += `<span class="path-vertex ${vcls}">${v}</span>`;
      if (vi < path.length - 1)
        html += `<span class="path-arrow">→</span>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  contentEl.innerHTML = html;
}

// ============================================================
//  RENDER: ALGORITHM STATE PANEL
// ============================================================
function renderAlgoState(step) {
  const el = document.getElementById('state-content');
  const st = step.algoState;
  const hl = step.highlight;

  if (step.algorithm === 'dfs-all' || step.algorithm === 'dfs-len3') {
    renderDfsState(el, st, hl, step.algorithm);
  } else {
    renderBfsState(el, st, hl, step.algorithm);
  }
}

function renderDfsState(el, st, hl, algo) {
  const vis  = st.dfsVisited;
  const path = st.dfsPath;
  const curV = hl.currentVertex;
  const limit = algo === 'dfs-len3' ? 3 : 0;

  // Path stack display
  let stackHtml = '';
  if (path.length === 0) {
    stackHtml = '<span style="color:#bbb;font-size:0.85rem;">（空）</span>';
  } else {
    path.forEach((v, i) => {
      let cls = 'v-path';
      if (v === SRC_V) cls = 'v-src';
      else if (v === DST_V) cls = 'v-dst';
      else if (v === curV && i === path.length - 1) cls = 'v-cur';
      if (i > 0) stackHtml += `<span class="stack-arrow">→</span>`;
      stackHtml += `<span class="stack-vertex ${cls}">${v}</span>`;
    });
  }

  // Visited array (indices 1-6)
  let visHtml = '';
  for (let v = 1; v <= NUM_VERTICES; v++) {
    let hlCls = '';
    if (vis[v]) hlCls = 'hl-orange';
    visHtml += `<div class="array-cell ${hlCls}">
      <div class="cell-idx">[${v}]</div>
      <div class="cell-val">${vis[v]}</div>
    </div>`;
  }

  el.innerHTML = `
    <div class="state-vars-row">
      <div class="state-var">
        <span class="state-label">当前深度<br>depth</span>
        <span class="state-value${path.length > 1 ? ' active' : ''}">${path.length - 1}</span>
      </div>
      <div class="state-var">
        <span class="state-label">路径长度<br>|path|</span>
        <span class="state-value${path.length > 0 ? ' active' : ''}">${path.length}</span>
      </div>
      <div class="state-var">
        <span class="state-label">路径限制<br>limit</span>
        <span class="state-value">${limit === 0 ? '∞' : limit}</span>
      </div>
      <div class="state-var">
        <span class="state-label">已找路径数<br>path_count</span>
        <span class="state-value${st.foundPaths.length > 0 ? ' active' : ''}">${st.foundPaths.length}</span>
      </div>
    </div>
    <div style="margin-bottom:10px">
      <div class="array-label" style="margin-bottom:6px;">当前路径 path[]：</div>
      <div class="dfs-stack-display">${stackHtml}</div>
    </div>
    <div class="array-row">
      <span class="array-label">visited[]</span>
      <div class="array-cells">${visHtml}</div>
    </div>
    <div class="complexity-note">
      ⏱ ${algo === 'dfs-len3'
        ? `深度剪枝：depth ≥ limit(3) 且未到终点时直接剪枝，避免无效搜索`
        : `回溯 DFS：visited[] 防止重复，回溯时清零；枚举全部简单路径`}
    </div>`;
}

function renderBfsState(el, st, hl, algo) {
  const INF    = 0x3f3f3f3f;
  const queue  = st.bfsQueue  || [];
  const dist   = st.bfsDist   || new Array(7).fill(INF);
  const parent = st.bfsParent || new Array(7).fill(-1);
  const mRow   = hl.matrixRow;

  // Queue display
  let queueHtml = queue.length
    ? queue.map(v => `<span class="queue-vertex">${v}</span>`).join(' ')
    : `<span class="queue-empty">（空队列）</span>`;

  // dist[] array
  let distHtml = '';
  for (let v = 1; v <= NUM_VERTICES; v++) {
    const dval  = dist[v] === INF || dist[v] === undefined ? '∞' : dist[v];
    let hlCls = '';
    if (dist[v] !== INF && dist[v] !== undefined) hlCls = 'hl-blue';
    if (v === (hl.currentVertex)) hlCls = 'hl-orange';
    distHtml += `<div class="array-cell ${hlCls}">
      <div class="cell-idx">[${v}]</div>
      <div class="cell-val">${dval}</div>
    </div>`;
  }

  // parent[] array
  let parentHtml = '';
  for (let v = 1; v <= NUM_VERTICES; v++) {
    const pval  = (parent[v] === -1 || parent[v] === undefined) ? '-1' : parent[v];
    let hlCls = '';
    if (parent[v] !== -1 && parent[v] !== undefined) hlCls = 'hl-green';
    parentHtml += `<div class="array-cell ${hlCls}">
      <div class="cell-idx">[${v}]</div>
      <div class="cell-val">${pval}</div>
    </div>`;
  }

  el.innerHTML = `
    <div class="state-vars-row">
      <div class="state-var">
        <span class="state-label">队列大小<br>|queue|</span>
        <span class="state-value${queue.length > 0 ? ' active' : ''}">${queue.length}</span>
      </div>
      <div class="state-var">
        <span class="state-label">当前处理<br>u</span>
        <span class="state-value${hl.currentVertex ? ' active' : ''}">${hl.currentVertex || '—'}</span>
      </div>
      ${algo === 'bfs-matrix' && mRow ? `
      <div class="state-var">
        <span class="state-label">矩阵扫描行<br>row</span>
        <span class="state-value active">${mRow}</span>
      </div>` : ''}
      <div class="state-var">
        <span class="state-label">终点距离<br>dist[${DST_V}]</span>
        <span class="state-value${dist[DST_V] !== INF && dist[DST_V] !== undefined ? ' active' : ''}">
          ${dist[DST_V] === INF || dist[DST_V] === undefined ? '∞' : dist[DST_V]}
        </span>
      </div>
    </div>
    <div class="array-row" style="margin-bottom:10px">
      <span class="queue-label">队列 queue：</span>
      <div class="bfs-queue-display">${queueHtml}</div>
    </div>
    <div class="array-row">
      <span class="array-label">dist[]</span>
      <div class="array-cells">${distHtml}</div>
    </div>
    <div class="array-row">
      <span class="array-label">parent[]</span>
      <div class="array-cells">${parentHtml}</div>
    </div>
    <div class="complexity-note">
      ⏱ ${algo === 'bfs-matrix'
        ? `邻接矩阵 BFS：O(V²) = O(${NUM_VERTICES}²=${NUM_VERTICES*NUM_VERTICES})，每次出队扫描整行 V 个元素`
        : `邻接表 BFS：O(V+E) = O(${NUM_VERTICES}+9)，只遍历实际存在的边`}
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
