/*
 * Part 3 – 稀疏矩阵转置 (Sparse Matrix Transpose)
 *
 * 示例稀疏矩阵 A (6 行 × 7 列):
 *   非零元素:
 *     A[1][2]=12  A[1][3]=9   A[3][1]=-3  A[3][6]=14
 *     A[4][3]=24  A[5][2]=18  A[6][1]=15  A[6][4]=-7
 *
 * 实现内容:
 *   1. 三元组表存储 + 图形化展示
 *   2. 普通转置算法 O(cols × t)
 *   3. 快速转置算法 O(cols + t)  (使用 colCount 和 colStart 辅助数组)
 *   4. 空间进一步优化版本 (原地复用 colCount 数组)
 *   5. 时间复杂度对比分析
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ─────────────────────── 数据定义 ─────────────────────── */

#define MAX_TERMS 100  /* 最大非零元素数 */

/* 三元组 */
typedef struct {
    int row, col, val;
} Triple;

/* 稀疏矩阵 (三元组表) */
typedef struct {
    int rows, cols;  /* 行数、列数 */
    int num;         /* 非零元素个数 */
    Triple data[MAX_TERMS + 1]; /* data[0] 不用，从 1 开始 */
} SparseMatrix;

/* ─────────────────────── 图形化打印函数 ─────────────────────── */

/* 以完整矩阵形式打印 */
void print_matrix(const SparseMatrix *M, const char *name)
{
    printf("  矩阵 %s (%d x %d, 非零元素 %d 个):\n",
           name, M->rows, M->cols, M->num);

    /* 建立临时稠密矩阵（动态分配，按实际行列数申请） */
    int (*dense)[MAX_TERMS + 1] = calloc((size_t)(M->rows + 1), sizeof(*dense));
    if (!dense) { printf("  内存分配失败\n"); return; }
    for (int k = 1; k <= M->num; k++) {
        dense[M->data[k].row][M->data[k].col] = M->data[k].val;
    }

    printf("       ");
    for (int j = 1; j <= M->cols; j++) printf("  %4d", j);
    printf("\n      +");
    for (int j = 1; j <= M->cols; j++) printf("------");
    printf("+\n");
    for (int i = 1; i <= M->rows; i++) {
        printf("   %3d |", i);
        for (int j = 1; j <= M->cols; j++) {
            if (dense[i][j] == 0)
                printf("     .");
            else
                printf("  %4d", dense[i][j]);
        }
        printf(" |\n");
    }
    printf("      +");
    for (int j = 1; j <= M->cols; j++) printf("------");
    printf("+\n\n");
    free(dense);
}

/* 打印三元组表 */
void print_triple_table(const SparseMatrix *M, const char *name)
{
    printf("  三元组表 %s:\n", name);
    printf("  +-----+-----+------+------+\n");
    printf("  | 序号 | 行  |  列  |  值  |\n");
    printf("  +-----+-----+------+------+\n");
    for (int k = 1; k <= M->num; k++) {
        printf("  | %3d | %3d | %4d | %4d |\n",
               k, M->data[k].row, M->data[k].col, M->data[k].val);
    }
    printf("  +-----+-----+------+------+\n\n");
}

/* ─────────────────────── 普通转置算法 ─────────────────────── */
/*
 * 按列扫描原矩阵，依次将该列元素加入转置矩阵。
 * 时间复杂度: O(cols × t)，其中 t = 非零元素个数
 */
long long classic_ops; /* 操作计数 */

void transpose_classic(const SparseMatrix *A, SparseMatrix *B)
{
    classic_ops = 0;
    B->rows = A->cols;
    B->cols = A->rows;
    B->num  = A->num;

    int q = 1; /* B 中下一个写入位置 */
    for (int col = 1; col <= A->cols; col++) {
        classic_ops++;
        for (int k = 1; k <= A->num; k++) {
            classic_ops++;
            if (A->data[k].col == col) {
                B->data[q].row = A->data[k].col;
                B->data[q].col = A->data[k].row;
                B->data[q].val = A->data[k].val;
                q++;
            }
        }
    }
}

/* ─────────────────────── 快速转置算法 ─────────────────────── */
/*
 * 用 colCount[j] 记录第 j 列非零元素数量，
 * 用 colStart[j] 记录第 j 列元素在 B 中的起始写入位置，
 * 一次扫描完成所有元素的放置。
 * 时间复杂度: O(cols + t)
 */
long long fast_ops;

void transpose_fast(const SparseMatrix *A, SparseMatrix *B)
{
    fast_ops = 0;
    B->rows = A->cols;
    B->cols = A->rows;
    B->num  = A->num;

    int colCount[MAX_TERMS + 1]; /* 每列非零元素数 */
    int colStart[MAX_TERMS + 1]; /* 每列在 B 中的起始位 */
    memset(colCount, 0, sizeof(colCount));

    /* 统计每列非零元素数 */
    for (int k = 1; k <= A->num; k++) {
        fast_ops++;
        colCount[A->data[k].col]++;
    }

    /* 计算各列在 B.data 中的起始位置 */
    colStart[1] = 1;
    for (int j = 2; j <= A->cols; j++) {
        fast_ops++;
        colStart[j] = colStart[j-1] + colCount[j-1];
    }

    printf("    辅助数组 (快速转置):\n");
    printf("    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n    | 列 j    |");
    for (int j = 1; j <= A->cols; j++) printf("  %3d |", j);
    printf("\n    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n    |colCount |");
    for (int j = 1; j <= A->cols; j++) printf("  %3d |", colCount[j]);
    printf("\n    |colStart |");
    for (int j = 1; j <= A->cols; j++) printf("  %3d |", colStart[j]);
    printf("\n    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n\n");

    /* 按扫描顺序一次性放置 */
    for (int k = 1; k <= A->num; k++) {
        fast_ops++;
        int j = A->data[k].col;
        int pos = colStart[j];
        B->data[pos].row = A->data[k].col;
        B->data[pos].col = A->data[k].row;
        B->data[pos].val = A->data[k].val;
        colStart[j]++;
    }
}

/* ─────────────────────── 空间优化版快速转置 ─────────────────────── */
/*
 * 进一步优化: 只使用一个辅助数组 colPos。
 * 先累加计算各列在 B 中的结束位置，然后从后往前扫描时动态维护写入位置。
 * 避免同时存储 colCount 和 colStart，节省约一半辅助空间。
 * 时间复杂度: O(cols + t)，辅助空间: O(cols)（仅一个数组）
 */
long long opt_ops;

void transpose_optimized(const SparseMatrix *A, SparseMatrix *B)
{
    opt_ops = 0;
    B->rows = A->cols;
    B->cols = A->rows;
    B->num  = A->num;

    int colPos[MAX_TERMS + 1]; /* 复用为 colStart，原地递增 */
    memset(colPos, 0, sizeof(colPos));

    /* 统计各列个数，累计得到 colEnd+1 */
    for (int k = 1; k <= A->num; k++) {
        opt_ops++;
        colPos[A->data[k].col]++;
    }
    /* 前缀和: colPos[j] = 第 j 列元素的结束下标(不含) */
    int cnt = 0;
    for (int j = 1; j <= A->cols; j++) {
        opt_ops++;
        int tmp  = colPos[j];
        colPos[j] = cnt + 1; /* 第 j 列起始位 */
        cnt += tmp;
    }

    printf("    辅助数组 (优化版快速转置, 单数组):\n");
    printf("    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n    | 列 j    |");
    for (int j = 1; j <= A->cols; j++) printf("  %3d |", j);
    printf("\n    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n    | colPos  |");
    for (int j = 1; j <= A->cols; j++) printf("  %3d |", colPos[j]);
    printf("\n    +---------+");
    for (int j = 1; j <= A->cols; j++) printf("------+");
    printf("\n\n");

    for (int k = 1; k <= A->num; k++) {
        opt_ops++;
        int j = A->data[k].col;
        int pos = colPos[j];
        B->data[pos].row = A->data[k].col;
        B->data[pos].col = A->data[k].row;
        B->data[pos].val = A->data[k].val;
        colPos[j]++;
    }
}

/* ─────────────────────── 主函数 ─────────────────────── */

int main(void)
{
    printf("========================================================\n");
    printf("   Part 3 – 稀疏矩阵转置 (Sparse Matrix Transpose)     \n");
    printf("========================================================\n");

    /* 构造示例稀疏矩阵 A (6x7) */
    SparseMatrix A = {0};
    A.rows = 6; A.cols = 7; A.num = 8;
    Triple init_data[] = {
        {0,0,0},       /* 占位, 下标0不用 */
        {1,2,12}, {1,3,9},
        {3,1,-3}, {3,6,14},
        {4,3,24},
        {5,2,18},
        {6,1,15}, {6,4,-7}
    };
    memcpy(A.data, init_data, sizeof(init_data));

    /* 图形化展示原矩阵 */
    printf("\n  步骤 1: 稀疏矩阵 A 的稠密形式\n");
    print_matrix(&A, "A");

    printf("  步骤 2: 稀疏矩阵 A 的三元组表表示\n");
    print_triple_table(&A, "A");

    /* 普通转置 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 3: 普通转置算法  O(cols × t)\n\n");
    SparseMatrix B1 = {0};
    transpose_classic(&A, &B1);
    printf("    转置后矩阵 B1 (三元组表):\n");
    print_triple_table(&B1, "B1");
    printf("    B1 稠密形式:\n");
    print_matrix(&B1, "B1(A转置)");
    printf("    操作次数(普通): %lld\n\n", classic_ops);

    /* 快速转置 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 4: 快速转置算法  O(cols + t)\n\n");
    SparseMatrix B2 = {0};
    transpose_fast(&A, &B2);
    printf("    转置后矩阵 B2 (三元组表):\n");
    print_triple_table(&B2, "B2");
    printf("    B2 稠密形式:\n");
    print_matrix(&B2, "B2(A转置)");
    printf("    操作次数(快速): %lld\n\n", fast_ops);

    /* 空间优化版快速转置 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 5: 空间优化版快速转置  O(cols + t), 单辅助数组\n\n");
    SparseMatrix B3 = {0};
    transpose_optimized(&A, &B3);
    printf("    转置后矩阵 B3 (三元组表):\n");
    print_triple_table(&B3, "B3");
    printf("    B3 稠密形式:\n");
    print_matrix(&B3, "B3(A转置)");
    printf("    操作次数(优化): %lld\n\n", opt_ops);

    /* 时间复杂度对比 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 6: 时间复杂度对比分析\n\n");
    int t = A.num, m = A.rows, n = A.cols;
    printf("  矩阵规模: %d x %d, 非零元素 t = %d\n\n", m, n, t);
    printf("  +----------------------------+------------------+---------------------+\n");
    printf("  |       算法                 |   时间复杂度     |  本例实际操作次数   |\n");
    printf("  +----------------------------+------------------+---------------------+\n");
    printf("  | 普通转置                   | O(cols × t)      |  %6lld               |\n", classic_ops);
    printf("  | 快速转置 (colCount+colStart)| O(cols + t)     |  %6lld               |\n", fast_ops);
    printf("  | 优化快速转置 (单辅助数组)  | O(cols + t)      |  %6lld               |\n", opt_ops);
    printf("  +----------------------------+------------------+---------------------+\n\n");
    printf("  说明:\n");
    printf("    · 普通转置: 外层循环 cols=%d 次，内层遍历所有 t=%d 个非零元素\n", n, t);
    printf("      → 约 %d × %d = %d 次操作\n", n, t, n * t);
    printf("    · 快速转置: 仅需两个 O(t) 和 O(cols) 的线性扫描\n");
    printf("      → 约 t + cols = %d + %d = %d 次操作\n", t, n, t + n);
    printf("    · 当 t >> cols 时快速转置优势更明显；\n");
    printf("      当 t ≈ 0 时两者差异不大。\n\n");

    printf("========================================================\n");
    printf("                   Part 3 完成\n");
    printf("========================================================\n");

    return 0;
}
