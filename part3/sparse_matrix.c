/*
 * 综合实验：稀疏矩阵转置算法
 *
 * 功能：
 *   1. 快速稀疏矩阵转置算法（Fast Transpose）
 *   2. 进一步优化：用更少存储空间的版本
 *   3. 时间复杂度分析，与非快速算法对比
 *
 * I/O 模式：
 *   [1] 屏幕交互模式 — 命令行演示（默认/手动/随机/预定义测试案例）
 *   [2] 文件交互模式 — 从 part3-input.txt 读取矩阵，结果写入 part3-output.txt
 *   [3] 测试用例模式 — 运行 6 个预定义测试案例
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ─────────────────────────────────────────────
   三元组表（稀疏矩阵压缩存储）
   ───────────────────────────────────────────── */
#define MAXTERMS 1000
#define MAXDIM    50
#define MAX_TEST_CASES 10

#define INPUT_FILE  "part3-input.txt"
#define OUTPUT_FILE "part3-output.txt"

typedef struct {
    int row, col, val;
} Triple;

typedef struct {
    Triple data[MAXTERMS + 1];
    int    rows, cols, terms;
} TSMatrix;

/* 全局输出流 */
static FILE *g_out = NULL;
#define POUT (g_out ? g_out : stdout)

/* ─────────────────────────────────────────────
   默认示例矩阵（6×6）
   ─────────────────────────────────────────────
   M =
      0  12   9   0   0   0
      0   0   0   0   0   0
     -3   0   0   0   0  14
      0   0  24   0  18   0
     15   0   0  -7   0   0
      0   0  -4   0   0   0
   ───────────────────────────────────────────── */
static int default_arr[6][6] = {
    { 0, 12,  9,  0,  0,  0},
    { 0,  0,  0,  0,  0,  0},
    {-3,  0,  0,  0,  0, 14},
    { 0,  0, 24,  0, 18,  0},
    {15,  0,  0, -7,  0,  0},
    { 0,  0, -4,  0,  0,  0}
};

typedef struct {
    int arr[MAXDIM][MAXDIM];
    int rows, cols;
    const char *desc;
} MatrixCase;

static void fill_default_matrix(int arr[][MAXDIM], int *rows, int *cols)
{
    memset(arr, 0, sizeof(int[MAXDIM][MAXDIM]));
    for (int i = 0; i < 6; i++)
        for (int j = 0; j < 6; j++)
            arr[i][j] = default_arr[i][j];
    *rows = 6;
    *cols = 6;
}

static int random_non_zero_value(void)
{
    int v;
    do {
        v = (rand() % 19) - 9; /* [-9, 9] */
    } while (v == 0);
    return v;
}

static void generate_random_matrix(int arr[][MAXDIM], int rows, int cols, int sparsity_pct)
{
    memset(arr, 0, sizeof(int[MAXDIM][MAXDIM]));
    if (rows <= 0 || cols <= 0) return;

    int total = rows * cols;
    int safe_sparsity = sparsity_pct;
    if (safe_sparsity < 0) safe_sparsity = 0;
    if (safe_sparsity > 100) safe_sparsity = 100;
    /* 四舍五入（half-up）：与 JS 侧的 floor(x + 0.5) 保持一致 */
    int nonzero_count = (total * (100 - safe_sparsity) + 50) / 100;
    if (nonzero_count <= 0) return;
    if (nonzero_count > total) nonzero_count = total;

    int pos[MAXDIM * MAXDIM];
    for (int i = 0; i < total; i++) pos[i] = i;
    for (int i = total - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int t = pos[i];
        pos[i] = pos[j];
        pos[j] = t;
    }

    for (int k = 0; k < nonzero_count; k++) {
        int idx = pos[k];
        int r = idx / cols;
        int c = idx % cols;
        arr[r][c] = random_non_zero_value();
    }
}

static int get_predefined_case_count(void)
{
    return 6;
}

static int load_predefined_case(int index, MatrixCase *out)
{
    memset(out->arr, 0, sizeof(out->arr));
    switch (index) {
        case 0: /* TC1 等价类 */
            out->rows = 4; out->cols = 5;
            out->arr[0][1] = 8;  out->arr[0][4] = -3;
            out->arr[1][0] = 5;
            out->arr[2][3] = 4;
            out->arr[3][2] = 6;
            out->desc = "TC1 等价类  — 4×5 一般稀疏矩阵（正常输入）";
            return 1;
        case 1: /* TC2 边界值：全零 */
            out->rows = 3; out->cols = 3;
            out->desc = "TC2 边界值  — 3×3 全零矩阵（terms=0）";
            return 1;
        case 2: /* TC3 边界值：全非零 */
            out->rows = 3; out->cols = 3;
            out->arr[0][0] = 1;  out->arr[0][1] = -2; out->arr[0][2] = 3;
            out->arr[1][0] = 4;  out->arr[1][1] = 5;  out->arr[1][2] = -6;
            out->arr[2][0] = 7;  out->arr[2][1] = -8; out->arr[2][2] = 9;
            out->desc = "TC3 边界值  — 3×3 全非零矩阵（最密集）";
            return 1;
        case 3: /* TC4 特殊：仅第一行非零 */
            out->rows = 4; out->cols = 6;
            out->arr[0][0] = 3; out->arr[0][1] = -1; out->arr[0][2] = 5;
            out->arr[0][3] = 7; out->arr[0][4] = -4; out->arr[0][5] = 2;
            out->desc = "TC4 特殊分布 — 仅第一行有非零元素";
            return 1;
        case 4: /* TC5 特殊：仅第一列非零 */
            out->rows = 6; out->cols = 4;
            out->arr[0][0] = 9;  out->arr[1][0] = -7; out->arr[2][0] = 5;
            out->arr[3][0] = -3; out->arr[4][0] = 2;  out->arr[5][0] = 4;
            out->desc = "TC5 特殊分布 — 仅第一列有非零元素";
            return 1;
        case 5: /* TC6 特殊：上三角 */
            out->rows = 5; out->cols = 5;
            out->arr[0][0] = 2; out->arr[0][1] = -1; out->arr[0][2] = 3; out->arr[0][3] = 4; out->arr[0][4] = 5;
            out->arr[1][1] = 6; out->arr[1][2] = -2; out->arr[1][3] = 7; out->arr[1][4] = 8;
            out->arr[2][2] = 9; out->arr[2][3] = -3; out->arr[2][4] = 1;
            out->arr[3][3] = 4; out->arr[3][4] = -6;
            out->arr[4][4] = 7;
            out->desc = "TC6 特殊分布 — 上三角非零元素";
            return 1;
        default:
            return 0;
    }
}

/* ─────────────────────────────────────────────
   从二维数组建立三元组表
   ───────────────────────────────────────────── */
static void build_tsmatrix_from_arr(TSMatrix *M, int arr[][MAXDIM],
                                    int rows, int cols)
{
    M->rows  = rows;
    M->cols  = cols;
    M->terms = 0;
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (arr[i][j] != 0) {
                if (M->terms >= MAXTERMS) {
                    fprintf(stderr, "非零元素超出上限 %d\n", MAXTERMS);
                    return;
                }
                M->terms++;
                M->data[M->terms].row = i + 1;
                M->data[M->terms].col = j + 1;
                M->data[M->terms].val = arr[i][j];
            }
        }
    }
}

/* ─────────────────────────────────────────────
   可视化：打印原始矩阵（二维形式）
   ───────────────────────────────────────────── */
static void print_matrix_2d(const TSMatrix *M, const char *title)
{
    int arr[MAXDIM + 1][MAXDIM + 1];
    memset(arr, 0, sizeof(arr));
    for (int t = 1; t <= M->terms; t++) {
        arr[M->data[t].row][M->data[t].col] = M->data[t].val;
    }

    fprintf(POUT, "\n  %s（%d×%d，共 %d 个非零元素）:\n\n",
            title, M->rows, M->cols, M->terms);
    fprintf(POUT, "       ");
    for (int j = 1; j <= M->cols; j++) fprintf(POUT, "列%-3d  ", j);
    fprintf(POUT, "\n    ┌─");
    for (int j = 1; j <= M->cols; j++) fprintf(POUT, "──────");
    fprintf(POUT, "─┐\n");
    for (int i = 1; i <= M->rows; i++) {
        fprintf(POUT, "  行%d │", i);
        for (int j = 1; j <= M->cols; j++) {
            fprintf(POUT, "  %4d", arr[i][j]);
        }
        fprintf(POUT, "  │\n");
    }
    fprintf(POUT, "    └─");
    for (int j = 1; j <= M->cols; j++) fprintf(POUT, "──────");
    fprintf(POUT, "─┘\n");
}

/* ─────────────────────────────────────────────
   可视化：打印三元组表
   ───────────────────────────────────────────── */
static void print_tsmatrix(const TSMatrix *M, const char *title)
{
    fprintf(POUT, "\n  %s 三元组表（rows=%d, cols=%d, terms=%d）:\n\n",
           title, M->rows, M->cols, M->terms);
    fprintf(POUT, "    ┌──────┬──────┬──────────┐\n");
    fprintf(POUT, "    │  行  │  列  │   值     │\n");
    fprintf(POUT, "    ├──────┼──────┼──────────┤\n");
    if (M->terms == 0) {
        fprintf(POUT, "    │      （无非零元素）       │\n");
    }
    for (int t = 1; t <= M->terms; t++) {
        fprintf(POUT, "    │  %2d  │  %2d  │  %6d  │\n",
               M->data[t].row, M->data[t].col, M->data[t].val);
    }
    fprintf(POUT, "    └──────┴──────┴──────────┘\n");
}

/* ─────────────────────────────────────────────
   普通转置：O(cols × terms)
   ───────────────────────────────────────────── */
static void transpose_naive(const TSMatrix *M, TSMatrix *T)
{
    T->rows  = M->cols;
    T->cols  = M->rows;
    T->terms = M->terms;

    if (M->terms == 0) return;

    int q = 1;
    for (int col = 1; col <= M->cols; col++) {
        for (int p = 1; p <= M->terms; p++) {
            if (M->data[p].col == col) {
                T->data[q].row = M->data[p].col;
                T->data[q].col = M->data[p].row;
                T->data[q].val = M->data[p].val;
                q++;
            }
        }
    }
}

/* ─────────────────────────────────────────────
   快速转置：O(cols + terms)
   ───────────────────────────────────────────── */
static void transpose_fast(const TSMatrix *M, TSMatrix *T)
{
    T->rows  = M->cols;
    T->cols  = M->rows;
    T->terms = M->terms;

    if (M->terms == 0) return;

    int num[MAXTERMS]  = {0};
    int cpot[MAXTERMS] = {0};

    for (int t = 1; t <= M->terms; t++) {
        num[M->data[t].col]++;
    }

    cpot[1] = 1;
    for (int col = 2; col <= M->cols; col++) {
        cpot[col] = cpot[col - 1] + num[col - 1];
    }

    for (int t = 1; t <= M->terms; t++) {
        int col = M->data[t].col;
        int q   = cpot[col];
        T->data[q].row = M->data[t].col;
        T->data[q].col = M->data[t].row;
        T->data[q].val = M->data[t].val;
        cpot[col]++;
    }
}

/* ─────────────────────────────────────────────
   快速转置辅助数组可视化
   ───────────────────────────────────────────── */
static void print_fast_transpose_detail(const TSMatrix *M)
{
    int num[MAXTERMS]  = {0};
    int cpot[MAXTERMS] = {0};

    for (int t = 1; t <= M->terms; t++) num[M->data[t].col]++;
    cpot[1] = 1;
    for (int col = 2; col <= M->cols; col++) cpot[col] = cpot[col-1] + num[col-1];

    fprintf(POUT, "\n  快速转置辅助数组（按原矩阵列编号 1~%d）:\n\n", M->cols);
    fprintf(POUT, "    ┌──────");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "┬──────");
    fprintf(POUT, "┐\n");
    fprintf(POUT, "    │ 列号 ");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "│  %-3d ", c);
    fprintf(POUT, "│\n");
    fprintf(POUT, "    ├──────");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "┼──────");
    fprintf(POUT, "┤\n");
    fprintf(POUT, "    │ num  ");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "│  %-3d ", num[c]);
    fprintf(POUT, "│  (每列非零元个数)\n");
    fprintf(POUT, "    ├──────");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "┼──────");
    fprintf(POUT, "┤\n");
    fprintf(POUT, "    │ cpot ");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "│  %-3d ", cpot[c]);
    fprintf(POUT, "│  (该列在T中的起始位置)\n");
    fprintf(POUT, "    └──────");
    for (int c = 1; c <= M->cols; c++) fprintf(POUT, "┴──────");
    fprintf(POUT, "┘\n");
}

/* ─────────────────────────────────────────────
   优化版快速转置：只用 1 个辅助数组
   ───────────────────────────────────────────── */
static void transpose_fast_optimized(const TSMatrix *M, TSMatrix *T)
{
    T->rows  = M->cols;
    T->cols  = M->rows;
    T->terms = M->terms;

    if (M->terms == 0) return;

    int *cpot = (int *)calloc(M->cols + 1, sizeof(int));
    if (!cpot) { fprintf(stderr, "内存分配失败\n"); exit(1); }

    for (int t = 1; t <= M->terms; t++) cpot[M->data[t].col]++;

    {
        int acc = M->terms + 1;
        for (int c = M->cols; c >= 1; c--) {
            acc -= cpot[c];
            cpot[c] = acc;
        }
    }

    for (int t = 1; t <= M->terms; t++) {
        int col = M->data[t].col;
        int q   = cpot[col];
        T->data[q].row = M->data[t].col;
        T->data[q].col = M->data[t].row;
        T->data[q].val = M->data[t].val;
        cpot[col]++;
    }

    free(cpot);
}

/* ─────────────────────────────────────────────
   时间复杂度对比分析
   ───────────────────────────────────────────── */
static void complexity_analysis(int rows, int cols, int terms)
{
    fprintf(POUT, "\n┌──────────────────────────────────────────────────────────────────────────────┐\n");
    fprintf(POUT, "│                       时间复杂度与空间复杂度对比分析                        │\n");
    fprintf(POUT, "├──────────────────────┬──────────────────────────────────────────────────────┤\n");
    fprintf(POUT, "│      算法            │   说明                                               │\n");
    fprintf(POUT, "├──────────────────────┼──────────────────────────────────────────────────────┤\n");
    fprintf(POUT, "│ 普通转置（非快速）   │ 时间: O(cols × terms)                               │\n");
    fprintf(POUT, "│                      │ 空间: O(1)（不含输出）                              │\n");
    fprintf(POUT, "├──────────────────────┼──────────────────────────────────────────────────────┤\n");
    fprintf(POUT, "│ 快速转置             │ 时间: O(cols + terms)                               │\n");
    fprintf(POUT, "│                      │ 空间: O(cols)（两个辅助数组 num, cpot）             │\n");
    fprintf(POUT, "├──────────────────────┼──────────────────────────────────────────────────────┤\n");
    fprintf(POUT, "│ 优化快速转置         │ 时间: O(cols + terms)                               │\n");
    fprintf(POUT, "│                      │ 空间: O(cols)（只用 1 个辅助数组）                  │\n");
    fprintf(POUT, "└──────────────────────┴──────────────────────────────────────────────────────┘\n");

    fprintf(POUT, "\n  当前示例参数: rows=%d, cols=%d, terms=%d\n\n", rows, cols, terms);

    long naive_ops = (long)cols * terms;
    long fast_ops  = cols + terms;

    fprintf(POUT, "  操作次数估算:\n");
    fprintf(POUT, "    普通转置: cols × terms = %d × %d = %ld 次\n", cols, terms, naive_ops);
    fprintf(POUT, "    快速转置: cols + terms = %d + %d = %ld 次\n", cols, terms, fast_ops);
    if (fast_ops > 0 && naive_ops > 0) {
        fprintf(POUT, "    加速比   : ≈ %.1f 倍\n", (double)naive_ops / fast_ops);
    }
    fprintf(POUT, "\n");
}

/* 验证两个转置矩阵是否相同 */
static int verify_equal(const TSMatrix *A, const TSMatrix *B)
{
    if (A->rows != B->rows || A->cols != B->cols || A->terms != B->terms)
        return 0;
    for (int t = 1; t <= A->terms; t++) {
        if (A->data[t].row != B->data[t].row ||
            A->data[t].col != B->data[t].col ||
            A->data[t].val != B->data[t].val)
            return 0;
    }
    return 1;
}

/* ─────────────────────────────────────────────
   整合：对给定矩阵运行全部转置演示
   ───────────────────────────────────────────── */
static void run_all_transpose(TSMatrix *M)
{
    TSMatrix T_naive, T_fast, T_opt;

    fprintf(POUT, "\n");
    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*              综合实验：稀疏矩阵转置算法                         *\n");
    fprintf(POUT, "*****************************************************************\n");

    print_matrix_2d(M, "原始矩阵 M");
    print_tsmatrix(M, "原始矩阵 M");

    /* 任务1：快速转置 */
    fprintf(POUT, "\n=================================================================\n");
    fprintf(POUT, "【任务1】快速稀疏矩阵转置算法（Fast Transpose）\n");
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "\n  算法思路:\n");
    fprintf(POUT, "    ① 统计原矩阵每列非零元个数 → num[]\n");
    fprintf(POUT, "    ② 计算每列在转置矩阵中的起始位置 → cpot[] = 前缀和\n");
    fprintf(POUT, "    ③ 扫描原三元组表，按 cpot[col] 直接放入转置矩阵\n");

    if (M->terms > 0) {
        print_fast_transpose_detail(M);
    }
    transpose_fast(M, &T_fast);
    print_matrix_2d(&T_fast, "转置矩阵 T（快速转置）");
    print_tsmatrix(&T_fast, "转置矩阵 T（快速转置）");

    /* 任务2：优化快速转置 */
    fprintf(POUT, "\n=================================================================\n");
    fprintf(POUT, "【任务2】优化快速转置（更少存储空间）\n");
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "\n  优化思路:\n");
    fprintf(POUT, "    • 普通快速转置使用 num[] 和 cpot[] 两个辅助数组\n");
    fprintf(POUT, "    • 优化版将统计与计算合并，只用 1 个 cpot[] 数组\n");
    fprintf(POUT, "    • 辅助空间从 2×cols 降至 cols（减少约 50%%）\n\n");

    transpose_fast_optimized(M, &T_opt);
    print_matrix_2d(&T_opt, "转置矩阵 T（优化快速转置）");
    print_tsmatrix(&T_opt, "转置矩阵 T（优化快速转置）");

    /* 验证 */
    transpose_naive(M, &T_naive);
    if (verify_equal(&T_fast, &T_naive) && verify_equal(&T_opt, &T_naive)) {
        fprintf(POUT, "\n  ✓ 验证通过：三种转置算法结果完全一致\n");
    } else {
        fprintf(POUT, "\n  ✗ 验证失败：结果不一致！\n");
    }

    /* 任务3：复杂度分析 */
    fprintf(POUT, "\n=================================================================\n");
    fprintf(POUT, "【任务3】时间复杂度分析与非快速算法对比\n");
    fprintf(POUT, "=================================================================\n");

    fprintf(POUT, "\n  非快速转置（普通转置）结果:\n");
    print_matrix_2d(&T_naive, "转置矩阵 T（普通转置）");
    print_tsmatrix(&T_naive, "转置矩阵 T（普通转置）");

    complexity_analysis(M->rows, M->cols, M->terms);

    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*                   稀疏矩阵转置演示完毕                          *\n");
    fprintf(POUT, "*****************************************************************\n\n");
}

/* ─────────────────────────────────────────────
   UI：菜单
   ───────────────────────────────────────────── */
static void show_menu(void)
{
    printf("\n");
    printf("╔══════════════════════════════════════════════╗\n");
    printf("║         综合实验：稀疏矩阵转置算法             ║\n");
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
    printf("  请选择矩阵来源：\n");
    printf("    [1] 使用内置默认矩阵（6×6 示例稀疏矩阵）\n");
    printf("    [2] 手动输入矩阵\n");
    printf("    [3] 随机生成矩阵（1~15维，设置稀疏度）\n");
    printf("    [4] 预定义测试案例矩阵\n");
    printf("  请选择: ");

    int sub;
    if (scanf("%d", &sub) != 1) { printf("  输入无效\n"); return; }

    TSMatrix M;
    if (sub == 1) {
        int tmp[MAXDIM][MAXDIM];
        int rows, cols;
        fill_default_matrix(tmp, &rows, &cols);
        build_tsmatrix_from_arr(&M, tmp, rows, cols);
    } else if (sub == 2) {
        int rows, cols;
        printf("  请输入行数（≤%d）: ", MAXDIM);
        if (scanf("%d", &rows) != 1 || rows <= 0 || rows > MAXDIM) {
            printf("  行数无效\n"); return;
        }
        printf("  请输入列数（≤%d）: ", MAXDIM);
        if (scanf("%d", &cols) != 1 || cols <= 0 || cols > MAXDIM) {
            printf("  列数无效\n"); return;
        }
        int tmp[MAXDIM][MAXDIM];
        memset(tmp, 0, sizeof(tmp));
        printf("  请逐行输入矩阵元素（%d 行 × %d 列）:\n", rows, cols);
        for (int i = 0; i < rows; i++) {
            printf("  第 %d 行: ", i + 1);
            for (int j = 0; j < cols; j++) {
                if (scanf("%d", &tmp[i][j]) != 1) {
                    printf("  输入无效\n"); return;
                }
            }
        }
        build_tsmatrix_from_arr(&M, tmp, rows, cols);
    } else if (sub == 3) {
        int rows, cols, sparsity;
        int tmp[MAXDIM][MAXDIM];
        printf("  请输入行数（1~15）: ");
        if (scanf("%d", &rows) != 1 || rows <= 0 || rows > 15) {
            printf("  行数无效\n"); return;
        }
        printf("  请输入列数（1~15）: ");
        if (scanf("%d", &cols) != 1 || cols <= 0 || cols > 15) {
            printf("  列数无效\n"); return;
        }
        printf("  请输入稀疏度（0~100，表示零元素占比）: ");
        if (scanf("%d", &sparsity) != 1 || sparsity < 0 || sparsity > 100) {
            printf("  稀疏度无效\n"); return;
        }
        generate_random_matrix(tmp, rows, cols, sparsity);
        build_tsmatrix_from_arr(&M, tmp, rows, cols);
    } else if (sub == 4) {
        MatrixCase tc;
        int pick;
        int total = get_predefined_case_count();
        printf("  可选测试案例：\n");
        for (int i = 0; i < total; i++) {
            if (load_predefined_case(i, &tc)) {
                printf("    [%d] %s\n", i + 1, tc.desc);
            }
        }
        printf("  请选择案例编号（1~%d）: ", total);
        if (scanf("%d", &pick) != 1 || pick < 1 || pick > total ||
            !load_predefined_case(pick - 1, &tc)) {
            printf("  案例编号无效\n"); return;
        }
        printf("  已选择：%s\n", tc.desc);
        build_tsmatrix_from_arr(&M, tc.arr, tc.rows, tc.cols);
    } else {
        printf("  无效选项\n"); return;
    }

    run_all_transpose(&M);
}

/* 模式2：文件交互 */
static void file_mode(void)
{
    FILE *fin = fopen(INPUT_FILE, "r");
    if (!fin) {
        printf("  ✗ 无法打开输入文件 %s\n", INPUT_FILE);
        printf("    请创建文件，格式：首行 rows cols，后续 rows 行每行 cols 个整数。\n");
        printf("    示例（3×3）：\n");
        printf("      3 3\n");
        printf("      1 0 0\n");
        printf("      0 2 0\n");
        printf("      0 0 3\n");
        return;
    }

    int rows, cols;
    if (fscanf(fin, "%d %d", &rows, &cols) != 2 ||
        rows <= 0 || rows > MAXDIM || cols <= 0 || cols > MAXDIM) {
        printf("  ✗ 输入文件首行格式错误（应为：rows cols）\n");
        fclose(fin);
        return;
    }

    int tmp[MAXDIM][MAXDIM];
    memset(tmp, 0, sizeof(tmp));
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (fscanf(fin, "%d", &tmp[i][j]) != 1) {
                printf("  ✗ 读取矩阵元素失败（第%d行第%d列）\n", i+1, j+1);
                fclose(fin);
                return;
            }
        }
    }
    fclose(fin);

    TSMatrix M;
    build_tsmatrix_from_arr(&M, tmp, rows, cols);

    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s\n", OUTPUT_FILE);
        return;
    }

    printf("  ✓ 从文件 %s 读取 %d×%d 矩阵\n", INPUT_FILE, rows, cols);
    printf("  ✓ 结果将写入文件 %s\n", OUTPUT_FILE);

    g_out = fout;
    fprintf(g_out, "========================================\n");
    fprintf(g_out, "稀疏矩阵转置文件交互模式输出\n");
    fprintf(g_out, "输入文件：%s\n", INPUT_FILE);
    fprintf(g_out, "矩阵规模：%d×%d\n", rows, cols);
    fprintf(g_out, "========================================\n");

    run_all_transpose(&M);

    fprintf(g_out, "========================================\n");
    fprintf(g_out, "文件交互模式结束\n");
    fprintf(g_out, "========================================\n");

    fclose(fout);
    g_out = stdout;
    printf("  ✓ 完成，结果已保存至 %s\n", OUTPUT_FILE);
}

/* 模式3：测试用例（等价类划分 + 边界值分析 + 特殊分布） */
static void test_mode(void)
{
    int num_cases = get_predefined_case_count();
    MatrixCase cases[MAX_TEST_CASES];
    if (num_cases > MAX_TEST_CASES) num_cases = MAX_TEST_CASES;
    for (int i = 0; i < num_cases; i++) {
        if (!load_predefined_case(i, &cases[i])) {
            num_cases = i;
            break;
        }
    }

    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s，结果仅输出至屏幕\n", OUTPUT_FILE);
    }

    printf("\n【测试用例模式】共 %d 个测试案例\n", num_cases);
    if (fout) {
        printf("  ✓ 测试结果同步写入 %s\n", OUTPUT_FILE);
        fprintf(fout, "========================================\n");
        fprintf(fout, "稀疏矩阵转置 — 测试用例输出\n");
        fprintf(fout, "测试案例数：%d\n", num_cases);
        fprintf(fout, "========================================\n");
    }

    for (int i = 0; i < num_cases; i++) {
        TSMatrix M;
        build_tsmatrix_from_arr(&M, cases[i].arr, cases[i].rows, cases[i].cols);

        printf("\n══════════════════════════════════════════\n");
        printf("  %s\n", cases[i].desc);
        printf("══════════════════════════════════════════\n");

        g_out = stdout;
        run_all_transpose(&M);

        if (fout) {
            fprintf(fout, "\n══════════════════════════════════════════\n");
            fprintf(fout, "  %s\n", cases[i].desc);
            fprintf(fout, "══════════════════════════════════════════\n");
            g_out = fout;
            run_all_transpose(&M);
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
    g_out = stdout;
    srand((unsigned int)time(NULL));
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
                return 0;
            default:
                printf("\n  无效选项，请输入 0~3\n");
        }
    }
}
