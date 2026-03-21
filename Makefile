# Makefile for Data-Structure project
CC      = gcc
CFLAGS  = -Wall -Wextra -std=c99 -O2

.PHONY: all clean run1 run2 run3

all: part1 part2 part3

part1: part1_block_search/block_search.c
	$(CC) $(CFLAGS) -o part1_block_search/block_search $<

part2: part2_graph_search/graph_search.c
	$(CC) $(CFLAGS) -o part2_graph_search/graph_search $<

part3: part3_sparse_matrix/sparse_matrix.c
	$(CC) $(CFLAGS) -o part3_sparse_matrix/sparse_matrix $<

run1: part1
	./part1_block_search/block_search

run2: part2
	./part2_graph_search/graph_search

run3: part3
	./part3_sparse_matrix/sparse_matrix

clean:
	rm -f part1_block_search/block_search \
	      part2_graph_search/graph_search \
	      part3_sparse_matrix/sparse_matrix
