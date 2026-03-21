/*
 * Part 2 – 有向图路径搜索 (Graph Path Search)
 *
 * 有向图 G (7 个顶点，顶点编号 1~7):
 *   边集: 5->1, 5->2, 5->3,
 *         1->2, 1->4,
 *         3->1, 3->4,
 *         4->2, 4->6,
 *         6->2
 *
 * 实现内容:
 *   1. 邻接矩阵存储 + 图形化展示
 *   2. DFS 求从顶点 5 到顶点 2 的所有简单路径
 *   3. DFS 求从顶点 5 到顶点 2 的所有长度为 3 的简单路径
 *   4. BFS (队列) 求最短路径
 *   5. 以递推(迭代)形式打印最短路径
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ─────────────────────── 数据定义 ─────────────────────── */

#define MAXV   8          /* 顶点最大数 (1-indexed, 下标 0 不用) */
#define N_VERT 7          /* 实际顶点数 */
#define INF    0x3f3f3f3f

/* 邻接矩阵 (1-indexed) */
int adj[MAXV][MAXV];

/* DFS 路径栈 */
int path[MAXV];
int path_len;

/* 访问标记 */
int visited[MAXV];

/* ─────────────────────── 图的初始化 ─────────────────────── */

void init_graph(void)
{
    memset(adj, 0, sizeof(adj));

    /* 有向边 */
    int edges[][2] = {
        {5,1}, {5,2}, {5,3},
        {1,2}, {1,4},
        {3,1}, {3,4},
        {4,2}, {4,6},
        {6,2}
    };
    int num_edges = (int)(sizeof(edges) / sizeof(edges[0]));
    for (int i = 0; i < num_edges; i++) {
        adj[edges[i][0]][edges[i][1]] = 1;
    }
}

/* ─────────────────────── 图形化打印函数 ─────────────────────── */

/* 打印邻接矩阵 */
void print_adj_matrix(void)
{
    printf("\n  邻接矩阵 (行=出发顶点, 列=目标顶点):\n");
    printf("        ");
    for (int j = 1; j <= N_VERT; j++) printf("  %d", j);
    printf("\n      +-");
    for (int j = 1; j <= N_VERT; j++) printf("---");
    printf("+\n");
    for (int i = 1; i <= N_VERT; i++) {
        printf("    %d | ", i);
        for (int j = 1; j <= N_VERT; j++) {
            printf(" %d ", adj[i][j]);
        }
        printf("|\n");
    }
    printf("      +-");
    for (int j = 1; j <= N_VERT; j++) printf("---");
    printf("+\n\n");
}

/* 打印有向图的邻接表形式 */
void print_adj_list(void)
{
    printf("  邻接表表示:\n");
    for (int i = 1; i <= N_VERT; i++) {
        printf("    顶点 %d:", i);
        int first = 1;
        for (int j = 1; j <= N_VERT; j++) {
            if (adj[i][j]) {
                if (first) { printf(" -> %d", j); first = 0; }
                else        printf(" -> %d", j);
            }
        }
        if (first) printf(" (无出边)");
        printf("\n");
    }
    printf("\n");
}

/* 打印一条路径 */
void print_path(int *p, int len)
{
    for (int i = 0; i < len; i++) {
        if (i > 0) printf(" -> ");
        printf("%d", p[i]);
    }
    printf("  (长度 %d)\n", len - 1);
}

/* ─────────────────────── DFS 所有简单路径 ─────────────────────── */

int total_paths;

void dfs_all_paths(int cur, int dest)
{
    if (cur == dest) {
        printf("    路径 %2d: ", ++total_paths);
        print_path(path, path_len);
        return;
    }
    for (int v = 1; v <= N_VERT; v++) {
        if (adj[cur][v] && !visited[v]) {
            visited[v]     = 1;
            path[path_len] = v;
            path_len++;
            dfs_all_paths(v, dest);
            path_len--;
            visited[v] = 0;
        }
    }
}

/* ─────────────────────── DFS 长度为 L 的简单路径 ─────────────────────── */

int total_len_paths;

void dfs_len_paths(int cur, int dest, int target_len)
{
    /* 已经走了 path_len-1 步 */
    int steps = path_len - 1;
    if (cur == dest && steps == target_len) {
        printf("    路径 %2d: ", ++total_len_paths);
        print_path(path, path_len);
        return;
    }
    if (steps >= target_len) return; /* 剪枝 */

    for (int v = 1; v <= N_VERT; v++) {
        if (adj[cur][v] && !visited[v]) {
            visited[v]     = 1;
            path[path_len] = v;
            path_len++;
            dfs_len_paths(v, dest, target_len);
            path_len--;
            visited[v] = 0;
        }
    }
}

/* ─────────────────────── BFS 最短路径 (队列实现) ─────────────────────── */

/*
 * 简单线性队列，容量为顶点数即可（每顶点最多入队一次）
 */
#define QCAP MAXV

typedef struct {
    int v;
} State;

State queue[QCAP];
int q_head, q_tail;

void bfs_shortest(int src, int dest)
{
    /* 初始化 */
    int dist[MAXV];
    int prev[MAXV];
    memset(dist, 0x3f, sizeof(dist));
    memset(prev, -1,   sizeof(prev));

    dist[src] = 0;
    q_head = q_tail = 0;
    queue[q_tail].v = src;
    q_tail++;

    /* BFS */
    printf("    BFS 过程:\n");
    while (q_head < q_tail) {
        State cur = queue[q_head++];
        int u = cur.v;
        printf("      出队顶点 %d (dist=%d)\n", u, dist[u]);

        if (u == dest) break;

        for (int v = 1; v <= N_VERT; v++) {
            if (adj[u][v] && dist[v] > dist[u] + 1) {
                dist[v]         = dist[u] + 1;
                prev[v]         = u;
                queue[q_tail].v = v;
                q_tail++;
                printf("        入队顶点 %d (dist=%d, 前驱=%d)\n", v, dist[v], u);
            }
        }
    }

    /* 回溯路径 */
    printf("\n    最短路径 (BFS 回溯):\n    ");
    if (dist[dest] == INF) {
        printf("无路径\n");
        return;
    }

    /* 用递推(迭代)形式打印最短路径 */
    printf("  [迭代回溯] ");
    int trace[MAXV], tcnt = 0;
    int v = dest;
    while (v != -1) {
        trace[tcnt++] = v;
        v = prev[v];
    }
    /* 逆序打印 */
    for (int i = tcnt - 1; i >= 0; i--) {
        if (i < tcnt - 1) printf(" -> ");
        printf("%d", trace[i]);
    }
    printf("  (最短长度 %d)\n", dist[dest]);
}

/* ─────────────────────── 主函数 ─────────────────────── */

int main(void)
{
    int src  = 5;
    int dest = 2;

    printf("========================================================\n");
    printf("     Part 2 – 有向图路径搜索 (Graph Path Search)        \n");
    printf("========================================================\n");

    /* 初始化图 */
    init_graph();

    /* 图形化展示邻接矩阵 */
    printf("\n  步骤 1: 邻接矩阵存储\n");
    print_adj_matrix();

    printf("  步骤 2: 邻接表展示\n");
    print_adj_list();

    /* 图示：有向图边集 */
    printf("  有向图 G 的边集:\n");
    printf("  5->1  5->2  5->3\n");
    printf("  1->2  1->4\n");
    printf("  3->1  3->4\n");
    printf("  4->2  4->6\n");
    printf("  6->2\n\n");

    /* ── DFS: 所有简单路径 ── */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 3: DFS – 从顶点 %d 到顶点 %d 的所有简单路径\n\n", src, dest);
    total_paths = 0;
    memset(visited, 0, sizeof(visited));
    path[0]  = src;
    path_len = 1;
    visited[src] = 1;
    dfs_all_paths(src, dest);
    visited[src] = 0;
    printf("\n    共找到 %d 条简单路径\n\n", total_paths);

    /* ── DFS: 长度为 3 的简单路径 ── */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 4: DFS – 从顶点 %d 到顶点 %d 的所有长度为 3 的简单路径\n\n", src, dest);
    total_len_paths = 0;
    memset(visited, 0, sizeof(visited));
    path[0]  = src;
    path_len = 1;
    visited[src] = 1;
    dfs_len_paths(src, dest, 3);
    visited[src] = 0;
    printf("\n    共找到 %d 条长度为 3 的简单路径\n\n", total_len_paths);

    /* ── BFS: 最短路径 ── */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 5: BFS (队列) – 从顶点 %d 到顶点 %d 的最短路径\n\n", src, dest);
    bfs_shortest(src, dest);

    printf("\n========================================================\n");
    printf("                   Part 2 完成\n");
    printf("========================================================\n");

    return 0;
}
