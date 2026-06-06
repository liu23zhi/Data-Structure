/*
 * 验证实验：分块查找（索引顺序查找）
 *
 * 顺序表: 8,14,6,9,10,22,34,18,19,31,40,38,54,66,46,71,78,68,80,85,100,94,88,96,87
 * 块长: 5，共 5 块
 *
 * 功能：
 *   1. 图形化展示分块查找过程（顺序查找 + 折半查找索引）
 *   2. 自动划分块、生成索引表的函数
 *   3. 将块改为链式（单链表）存储并实现查找
 *   4. 统计查找次数，计算ASL成功和ASL不成功
 *
 * I/O 模式：
 *   [1] 屏幕交互模式 — 命令行输入查找关键字，屏幕输出结果
 *   [2] 文件交互模式 — 从 part1-input.txt 读取关键字，结果写入 part1-output.txt
 *   [3] 测试用例模式 — 运行至少 5 个预定义测试案例，结果输出至屏幕和 part1-output.txt
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ─────────────────────────────────────────────
   公共定义
   ───────────────────────────────────────────── */
#define N          25
#define BLOCK_SIZE  5
#define NUM_BLOCKS  5

#define INPUT_FILE  "part1-input.txt"
#define OUTPUT_FILE "part1-output.txt"

/* 全局输出流（默认 stdout，文件模式时指向文件） */
static FILE *g_out = NULL;
#define POUT (g_out ? g_out : stdout)

/* 待查顺序表 */
int a[N] = {8,14,6,9,10, 22,34,18,19,31, 40,38,54,66,46, 71,78,68,80,85, 100,94,88,96,87};

/* 索引表项 */
typedef struct {
    int max_val;
    int start;
} IndexEntry;

IndexEntry idx[NUM_BLOCKS];

/* 查找结果结构体（包含查找次数） */
typedef struct {
    int position;       // 找到的位置（1-based），-1表示未找到
    int index_compares; // 索引表比较次数
    int block_compares; // 块内比较次数
    int total_compares; // 总比较次数
} SearchResult;

/* ─────────────────────────────────────────────
   辅助：可视化函数
   ───────────────────────────────────────────── */

static void print_line(int width)
{
    for (int i = 0; i < width; i++) fputc('-', POUT);
    fputc('\n', POUT);
}

static void print_array_blocks(void)
{
    fprintf(POUT, "\n┌─────────────────────────────────────────────────────────────────────────────┐\n");
    fprintf(POUT, "│                         顺序表分块结构可视化                               │\n");
    fprintf(POUT, "└─────────────────────────────────────────────────────────────────────────────┘\n");

    fprintf(POUT, "  下标 │");
    for (int i = 0; i < N; i++) {
        if (i > 0 && i % BLOCK_SIZE == 0) fprintf(POUT, " ║");
        fprintf(POUT, " %3d", i + 1);
    }
    fprintf(POUT, "\n");
    print_line(100);

    fprintf(POUT, "  元素 │");
    for (int i = 0; i < N; i++) {
        if (i > 0 && i % BLOCK_SIZE == 0) fprintf(POUT, " ║");
        fprintf(POUT, " %3d", a[i]);
    }
    fprintf(POUT, "\n");
    print_line(100);

    fprintf(POUT, "  块号 │");
    for (int b = 0; b < NUM_BLOCKS; b++) {
        if (b > 0) fprintf(POUT, " ║");
        int mid = BLOCK_SIZE * 4 / 2;
        for (int k = 0; k < mid - 2; k++) fputc(' ', POUT);
        fprintf(POUT, "第%d块", b + 1);
        for (int k = 0; k < mid - 3; k++) fputc(' ', POUT);
    }
    fprintf(POUT, "\n\n");

    fprintf(POUT, "  %-6s  %-20s  %-10s  %-10s\n", "块号", "元素列表", "最大值", "起始下标");
    print_line(55);
    for (int b = 0; b < NUM_BLOCKS; b++) {
        fprintf(POUT, "  第%d块   [", b + 1);
        for (int i = 0; i < BLOCK_SIZE; i++) {
            fprintf(POUT, "%3d%s", a[b * BLOCK_SIZE + i], i < BLOCK_SIZE - 1 ? "," : "");
        }
        fprintf(POUT, "]   max=%-4d  start=%-4d\n", idx[b].max_val, idx[b].start + 1);
    }
    fprintf(POUT, "\n");
}

static void print_index_table(void)
{
    fprintf(POUT, "\n┌────────────────────────────────────┐\n");
    fprintf(POUT, "│           索引表                   │\n");
    fprintf(POUT, "├──────┬──────────┬──────────────────┤\n");
    fprintf(POUT, "│ 块号 │ 最大关键字 │ 起始下标（1-based）│\n");
    fprintf(POUT, "├──────┼──────────┼──────────────────┤\n");
    for (int b = 0; b < NUM_BLOCKS; b++) {
        fprintf(POUT, "│  %d   │    %-5d │        %-4d      │\n",
               b + 1, idx[b].max_val, idx[b].start + 1);
    }
    fprintf(POUT, "└──────┴──────────┴──────────────────┘\n\n");
}

/* ─────────────────────────────────────────────
   任务2：自动划分块并产生索引（完善版）
   ───────────────────────────────────────────── */
void build_index(void)
{
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务2】自动划分块并生成索引表\n");
    fprintf(POUT, "=================================================================\n");

    fprintf(POUT, "\n  分块规则：\n");
    fprintf(POUT, "    - 块长：%d\n", BLOCK_SIZE);
    fprintf(POUT, "    - 块数：%d\n", NUM_BLOCKS);
    fprintf(POUT, "    - 索引表项：(块内最大值, 块起始下标)\n");
    fprintf(POUT, "    - 索引表按块内最大值有序排列\n\n");

    for (int b = 0; b < NUM_BLOCKS; b++) {
        int start = b * BLOCK_SIZE;
        int max   = a[start];
        
        fprintf(POUT, "  处理第%d块（下标 %d~%d）：", b + 1, start + 1, start + BLOCK_SIZE);
        
        for (int i = start + 1; i < start + BLOCK_SIZE; i++) {
            if (a[i] > max) max = a[i];
        }
        
        idx[b].max_val = max;
        idx[b].start   = start;
        
        fprintf(POUT, "最大值 = %d\n", max);
    }

    print_array_blocks();
    print_index_table();
}

/* ─────────────────────────────────────────────
   任务1-A：顺序查找索引，再块内顺序查找（完善版）
   ───────────────────────────────────────────── */
SearchResult block_search_sequential_index(int key)
{
    SearchResult result = {-1, 0, 0, 0};
    
    fprintf(POUT, "\n─────────────────────────────────────────────────────────────────\n");
    fprintf(POUT, "【任务1-A】分块查找（索引用顺序查找）  关键字 key = %d\n", key);
    fprintf(POUT, "─────────────────────────────────────────────────────────────────\n");

    fprintf(POUT, "\n  ● 第一步：在索引表中顺序查找\n");
    int block_id = -1;
    for (int b = 0; b < NUM_BLOCKS; b++) {
        result.index_compares++;
        fprintf(POUT, "    比较 key(%d) <= idx[%d].max(%d)? ", key, b + 1, idx[b].max_val);
        if (key <= idx[b].max_val) {
            fprintf(POUT, "是 → 关键字在第 %d 块\n", b + 1);
            block_id = b;
            break;
        } else {
            fprintf(POUT, "否\n");
        }
    }

    if (block_id == -1) {
        fprintf(POUT, "  ✗ 未找到对应块，查找失败\n");
        result.total_compares = result.index_compares;
        fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
               result.index_compares, result.block_compares, result.total_compares);
        return result;
    }

    fprintf(POUT, "\n  ● 第二步：在第 %d 块（下标 %d~%d）中顺序查找\n",
           block_id + 1,
           idx[block_id].start + 1,
           idx[block_id].start + BLOCK_SIZE);

    fprintf(POUT, "    块内元素：[");
    for (int i = 0; i < BLOCK_SIZE; i++) {
        int pos = idx[block_id].start + i;
        fprintf(POUT, "%d%s", a[pos], i < BLOCK_SIZE - 1 ? ", " : "");
    }
    fprintf(POUT, "]\n");

    for (int i = 0; i < BLOCK_SIZE; i++) {
        int pos = idx[block_id].start + i;
        result.block_compares++;
        fprintf(POUT, "    比较 a[%d]=%d == key(%d)? ", pos + 1, a[pos], key);
        if (a[pos] == key) {
            fprintf(POUT, "是 → 查找成功！位置 = %d\n", pos + 1);
            result.position = pos + 1;
            result.total_compares = result.index_compares + result.block_compares;
            fprintf(POUT, "\n  ✓ 结果：关键字 %d 在顺序表第 %d 个位置（第 %d 块第 %d 个元素）\n",
                   key, pos + 1, block_id + 1, i + 1);
            fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
                   result.index_compares, result.block_compares, result.total_compares);
            return result;
        } else {
            fprintf(POUT, "否\n");
        }
    }

    fprintf(POUT, "  ✗ 块内未找到，查找失败\n");
    result.total_compares = result.index_compares + result.block_compares;
    fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
           result.index_compares, result.block_compares, result.total_compares);
    return result;
}

/* ─────────────────────────────────────────────
   任务1-B：折半查找索引，再块内顺序查找（完善版）
   ───────────────────────────────────────────── */
SearchResult block_search_binary_index(int key)
{
    SearchResult result = {-1, 0, 0, 0};
    
    fprintf(POUT, "\n─────────────────────────────────────────────────────────────────\n");
    fprintf(POUT, "【任务1-B】分块查找（索引用折半查找）  关键字 key = %d\n", key);
    fprintf(POUT, "─────────────────────────────────────────────────────────────────\n");

    fprintf(POUT, "\n  ● 第一步：在索引表中折半查找\n");

    int low = 0, high = NUM_BLOCKS - 1, block_id = -1;
    int step = 1;

    while (low <= high) {
        int mid = (low + high) / 2;
        result.index_compares++;
        fprintf(POUT, "    [第%d次] low=%d, high=%d, mid=%d, idx[mid].max=%d → ",
               step++, low + 1, high + 1, mid + 1, idx[mid].max_val);

        if (key == idx[mid].max_val) {
            fprintf(POUT, "key == max, 在第 %d 块\n", mid + 1);
            block_id = mid;
            break;
        } else if (key < idx[mid].max_val) {
            fprintf(POUT, "key < max, 向左\n");
            high = mid - 1;
            block_id = mid;
        } else {
            fprintf(POUT, "key > max, 向右\n");
            low = mid + 1;
        }
    }

    if (block_id == -1) {
        if (low < NUM_BLOCKS) {
            block_id = low;
        } else {
            fprintf(POUT, "  ✗ 超出索引范围，查找失败\n");
            result.total_compares = result.index_compares;
            fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
                   result.index_compares, result.block_compares, result.total_compares);
            return result;
        }
    }

    fprintf(POUT, "    → 确定关键字可能在第 %d 块\n", block_id + 1);

    fprintf(POUT, "\n  ● 第二步：在第 %d 块（下标 %d~%d）中顺序查找\n",
           block_id + 1,
           idx[block_id].start + 1,
           idx[block_id].start + BLOCK_SIZE);

    fprintf(POUT, "    块内元素：[");
    for (int i = 0; i < BLOCK_SIZE; i++) {
        int pos = idx[block_id].start + i;
        fprintf(POUT, "%d%s", a[pos], i < BLOCK_SIZE - 1 ? ", " : "");
    }
    fprintf(POUT, "]\n");

    for (int i = 0; i < BLOCK_SIZE; i++) {
        int pos = idx[block_id].start + i;
        result.block_compares++;
        fprintf(POUT, "    比较 a[%d]=%d == key(%d)? ", pos + 1, a[pos], key);
        if (a[pos] == key) {
            fprintf(POUT, "是 → 查找成功！位置 = %d\n", pos + 1);
            result.position = pos + 1;
            result.total_compares = result.index_compares + result.block_compares;
            fprintf(POUT, "\n  ✓ 结果：关键字 %d 在顺序表第 %d 个位置（第 %d 块第 %d 个元素）\n",
                   key, pos + 1, block_id + 1, i + 1);
            fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
                   result.index_compares, result.block_compares, result.total_compares);
            return result;
        } else {
            fprintf(POUT, "否\n");
        }
    }

    fprintf(POUT, "  ✗ 块内未找到，查找失败\n");
    result.total_compares = result.index_compares + result.block_compares;
    fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
           result.index_compares, result.block_compares, result.total_compares);
    return result;
}

/* ─────────────────────────────────────────────
   任务3：链式存储（单链表）分块查找（完善版）
   ───────────────────────────────────────────── */

typedef struct Node {
    int data;
    struct Node *next;
} Node;

typedef struct {
    int    max_val;
    Node  *head;
    int    size;
} LinkedBlock;

LinkedBlock linked_blocks[NUM_BLOCKS];

void build_linked_blocks(void)
{
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务3】链式（单链表）存储分块\n");
    fprintf(POUT, "=================================================================\n");

    fprintf(POUT, "\n  构建过程：\n");
    for (int b = 0; b < NUM_BLOCKS; b++) {
        linked_blocks[b].max_val = 0;
        linked_blocks[b].head    = NULL;
        linked_blocks[b].size    = 0;

        Node *tail = NULL;
        fprintf(POUT, "    第%d块：", b + 1);
        for (int i = b * BLOCK_SIZE; i < (b + 1) * BLOCK_SIZE; i++) {
            Node *p = (Node *)malloc(sizeof(Node));
            if (!p) { fprintf(stderr, "内存分配失败\n"); exit(1); }
            p->data = a[i];
            p->next = NULL;
            if (linked_blocks[b].head == NULL) {
                linked_blocks[b].head = p;
            } else {
                tail->next = p;
            }
            tail = p;

            if (a[i] > linked_blocks[b].max_val)
                linked_blocks[b].max_val = a[i];
            linked_blocks[b].size++;
            
            fprintf(POUT, "%d ", a[i]);
        }
        fprintf(POUT, "→ 最大值 = %d\n", linked_blocks[b].max_val);
    }

    fprintf(POUT, "\n  链式分块结构：\n\n");
    fprintf(POUT, "  索引表\n");
    fprintf(POUT, "  ┌────────┬──────────────────────────────────────────────────┐\n");
    fprintf(POUT, "  │ 最大值 │  链式块内容                                      │\n");
    fprintf(POUT, "  ├────────┼──────────────────────────────────────────────────┤\n");
    for (int b = 0; b < NUM_BLOCKS; b++) {
        fprintf(POUT, "  │  %-5d │  HEAD", linked_blocks[b].max_val);
        Node *p = linked_blocks[b].head;
        while (p) {
            fprintf(POUT, " → [%d]", p->data);
            p = p->next;
        }
        fprintf(POUT, " → NULL\n");
    }
    fprintf(POUT, "  └────────┴──────────────────────────────────────────────────┘\n\n");
}

SearchResult linked_block_search(int key)
{
    SearchResult result = {-1, 0, 0, 0};
    
    fprintf(POUT, "  ● 链式分块查找  key = %d\n\n", key);

    fprintf(POUT, "    第一步：顺序查找索引表\n");
    int block_id = -1;
    for (int b = 0; b < NUM_BLOCKS; b++) {
        result.index_compares++;
        fprintf(POUT, "      key(%d) <= linked_blocks[%d].max(%d)? ",
               key, b + 1, linked_blocks[b].max_val);
        if (key <= linked_blocks[b].max_val) {
            fprintf(POUT, "是 → 进入第 %d 块\n", b + 1);
            block_id = b;
            break;
        } else {
            fprintf(POUT, "否\n");
        }
    }

    if (block_id == -1) {
        fprintf(POUT, "    ✗ 未找到对应块，查找失败\n");
        result.total_compares = result.index_compares;
        fprintf(POUT, "    📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
               result.index_compares, result.block_compares, result.total_compares);
        return result;
    }

    fprintf(POUT, "\n    第二步：遍历第 %d 块链表\n", block_id + 1);
    Node *p = linked_blocks[block_id].head;
    int pos = block_id * BLOCK_SIZE + 1;
    int node_num = 1;
    while (p) {
        result.block_compares++;
        fprintf(POUT, "      检查结点 [%d] == key(%d)? ", p->data, key);
        if (p->data == key) {
            fprintf(POUT, "是 → 找到！逻辑位置 = %d\n", pos);
            result.position = pos;
            result.total_compares = result.index_compares + result.block_compares;
            fprintf(POUT, "\n  ✓ 结果：关键字 %d 在链式存储第 %d 块的第 %d 个结点，逻辑位置 %d\n",
                   key, block_id + 1, node_num, pos);
            fprintf(POUT, "  📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
                   result.index_compares, result.block_compares, result.total_compares);
            return result;
        }
        fprintf(POUT, "否\n");
        p = p->next;
        pos++;
        node_num++;
    }

    fprintf(POUT, "    ✗ 块内链表未找到，查找失败\n");
    result.total_compares = result.index_compares + result.block_compares;
    fprintf(POUT, "    📊 查找次数统计：索引表比较 %d 次，块内比较 %d 次，总计 %d 次\n\n",
           result.index_compares, result.block_compares, result.total_compares);
    return result;
}

void free_linked_blocks(void)
{
    for (int b = 0; b < NUM_BLOCKS; b++) {
        Node *p = linked_blocks[b].head;
        while (p) {
            Node *tmp = p->next;
            free(p);
            p = tmp;
        }
        linked_blocks[b].head = NULL;
    }
}

/* ─────────────────────────────────────────────
   任务4：ASL平均查找长度计算
   ───────────────────────────────────────────── */
void calculate_asl(void)
{
    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务4】平均查找长度ASL计算\n");
    fprintf(POUT, "=================================================================\n");

    fprintf(POUT, "\n  一、基本概念\n");
    fprintf(POUT, "    ASL（Average Search Length）：平均查找长度，指查找过程中关键字的平均比较次数\n");
    fprintf(POUT, "    分块查找的ASL = 索引表查找的ASL + 块内查找的ASL\n\n");

    fprintf(POUT, "  二、理论公式（等概率情况下）\n");
    fprintf(POUT, "    1. 顺序查找索引表：\n");
    fprintf(POUT, "       ASL成功 = (b+1)/2 + (s+1)/2 = (b+s+2)/2\n");
    fprintf(POUT, "       ASL不成功 = b + s\n");
    fprintf(POUT, "       其中：b = 块数，s = 块长\n\n");
    
    fprintf(POUT, "    2. 折半查找索引表：\n");
    fprintf(POUT, "       ASL成功 = log2(b+1) - 1 + (s+1)/2\n");
    fprintf(POUT, "       ASL不成功 = log2(b+1) + s\n\n");

    fprintf(POUT, "  三、本实验参数\n");
    fprintf(POUT, "    总元素数 n = %d\n", N);
    fprintf(POUT, "    块数 b = %d\n", NUM_BLOCKS);
    fprintf(POUT, "    块长 s = %d\n\n", BLOCK_SIZE);

    fprintf(POUT, "  四、理论计算结果\n");
    
    // 顺序查找索引表
    double asl_seq_success = (NUM_BLOCKS + 1.0)/2.0 + (BLOCK_SIZE + 1.0)/2.0;
    double asl_seq_fail = NUM_BLOCKS + BLOCK_SIZE;
    
    fprintf(POUT, "    1. 顺序查找索引表：\n");
    fprintf(POUT, "       ASL成功 = (5+1)/2 + (5+1)/2 = 3 + 3 = %.2f\n", asl_seq_success);
    fprintf(POUT, "       ASL不成功 = 5 + 5 = %.2f\n\n", asl_seq_fail);
    
    // 折半查找索引表
    double asl_bin_success = (log2(NUM_BLOCKS + 1.0) - 1.0) + (BLOCK_SIZE + 1.0)/2.0;
    double asl_bin_fail = log2(NUM_BLOCKS + 1.0) + BLOCK_SIZE;
    
    fprintf(POUT, "    2. 折半查找索引表：\n");
    fprintf(POUT, "       ASL成功 = log2(6) - 1 + (5+1)/2 ≈ 2.58 - 1 + 3 = %.2f\n", asl_bin_success);
    fprintf(POUT, "       ASL不成功 = log2(6) + 5 ≈ 2.58 + 5 = %.2f\n\n", asl_bin_fail);

    fprintf(POUT, "  五、实际测试结果（基于测试用例）\n");
    fprintf(POUT, "    请运行测试用例模式查看实际查找次数统计\n\n");
}

/* ─────────────────────────────────────────────
   整合：对给定 key 运行全部查找演示
   ───────────────────────────────────────────── */
static void run_all_searches(int key)
{
    fprintf(POUT, "\n");
    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*         验证实验：分块查找（索引顺序查找）                      *\n");
    fprintf(POUT, "*  顺序表共 %d 个元素，块长 %d，共 %d 块，查找关键字 %d        *\n",
           N, BLOCK_SIZE, NUM_BLOCKS, key);
    fprintf(POUT, "*****************************************************************\n\n");

    build_index();

    fprintf(POUT, "=================================================================\n");
    fprintf(POUT, "【任务1】分块查找过程演示\n");
    fprintf(POUT, "=================================================================\n");
    block_search_sequential_index(key);
    block_search_binary_index(key);

    build_linked_blocks();
    linked_block_search(key);
    free_linked_blocks();

    calculate_asl();

    fprintf(POUT, "*****************************************************************\n");
    fprintf(POUT, "*                     分块查找演示完毕                           *\n");
    fprintf(POUT, "*****************************************************************\n\n");
}

/* ─────────────────────────────────────────────
   UI：菜单显示
   ───────────────────────────────────────────── */
static void show_menu(void)
{
    printf("\n");
    printf("╔══════════════════════════════════════════════╗\n");
    printf("║       验证实验：分块查找（索引顺序查找）       ║\n");
    printf("╠══════════════════════════════════════════════╣\n");
    printf("║  [1] 屏幕交互模式（命令行输入输出）            ║\n");
    printf("║  [2] 文件交互模式（文件输入输出）              ║\n");
    printf("║  [3] 运行测试用例                             ║\n");
    printf("║  [4] 查看ASL理论计算                          ║\n");
    printf("║  [0] 退出程序                                 ║\n");
    printf("╠══════════════════════════════════════════════╣\n");
    printf("║  请输入选项: ");
}

/* ─────────────────────────────────────────────
   模式1：屏幕交互
   ───────────────────────────────────────────── */
static void screen_mode(void)
{
    g_out = stdout;
    printf("\n【屏幕交互模式】\n");
    printf("  顺序表：");
    for (int i = 0; i < N; i++) {
        printf("%d%s", a[i], i < N - 1 ? ", " : "\n");
    }
    int key;
    printf("  请输入查找关键字（整数）: ");
    if (scanf("%d", &key) != 1) {
        printf("  输入无效\n");
        /* 清除输入缓冲 */
        int c;
        while ((c = getchar()) != '\n' && c != EOF);
        return;
    }
    run_all_searches(key);
}

/* ─────────────────────────────────────────────
   模式2：文件交互
   ───────────────────────────────────────────── */
static void file_mode(void)
{
    /* 读输入文件 */
    FILE *fin = fopen(INPUT_FILE, "r");
    if (!fin) {
        printf("  ✗ 无法打开输入文件 %s\n", INPUT_FILE);
        printf("    请创建文件，每行一个查找关键字，首行为关键字个数。\n");
        printf("    示例：\n");
        printf("      3\n");
        printf("      46\n");
        printf("      8\n");
        printf("      50\n");
        return;
    }

    int n;
    if (fscanf(fin, "%d", &n) != 1 || n <= 0) {
        printf("  ✗ 输入文件格式错误（首行应为关键字个数）\n");
        fclose(fin);
        return;
    }

    /* 打开输出文件 */
    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s\n", OUTPUT_FILE);
        fclose(fin);
        return;
    }

    printf("  ✓ 从文件 %s 读取 %d 个查找关键字\n", INPUT_FILE, n);
    printf("  ✓ 结果将写入文件 %s\n", OUTPUT_FILE);

    g_out = fout;
    fprintf(g_out, "========================================\n");
    fprintf(g_out, "分块查找文件交互模式输出\n");
    fprintf(g_out, "输入文件：%s\n", INPUT_FILE);
    fprintf(g_out, "========================================\n");

    for (int i = 0; i < n; i++) {
        int key;
        if (fscanf(fin, "%d", &key) != 1) {
            fprintf(g_out, "  ✗ 读取第 %d 个关键字失败\n", i + 1);
            break;
        }
        fprintf(g_out, "\n[查找 %d/%d] 关键字 = %d\n", i + 1, n, key);
        run_all_searches(key);
    }

    fprintf(g_out, "========================================\n");
    fprintf(g_out, "文件交互模式结束\n");
    fprintf(g_out, "========================================\n");

    fclose(fin);
    fclose(fout);
    g_out = stdout;
    printf("  ✓ 完成，结果已保存至 %s\n", OUTPUT_FILE);
}

/* ─────────────────────────────────────────────
   模式3：测试用例
   等价类划分 + 边界值分析：
     TC1  正常案例 — key=46（存在，第3块中间元素）
     TC2  边界值   — key=6 （最小元素，第1块）
     TC3  边界值   — key=100（最大元素，第5块）
     TC4  等价类   — key=50（不存在，值在第3块范围内）
     TC5  边界值   — key=0 （低于所有元素，查找失败）
     TC6  边界值   — key=101（高于所有元素，查找失败）
   ───────────────────────────────────────────── */
static void test_mode(void)
{
    struct { int key; const char *desc; } cases[] = {
        {46,  "TC1 正常案例 — key=46（存在，第3块）"},
        {6,   "TC2 边界值   — key=6 （最小元素，第1块）"},
        {100, "TC3 边界值   — key=100（最大元素，第5块）"},
        {50,  "TC4 等价类   — key=50（不存在，第3块范围）"},
        {0,   "TC5 边界值   — key=0 （低于所有元素）"},
        {101, "TC6 边界值   — key=101（高于所有元素）"},
    };
    int num_cases = (int)(sizeof(cases) / sizeof(cases[0]));

    /* 打开测试输出文件 */
    FILE *fout = fopen(OUTPUT_FILE, "w");
    if (!fout) {
        printf("  ✗ 无法创建输出文件 %s，测试结果仅输出至屏幕\n", OUTPUT_FILE);
        fout = NULL;
    }

    printf("\n【测试用例模式】共 %d 个测试案例\n", num_cases);
    if (fout) {
        printf("  ✓ 测试结果同步写入 %s\n", OUTPUT_FILE);
        fprintf(fout, "========================================\n");
        fprintf(fout, "分块查找 — 测试用例输出\n");
        fprintf(fout, "测试案例数：%d\n", num_cases);
        fprintf(fout, "========================================\n");
    }

    // 统计ASL
    double total_seq_success = 0, total_seq_fail = 0;
    double total_bin_success = 0, total_bin_fail = 0;
    double total_link_success = 0, total_link_fail = 0;
    int success_count = 0, fail_count = 0;

    for (int i = 0; i < num_cases; i++) {
        printf("\n══════════════════════════════════════════\n");
        printf("  %s\n", cases[i].desc);
        printf("══════════════════════════════════════════\n");

        /* 同时输出到屏幕和文件 */
        g_out = stdout;
        build_index();
        SearchResult seq_res = block_search_sequential_index(cases[i].key);
        SearchResult bin_res = block_search_binary_index(cases[i].key);
        
        build_linked_blocks();
        SearchResult link_res = linked_block_search(cases[i].key);
        free_linked_blocks();

        // 统计
        if (seq_res.position != -1) {
            total_seq_success += seq_res.total_compares;
            total_bin_success += bin_res.total_compares;
            total_link_success += link_res.total_compares;
            success_count++;
        } else {
            total_seq_fail += seq_res.total_compares;
            total_bin_fail += bin_res.total_compares;
            total_link_fail += link_res.total_compares;
            fail_count++;
        }

        if (fout) {
            fprintf(fout, "\n══════════════════════════════════════════\n");
            fprintf(fout, "  %s\n", cases[i].desc);
            fprintf(fout, "══════════════════════════════════════════\n");
            g_out = fout;
            build_index();
            block_search_sequential_index(cases[i].key);
            block_search_binary_index(cases[i].key);
            
            build_linked_blocks();
            linked_block_search(cases[i].key);
            free_linked_blocks();
        }
    }

    // 输出实际ASL统计
    printf("\n══════════════════════════════════════════\n");
    printf("  实际ASL统计结果\n");
    printf("══════════════════════════════════════════\n");
    printf("  成功案例数：%d\n", success_count);
    printf("  失败案例数：%d\n\n", fail_count);

    if (success_count > 0) {
        printf("  顺序查找索引表 ASL成功：%.2f\n", total_seq_success / success_count);
        printf("  折半查找索引表 ASL成功：%.2f\n", total_bin_success / success_count);
        printf("  链式存储查找 ASL成功：%.2f\n\n", total_link_success / success_count);
    }

    if (fail_count > 0) {
        printf("  顺序查找索引表 ASL不成功：%.2f\n", total_seq_fail / fail_count);
        printf("  折半查找索引表 ASL不成功：%.2f\n", total_bin_fail / fail_count);
        printf("  链式存储查找 ASL不成功：%.2f\n\n", total_link_fail / fail_count);
    }

    if (fout) {
        fprintf(fout, "\n══════════════════════════════════════════\n");
        fprintf(fout, "  实际ASL统计结果\n");
        fprintf(fout, "══════════════════════════════════════════\n");
        fprintf(fout, "  成功案例数：%d\n", success_count);
        fprintf(fout, "  失败案例数：%d\n\n", fail_count);

        if (success_count > 0) {
            fprintf(fout, "  顺序查找索引表 ASL成功：%.2f\n", total_seq_success / success_count);
            fprintf(fout, "  折半查找索引表 ASL成功：%.2f\n", total_bin_success / success_count);
            fprintf(fout, "  链式存储查找 ASL成功：%.2f\n\n", total_link_success / success_count);
        }

        if (fail_count > 0) {
            fprintf(fout, "  顺序查找索引表 ASL不成功：%.2f\n", total_seq_fail / fail_count);
            fprintf(fout, "  折半查找索引表 ASL不成功：%.2f\n", total_bin_fail / fail_count);
            fprintf(fout, "  链式存储查找 ASL不成功：%.2f\n\n", total_link_fail / fail_count);
        }

        fprintf(fout, "========================================\n");
        fprintf(fout, "测试完毕\n");
        fprintf(fout, "========================================\n");
        fclose(fout);
        g_out = stdout;
        printf("  ✓ 所有测试案例完成，结果已保存至 %s\n", OUTPUT_FILE);
    }
}

/* ─────────────────────────────────────────────
   模式4：查看ASL理论计算
   ───────────────────────────────────────────── */
static void asl_mode(void)
{
    g_out = stdout;
    calculate_asl();
}

/* ─────────────────────────────────────────────
   主函数（菜单驱动）
   ───────────────────────────────────────────── */
int main(void)
{
    g_out = stdout;
    int choice;

    for (;;) {
        show_menu();
        if (scanf("%d", &choice) != 1) {
            printf("  输入无效，请重新输入\n");
            /* 清除输入缓冲 */
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
            case 4: asl_mode();    break;
            case 0:
                printf("\n  再见！\n\n");
                return 0;
            default:
                printf("\n  无效选项，请输入 0~4\n");
        }
    }
}