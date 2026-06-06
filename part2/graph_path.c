/*
 * 设计实验：有向图的路径搜索
 *
 * 有向图 G（6个顶点，用编号 1~6 表示）：
 *   边集：5→1, 5→3, 1→2, 1→4, 3→2, 3→4, 4→2, 4→6, 6→2
 *
 * 功能：
 *   1. 输出从顶点5到顶点2的所有简单路径
 *   2. 输出所有长度为3的简单路径
 *   3. 输出最短路径（递推/迭代 + BFS队列 + 邻接矩阵）
 *
 * I/O 模式：
 *   [1] 屏幕交互模式 — 命令行输入起止顶点，屏幕输出结果
 *   [2] 文件交互模式 — 从 part2-input.txt 读取，结果写入 part2-output.txt
 *   [3] 测试用例模式 — 运行至少 4 个预定义测试案例
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
// 新增：Windows编码头
#ifdef _WIN32
#include <windows.h>
#endif

#define MAXV 7
#define INF  0x3f3f3f3f

#define INPUT_FILE  "part2-input.txt"
#define OUTPUT_FILE "part2-output.txt"

/* 全局输出流 */
static FILE *g_out = NULL;
#define POUT (g_out ? g_out : stdout)

/* ─────────────────────────────────────────────
   邻接表存储
   ───────────────────────────────────────────── */
typedef struct ArcNode {
    int adjvex;
    struct ArcNode *next;
} ArcNode;

typedef struct {
    int       vertex;
    ArcNode  *first;
} VNode;

VNode adj_list[MAXV];
int   num_vertices = 6;

typedef struct TestCase {
    int src;
    int dst;
    const char *desc;
}TestCase;

static void set_console_utf8(void)
{
#ifdef _WIN32
    SetConsoleOutputCP(65001);  // 输出UTF-8
    SetConsoleCP(65001);        // 输入UTF-8
#endif
}

static void add_edge_list(int u, int v)
{
    ArcNode *p = (ArcNode *)malloc(sizeof(ArcNode));
    if (!p) { fprintf(stderr, "内存分配失败\n"); exit(1); }
    p->adjvex = v;
    p->next   = adj_list[u].first;
    adj_list[u].first = p;
}

/* ─────────────────────────────────────────────
   邻接矩阵存储
   ───────────────────────────────────────────── */
int adj_matrix[MAXV][MAXV];

static void add_edge_matrix(int u, int v)
{
    adj_matrix[u][v] = 1;
}

/* ─────────────────────────────────────────────
   可视化函数
   ───────────────────────────────────────────── */

static void print_adj_matrix(void)
{
    fprintf(POUT, "\n  邻接矩阵（行=出发顶点, 列=到达顶点）:\n\n");
    fprintf(POUT, "      ");
    for (int j = 1; j <= num_vertices; j++) fprintf(POUT, "  %d", j);
    fprintf(POUT, "\n    ┌");
    for (int j = 1; j <= num_vertices; j++) fprintf(POUT, "───");
    fprintf(POUT, "─┐\n");
    for (int i = 1; i <= num_vertices; i++) {
        fprintf(POUT, "  %d │", i);
        for (int j = 1; j <= num_vertices; j++) {
            fprintf(POUT, "  %d", adj_matrix[i][j]);
        }
        fprintf(POUT, "  │\n");
    }
    fprintf(POUT, "    └");
    for (int j = 1; j <= num_vertices; j++) fprintf(POUT, "───");
    fprintf(POUT, "─┘\n");
}

static void print_adj_list(void)
{
    fprintf(POUT, "\n  邻接表:\n");
    for (int i = 1; i <= num_vertices; i++) {
        fprintf(POUT, "    [%d] →", i);
        ArcNode *p = adj_list[i].first;
        if (!p) { fprintf(POUT, " NULL"); }
        while (p) {
            fprintf(POUT, " [%d] →", p->adjvex);
            p = p->next;
        }
        fprintf(POUT, " NULL\n");
    }
    fprintf(POUT, "\n");
}

static void print_graph_info(void)
{
    fprintf(POUT, "\n┌──────────────────────────────────────────────────────────────────────┐\n");
    fprintf(POUT, "│                      有向图 G 结构描述                              │\n");
    fprintf(POUT, "├──────────────────────────────────────────────────────────────────────┤\n");
    fprintf(POUT, "│  顶点集: {1, 2, 3, 4, 5, 6}                                        │\n");
    fprintf(POUT, "│  边   集: 5→1, 5→3, 1→2, 1→4, 3→2, 3→4, 4→2, 4→6, 6→2           │\n");
    fprintf(POUT, "│                                                                      │\n");
    fprintf(POUT, "│  图示（有向）:                                                       │\n");
    fprintf(POUT, "│                                                                      │\n");
    fprintf(POUT, "│        5                                                             │\n");
    fprintf(POUT, "│       / \\                                                           │\n");
    fprintf(POUT, "│      ↓   ↓                                                          │\n");
    fprintf(POUT, "│      1   3                                                           │\n");
    fprintf(POUT, "│     /|   |\\                                                         │\n");
    fprintf(POUT, "│    ↓ ↓   ↓ ↓                                                       │\n");
    fprintf(POUT, "│    2  4  2  4                                                        │\n");
    fprintf(POUT, "│       |     |                                                        │\n");
    fprintf(POUT, "│       ↓     ↓                                                       │\n");
    fprintf(POUT, "│      2,6   2,6                                                       │\n");
    fprintf(POUT, "│        ↓                                                             │\n");
    fprintf(POUT, "│        2                                                             │\n");
    fprintf(POUT, "│                                                                      │\n");
    fprintf(POUT, "│  合并后路径示意:  5→{1,3}→{2,4}→{2,6}→2                          │\n");
    fprintf(POUT, "└──────────────────────────────────────────────────────────────────────┘\n");
}

/* ─────────────────────────────────────────────
   DFS 枚举所有简单路径
   ───────────────────────────────────────────── */
int   path[MAXV];
int   path_len;
int   visited[MAXV];
int   path_count;

static void print_path(int depth)
{
    path_count++;
    fprintf(POUT, "    路径%2d: ", path_count);
    for (int i = 0; i <= depth; i++) {
        fprintf(POUT, "%d", path[i]);
        if (i < depth) fprintf(POUT, " → ");
    }
    fprintf(POUT, "  (长度=%d)\n", depth);
}

static void dfs(int cur, int end, int depth, int limit)
{
    if (cur == end) {
        if (limit == 0 || depth == limit) {
            print_path(depth);
        }
        return;
    }
    if (limit > 0 && depth >= limit) return;

    ArcNode *p = adj_list[cur].first;
    while (p) {
        int v = p->adjvex;
        if (!visited[v]) {
            visited[v] = 1;
            path[depth + 1] = v;
            dfs(v, end, depth + 1, limit);
            visited[v] = 0;
        }
        p = p->next;
    }
}

static void dfs_matrix(int cur, int end, int depth, int limit)
{
    if (cur == end) {
        if (limit == 0 || depth == limit) {
            print_path(depth);
        }
        return;
    }
    if (limit > 0 && depth >= limit) return;

    for (int v = 1; v <= num_vertices; v++) {
        if (adj_matrix[cur][v] && !visited[v]) {
            visited[v] = 1;
            path[depth + 1] = v;
            dfs_matrix(v, end, depth + 1, limit);
            visited[v] = 0;
        }
    }
}

/* ─────────────────────────────────────────────
   BFS 求最短路径
   ───────────────────────────────────────────── */
#define QUEUE_SIZE 256

typedef struct {
    int data[QUEUE_SIZE];
    int front, rear;
} Queue;

static void queue_init(Queue *q)      { q->front = q->rear = 0; }
static int  queue_empty(Queue *q)     { return q->front == q->rear; }
static void enqueue(Queue *q, int x)  { q->data[q->rear++ % QUEUE_SIZE] = x; }
static int  dequeue(Queue *q)         { return q->data[q->front++ % QUEUE_SIZE]; }

static int bfs_shortest(int src, int dst, int parent[], int use_matrix)
{
    int   dist[MAXV];
    Queue q;

    for (int i = 0; i < MAXV; i++) { dist[i] = INF; parent[i] = -1; }
    queue_init(&q);

    dist[src] = 0;
    enqueue(&q, src);

    while (!queue_empty(&q)) {
        int u = dequeue(&q);
        fprintf(POUT, "    出队: %d\n", u);

        if (u == dst) break;

        if (use_matrix) {
            for (int v = 1; v <= num_vertices; v++) {
                if (adj_matrix[u][v] && dist[v] == INF) {
                    dist[v]   = dist[u] + 1;
                    parent[v] = u;
                    fprintf(POUT, "    入队: %d (dist=%d, 前驱=%d)\n", v, dist[v], u);
                    enqueue(&q, v);
                }
            }
        } else {
            ArcNode *p = adj_list[u].first;
            while (p) {
                int v = p->adjvex;
                if (dist[v] == INF) {
                    dist[v]   = dist[u] + 1;
                    parent[v] = u;
                    fprintf(POUT, "    入队: %d (dist=%d, 前驱=%d)\n", v, dist[v], u);
                    enqueue(&q, v);
                }
                p = p->next;
            }
        }
    }

    return (dist[dst] == INF) ? -1 : dist[dst];
}

static void print_path_iterative(int parent[], int dst)
{
    int stack[MAXV], top = 0;
    int cur = dst;
    while (cur != -1) {
        stack[top++] = cur;
        cur = parent[cur];
    }

    fprintf(POUT, "\n  ● 迭代方式打印 path 数组（parent[]）:\n\n");
    fprintf(POUT, "    parent 数组内容：\n");
    fprintf(POUT, "    顶点: ");
    for (int i = 1; i <= num_vertices; i++) fprintf(POUT, "  %d", i);
    fprintf(POUT, "\n    前驱: ");
    for (int i = 1; i <= num_vertices; i++) {
        if (parent[i] == -1) fprintf(POUT, "  -");
        else                  fprintf(POUT, "  %d", parent[i]);
    }
    fprintf(POUT, "\n\n");

    fprintf(POUT, "    迭代回溯过程:\n");
    int step = 1;
    int cur2 = dst;
    while (cur2 != -1) {
        if (parent[cur2] == -1)
            fprintf(POUT, "      第%d步: parent[%d]=-1 → 到达起点 %d, 停止\n", step, cur2, cur2);
        else
            fprintf(POUT, "      第%d步: parent[%d]=%d → 继续回溯\n", step, cur2, parent[cur2]);
        cur2 = parent[cur2];
        step++;
    }

    fprintf(POUT, "\n    最短路径（正向）: ");
    for (int i = top - 1; i >= 0; i--) {
        fprintf(POUT, "%d", stack[i]);
        if (i > 0) fprintf(POUT, " → ");
    }
    fprintf(POUT, "\n");
}

static void print_shortest_path_visual(int parent[], int dst, int dist)
{
    int stack[MAXV], top = 0;
    int cur = dst;
    while (cur != -1) {
        stack[top++] = cur;
        cur = parent[cur];
    }

    fprintf(POUT, "\n  ✓ 最短路径（长度=%d）：\n    ", dist);
    for (int i = top - 1; i >= 0; i--) {
        fprintf(POUT, "%d", stack[i]);
        if (i > 0) fprintf(POUT, " → ");
    }
    fprintf(POUT, "\n\n");

    fprintf(POUT, "  路径可视化:\n\n    ┌───┐");
    for (int i = top - 2; i >= 0; i--) fprintf(POUT, "   ┌───┐");
    fprintf(POUT, "\n    │ %d │", stack[top - 1]);
    for (int i = top - 2; i >= 0; i--) fprintf(POUT, " → │ %d │", stack[i]);
    fprintf(POUT, "\n    └───┘");
    for (int i = top - 2; i >= 0; i--) fprintf(POUT, "   └───┘");
    fprintf(POUT, "\n\n");
}

/* ─────────────────────────────────────────────
   建图
   ───────────────────────────────────────────── */
static void build_graph(void)
{
    for (int i = 1; i <= num_vertices; i++) {
        adj_list[i].vertex = i;
        adj_list[i].first  = NULL;
    }
    memset(adj_matrix, 0, sizeof(adj_matrix));

    int edges[][2] = {
        {5,3},{5,1},
        {1,4},{1,2},
        {3,4},{3,2},
        {4,6},{4,2},
        {6,2}
    };
    int ne = (int)(sizeof(edges) / sizeof(edges[0]));
    for (int i = 0; i < ne; i++) {
        add_edge_list(edges[i][0], edges[i][1]);
        add_edge_matrix(edges[i][0], edges[i][1]);
    }
}

static void free_graph(void)
{
    for (int i = 1; i <= num_vertices; i++) {
        ArcNode *p = adj_list[i].first;
        while (p) {
            ArcNode *tmp = p->next;
            free(p);
            p = tmp;
        }
        adj_list[i].first = NULL;
    }
}

/* ─────────────────────────────────────────────
   整合：对给定 src/dst 运行全部演示
   ───────────────────────────────────────────── */
static void run_graph_search(int src, int dst)
{
    fprintf(POUT, "\n");
    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*         设计实验：有向图路径搜索  顶点 %d → 顶点 %d           *\n", src, dst);
    fprintf(POUT, "*****************************************************************\n");

    print_graph_info();

    fprintf(POUT, "\n  邻接表存储结构:\n");
    print_adj_list();

    /* 任务1：所有简单路径（邻接表 DFS） */
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务1】顶点 %d → 顶点 %d 的所有简单路径（DFS 邻接表）\n", src, dst);
    fprintf(POUT, "=================================================================\n\n");

    memset(visited, 0, sizeof(visited));
    path[0]    = src;
    path_count = 0;
    visited[src] = 1;
    dfs(src, dst, 0, 0);
    visited[src] = 0;
    fprintf(POUT, "\n  共找到 %d 条简单路径\n\n", path_count);

    /* 任务2：长度为3的简单路径 */
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务2】顶点 %d → 顶点 %d 的所有长度为 3 的简单路径\n", src, dst);
    fprintf(POUT, "=================================================================\n\n");

    memset(visited, 0, sizeof(visited));
    path[0]    = src;
    path_count = 0;
    visited[src] = 1;
    dfs(src, dst, 0, 3);
    visited[src] = 0;
    fprintf(POUT, "\n  共找到 %d 条长度为 3 的简单路径\n\n", path_count);

    /* 任务3-B：BFS 最短路径（邻接表） */
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务3-B】BFS（队列）求顶点 %d → 顶点 %d 的最短路径（邻接表）\n", src, dst);
    fprintf(POUT, "=================================================================\n\n");

    int parent_list[MAXV];
    fprintf(POUT, "  BFS 过程:\n");
    int dist_list = bfs_shortest(src, dst, parent_list, 0);

    if (dist_list < 0) {
        fprintf(POUT, "  ✗ 不可达\n\n");
    } else {
        print_shortest_path_visual(parent_list, dst, dist_list);
    }

    /* 任务3-A：迭代方式打印 path 数组 */
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务3-A】递推（迭代）方式打印最短路径的 path 数组\n");
    fprintf(POUT, "=================================================================\n");
    if (dist_list >= 0) {
        print_path_iterative(parent_list, dst);
    } else {
        fprintf(POUT, "  （不可达，无路径可打印）\n");
    }
    fprintf(POUT, "\n");

    /* 任务3-C：邻接矩阵 */
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务3-C】邻接矩阵存储——所有简单路径 + BFS 最短路径\n");
    fprintf(POUT, "=================================================================\n");

    fprintf(POUT, "\n  邻接矩阵存储结构:\n");
    print_adj_matrix();

    fprintf(POUT, "\n  ● 邻接矩阵 DFS：顶点 %d → 顶点 %d 的所有简单路径\n\n", src, dst);
    memset(visited, 0, sizeof(visited));
    path[0]    = src;
    path_count = 0;
    visited[src] = 1;
    dfs_matrix(src, dst, 0, 0);
    visited[src] = 0;
    fprintf(POUT, "\n  共找到 %d 条简单路径\n\n", path_count);

    fprintf(POUT, "\n  ● 邻接矩阵 BFS：顶点 %d → 顶点 %d 的最短路径\n\n", src, dst);
    int parent_mat[MAXV];
    fprintf(POUT, "  BFS 过程:\n");
    int dist_mat = bfs_shortest(src, dst, parent_mat, 1);

    if (dist_mat < 0) {
        fprintf(POUT, "  ✗ 不可达\n\n");
    } else {
        print_shortest_path_visual(parent_mat, dst, dist_mat);
    }

    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*                     图路径搜索演示完毕                          *\n");
    fprintf(POUT, "*****************************************************************\n\n");
}

/* ─────────────────────────────────────────────
   UI：菜单
   ───────────────────────────────────────────── */
static void show_menu(void)
{
    printf("\n");
    printf("╔══════════════════════════════════════════════╗\n");
    printf("║         设计实验：有向图路径搜索               ║\n");
    printf("╠══════════════════════════════════════════════╣\n");
    printf("║  [1] 屏幕交互模式（命令行输入输出）            ║\n");
    printf("║  [2] 文件交互模式（文件输入输出）              ║\n");
    printf("║  [3] 运行测试用例                             ║\n");
    printf("║  [0] 退出程序                                 ║\n");
    printf("╠══════════════════════════════════════════════╣\n");
    printf("║  请输入选项: ");
}

/* 模式1：屏幕交互 */
static void screen_mode(void)
{
    g_out = stdout;
    printf("\n【屏幕交互模式】\n");
    printf("  图含顶点 1~%d，边集：5→1, 5→3, 1→2, 1→4, 3→2, 3→4, 4→2, 4→6, 6→2\n",
           num_vertices);
    int src, dst;
    printf("  请输入起点顶点（1~%d）: ", num_vertices);
    if (scanf("%d", &src) != 1 || src < 1 || src > num_vertices) {
        printf("  输入无效\n");
        return;
    }
    printf("  请输入终点顶点（1~%d）: ", num_vertices);
    if (scanf("%d", &dst) != 1 || dst < 1 || dst > num_vertices) {
        printf("  输入无效\n");
        return;
    }
    run_graph_search(src, dst);
}

/* 模式2：文件交互 */
static void file_mode(void)
{
    FILE *fin = fopen(INPUT_FILE, "r");
    if (!fin) {
        printf("  ✗ 无法打开输入文件 %s\n", INPUT_FILE);
        printf("    请创建文件，格式：首行为查询对数，之后每行 src dst。\n");
        printf("    示例：\n");
        printf("      2\n");
        printf("      5 2\n");
        printf("      1 6\n");
        return;
    }

    int n;
    if (fscanf(fin, "%d", &n) != 1 || n <= 0) {
        printf("  ✗ 输入文件格式错误\n");
        fclose(fin);
        return;
    }

    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s\n", OUTPUT_FILE);
        fclose(fin);
        return;
    }

    printf("  ✓ 从文件 %s 读取 %d 组查询\n", INPUT_FILE, n);
    printf("  ✓ 结果将写入文件 %s\n", OUTPUT_FILE);

    g_out = fout;
    fprintf(g_out, "========================================\n");
    fprintf(g_out, "有向图路径搜索文件交互模式输出\n");
    fprintf(g_out, "输入文件：%s\n", INPUT_FILE);
    fprintf(g_out, "========================================\n");

    for (int i = 0; i < n; i++) {
        int src, dst;
        if (fscanf(fin, "%d %d", &src, &dst) != 2) {
            fprintf(g_out, "  ✗ 读取第 %d 组查询失败\n", i + 1);
            break;
        }
        fprintf(g_out, "\n[查询 %d/%d] 起点=%d 终点=%d\n", i + 1, n, src, dst);
        run_graph_search(src, dst);
    }

    fprintf(g_out, "========================================\n");
    fprintf(g_out, "文件交互模式结束\n");
    fprintf(g_out, "========================================\n");

    fclose(fin);
    fclose(fout);
    g_out = stdout;
    printf("  ✓ 完成，结果已保存至 %s\n", OUTPUT_FILE);
}

/* 模式3：测试用例
   等价类划分 + 边界值分析：
     TC1  正常案例 — src=5, dst=2（多条路径，题目默认）
     TC2  正常案例 — src=5, dst=6（存在路径，路径较少）
     TC3  等价类   — src=2, dst=5（不可达，顶点2无出边）
     TC4  边界值   — src=1, dst=1（起点=终点，应为0条路径/长度0）
*/
static void test_mode(void)
{
    TestCase cases[] = {
        {5, 2, "TC1 正常案例 — src=5, dst=2（多条路径）"},
        {5, 6, "TC2 正常案例 — src=5, dst=6（路径经过4→6）"},
        {2, 5, "TC3 等价类   — src=2, dst=5（不可达）"},
        {1, 1, "TC4 边界值   — src=1, dst=1（起点等于终点）"},
    };
    int num_cases = (int)(sizeof(cases) / sizeof(cases[0]));

    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s，结果仅输出至屏幕\n", OUTPUT_FILE);
    }

    printf("\n【测试用例模式】共 %d 个测试案例\n", num_cases);
    if (fout) {
        printf("  ✓ 测试结果同步写入 %s\n", OUTPUT_FILE);
        fprintf(fout, "========================================\n");
        fprintf(fout, "有向图路径搜索 — 测试用例输出\n");
        fprintf(fout, "测试案例数：%d\n", num_cases);
        fprintf(fout, "========================================\n");
    }

    for (int i = 0; i < num_cases; i++) {
        printf("\n══════════════════════════════════════════\n");
        printf("  %s\n", cases[i].desc);
        printf("══════════════════════════════════════════\n");

        g_out = stdout;
        run_graph_search(cases[i].src, cases[i].dst);

        if (fout) {
            fprintf(fout, "\n══════════════════════════════════════════\n");
            fprintf(fout, "  %s\n", cases[i].desc);
            fprintf(fout, "══════════════════════════════════════════\n");
            g_out = fout;
            run_graph_search(cases[i].src, cases[i].dst);
        }
    }

    if (fout) {
        fprintf(fout, "========================================\n");
        fprintf(fout, "测试完毕\n");
        fprintf(fout, "========================================\n");
        fclose(fout);
        g_out = stdout;
        printf("\n  ✓ 所有测试案例完成，结果已保存至 %s\n", OUTPUT_FILE);
    }
}

/* ─────────────────────────────────────────────
   主函数（菜单驱动）
   ───────────────────────────────────────────── */
int main(void)
{
    set_console_utf8(); // 新增首行
    g_out = stdout;
    build_graph();

    int choice;
    for (;;) {
        show_menu();
        if (scanf("%d", &choice) != 1) {
            printf("  输入无效，请重新输入\n");
            int c;
            while ((c = getchar()) != '\n' && c != EOF);
            continue;
        }
        printf("  ║\n");
        printf("  ╚══════════════════════════════════════════════╝\n");

        switch (choice) {
            case 1: screen_mode(); break;
            case 2: file_mode();   break;
            case 3: test_mode();   break;
            case 0:
                printf("\n  再见！\n\n");
                free_graph();
                return 0;
            default:
                printf("\n  无效选项，请输入 0~3\n");
        }
    }
}
