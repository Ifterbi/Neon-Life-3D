#ifndef FACE_H
#define FACE_H

#include "cell.h"

#define MAX_ROWS 100
#define MAX_COLS 100

typedef struct {
    int unlocked;
    int rows;
    int cols;
    int autoTick;
    unsigned char active_chunks[10][10];
    unsigned char halo[MAX_ROWS + 2][MAX_COLS + 2];
    Cell grid[MAX_ROWS][MAX_COLS];
} Face;

void face_reset(Face* face);
int face_count_neighbors_native(Face* face, int r, int c);
void face_tick(Face* face, unsigned long long* global_points);
void face_toggle_cell(Face* face, int r, int c);
void face_buy_expansion(Face* face, unsigned long long* global_points, int debug_mode, int amount);
void face_buy_autotick(Face* face, unsigned long long* global_points, int debug_mode, int amount);

#endif
