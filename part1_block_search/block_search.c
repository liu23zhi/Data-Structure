/*
 * Part 1 – 分块查找 (Block Search / Indexed Sequential Search)
 *
 * 顺序表: 8,14,6,9,10,22,34,18,19,31,40,38,54,66,46,71,78,68,80,85,100,94,88,96,87
 * 块长 = 5, 共 5 块
 * 目标: 查找关键字 46
 *
 * 实现内容:
 *   1. 自动划分块并生成索引表
 *   2. 索引顺序查找 (顺序查找索引 + 块内顺序查找)
 *   3. 索引折半查找 (二分查找索引 + 块内顺序查找)
 *   4. 块的链式存储 (单链表) 及查找
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ─────────────────────── 数据定义 ─────────────────────── */

#define N        25   /* 顺序表元素个数 */
#define BLOCK_SZ  5   /* 每块长度       */
#define NUM_BLOCK 5   /* 块的数量       */

/* 原始顺序表 */
int seq[N] = {8,14,6,9,10, 22,34,18,19,31, 40,38,54,66,46,
              71,78,68,80,85, 100,94,88,96,87};

/* 索引表结构 */
typedef struct {
    int maxKey;   /* 块内最大关键字 */
    int start;    /* 块在顺序表中的起始下标 */
} IndexEntry;

IndexEntry index_table[NUM_BLOCK];

/* 单链表节点 */
typedef struct LNode {
    int data;
    struct LNode *next;
} LNode;

/* 链式块 */
typedef struct {
    int maxKey;
    LNode *head;  /* 指向本块链表的头节点 */
} BlockList;

BlockList block_lists[NUM_BLOCK];

/* ─────────────────────── 图形化打印函数 ─────────────────────── */

/* 打印顺序表（带块分隔线） */
void print_seq_with_blocks(void)
{
    printf("\n  顺序表（每块 %d 个元素，共 %d 块）:\n", BLOCK_SZ, NUM_BLOCK);
    printf("  下标: ");
    for (int i = 0; i < N; i++) printf("%4d", i);
    printf("\n  值:   ");
    for (int i = 0; i < N; i++) printf("%4d", seq[i]);
    printf("\n        ");
    for (int b = 0; b < NUM_BLOCK; b++) {
        for (int j = 0; j < BLOCK_SZ; j++) printf("----");
        printf("|");
    }
    printf("\n        ");
    for (int b = 0; b < NUM_BLOCK; b++) {
        printf("  Block%d  ", b + 1);
    }
    printf("\n\n");
}

/* 打印索引表 */
void print_index_table(void)
{
    printf("  索引表:\n");
    printf("  +-------+--------+--------+\n");
    printf("  | 块号  | 最大键 | 起始位 |\n");
    printf("  +-------+--------+--------+\n");
    for (int i = 0; i < NUM_BLOCK; i++) {
        printf("  |   %d   |   %3d  |   %2d   |\n",
               i + 1, index_table[i].maxKey, index_table[i].start);
    }
    printf("  +-------+--------+--------+\n\n");
}

/* 打印链式块 */
void print_block_lists(void)
{
    printf("  链式块存储结构:\n");
    for (int b = 0; b < NUM_BLOCK; b++) {
        printf("  Block%d(max=%3d): HEAD", b + 1, block_lists[b].maxKey);
        LNode *p = block_lists[b].head;
        while (p) {
            printf(" -> [%3d]", p->data);
            p = p->next;
        }
        printf(" -> NULL\n");
    }
    printf("\n");
}

/* ─────────────────────── 初始化函数 ─────────────────────── */

/* 自动划分块并生成索引表 */
void build_index(void)
{
    for (int b = 0; b < NUM_BLOCK; b++) {
        int start = b * BLOCK_SZ;
        index_table[b].start = start;

        int maxKey = seq[start];
        for (int j = 1; j < BLOCK_SZ; j++) {
            if (seq[start + j] > maxKey) maxKey = seq[start + j];
        }
        index_table[b].maxKey = maxKey;
    }
}

/* 构建链式块（单链表，每块一条链） */
void build_linked_blocks(void)
{
    for (int b = 0; b < NUM_BLOCK; b++) {
        block_lists[b].maxKey = index_table[b].maxKey;
        block_lists[b].head   = NULL;

        /* 尾插法保持原始顺序 */
        LNode **tail = &block_lists[b].head;
        int start = b * BLOCK_SZ;
        for (int j = 0; j < BLOCK_SZ; j++) {
            LNode *node = (LNode *)malloc(sizeof(LNode));
            node->data  = seq[start + j];
            node->next  = NULL;
            *tail = node;
            tail  = &node->next;
        }
    }
}

/* ─────────────────────── 查找函数 ─────────────────────── */

/*
 * 顺序查找索引表，找到目标键所在的块号 (0-based)。
 * 返回块号，若不存在返回 -1。
 */
int index_seq_search(int key)
{
    printf("    [索引顺序查找] 在索引表中顺序查找 key=%d ...\n", key);
    for (int i = 0; i < NUM_BLOCK; i++) {
        printf("      比较 index[%d].maxKey=%d >= %d ? ", i, index_table[i].maxKey, key);
        if (index_table[i].maxKey >= key) {
            printf("是 → 定位到第 %d 块\n", i + 1);
            return i;
        }
        printf("否\n");
    }
    printf("    未找到所在块\n");
    return -1;
}

/*
 * 折半查找索引表，找到目标键所在的块号 (0-based)。
 * 返回块号，若不存在返回 -1。
 */
int index_bin_search(int key)
{
    printf("    [索引折半查找] 在索引表中二分查找 key=%d ...\n", key);
    int lo = 0, hi = NUM_BLOCK - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        printf("      lo=%d hi=%d mid=%d index[mid].maxKey=%d ",
               lo, hi, mid, index_table[mid].maxKey);
        if (index_table[mid].maxKey == key) {
            printf("== key → 定位到第 %d 块\n", mid + 1);
            return mid;
        } else if (index_table[mid].maxKey < key) {
            printf("< key → 向右\n");
            lo = mid + 1;
        } else {
            printf(">= key → 向左 (缩小右边界)\n");
            hi = mid - 1;
        }
    }
    /* lo 是第一个 maxKey >= key 的块 */
    if (lo < NUM_BLOCK) {
        printf("      lo=%d 即第 %d 块\n", lo, lo + 1);
        return lo;
    }
    printf("    未找到所在块\n");
    return -1;
}

/*
 * 在顺序表中对指定块做顺序查找。
 * 返回找到的下标，未找到返回 -1。
 */
int block_seq_search(int block_idx, int key)
{
    int start = index_table[block_idx].start;
    printf("    [块内顺序查找] 在第 %d 块 (下标 %d~%d) 中查找 key=%d ...\n",
           block_idx + 1, start, start + BLOCK_SZ - 1, key);
    for (int j = 0; j < BLOCK_SZ; j++) {
        printf("      seq[%d]=%d ", start + j, seq[start + j]);
        if (seq[start + j] == key) {
            printf("== key → 找到！\n");
            return start + j;
        }
        printf("!= key\n");
    }
    printf("    块内未找到\n");
    return -1;
}

/*
 * 在链式块中查找关键字。
 * 返回找到的节点指针，未找到返回 NULL。
 */
LNode *linked_block_search(int key)
{
    printf("    [链式块查找] 查找 key=%d ...\n", key);

    /* 在索引中顺序定位块 */
    int block_idx = -1;
    for (int i = 0; i < NUM_BLOCK; i++) {
        printf("      索引: Block%d.maxKey=%d >= %d ? ", i+1, block_lists[i].maxKey, key);
        if (block_lists[i].maxKey >= key) {
            printf("是 → 进入 Block%d\n", i + 1);
            block_idx = i;
            break;
        }
        printf("否\n");
    }
    if (block_idx == -1) {
        printf("    未定位到块\n");
        return NULL;
    }

    /* 在链表中顺序查找 */
    LNode *p = block_lists[block_idx].head;
    int pos = 0;
    while (p) {
        printf("      节点[%d]=%d ", pos++, p->data);
        if (p->data == key) {
            printf("== key → 找到！\n");
            return p;
        }
        printf("!= key\n");
        p = p->next;
    }
    printf("    链表中未找到\n");
    return NULL;
}

/* ─────────────────────── 主函数 ─────────────────────── */

int main(void)
{
    int target = 46;

    printf("========================================================\n");
    printf("       Part 1 – 分块查找 (Block Search)                \n");
    printf("========================================================\n");

    /* 1. 建立索引 & 链式块 */
    build_index();
    build_linked_blocks();

    /* 图形化展示原始顺序表 */
    print_seq_with_blocks();

    /* 图形化展示索引表 */
    printf("  步骤 1: 自动划分块并生成索引表\n");
    print_index_table();

    /* 2. 顺序查找索引 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 2: 索引顺序查找 + 块内顺序查找  (查找 %d)\n\n", target);
    int b1 = index_seq_search(target);
    if (b1 >= 0) {
        int pos1 = block_seq_search(b1, target);
        if (pos1 >= 0)
            printf("\n  ★ 顺序查找结果: 关键字 %d 位于顺序表下标 [%d]\n\n", target, pos1);
        else
            printf("\n  ★ 未找到关键字 %d\n\n", target);
    }

    /* 3. 折半查找索引 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 3: 索引折半查找 + 块内顺序查找  (查找 %d)\n\n", target);
    int b2 = index_bin_search(target);
    if (b2 >= 0) {
        int pos2 = block_seq_search(b2, target);
        if (pos2 >= 0)
            printf("\n  ★ 折半查找结果: 关键字 %d 位于顺序表下标 [%d]\n\n", target, pos2);
        else
            printf("\n  ★ 未找到关键字 %d\n\n", target);
    }

    /* 图形化展示链式块 */
    printf("──────────────────────────────────────────────────────\n");
    printf("  步骤 4: 链式（单链表）块存储 + 查找  (查找 %d)\n\n", target);
    print_block_lists();
    LNode *found = linked_block_search(target);
    if (found)
        printf("\n  ★ 链式块查找结果: 关键字 %d 找到，节点地址 %p\n\n", target, (void*)found);
    else
        printf("\n  ★ 未找到关键字 %d\n\n", target);

    /* 释放链式块内存 */
    for (int b = 0; b < NUM_BLOCK; b++) {
        LNode *p = block_lists[b].head;
        while (p) { LNode *tmp = p->next; free(p); p = tmp; }
    }

    printf("========================================================\n");
    printf("                   Part 1 完成\n");
    printf("========================================================\n");

    return 0;
}
