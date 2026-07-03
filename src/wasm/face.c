#include "face.h"
#include "globals.h"

void face_reset(Face* face) {
    face->rows = 10;
    face->cols = 10;
    face->autoTick = 0;
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            face->active_chunks[i][j] = 1;
        }
    }
    for (int r = 0; r < MAX_ROWS; r++) {
        for (int col = 0; col < MAX_COLS; col++) {
            cell_randomize(&face->grid[r][col]);
        }
    }
}

int face_count_neighbors_native(Face* face, int r, int c) {
    int count = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            int nr = r + i;
            int nc = c + j;
            if (nr >= 0 && nr < face->rows && nc >= 0 && nc < face->cols) {
                if (face->grid[nr][nc].meta & 1) count++;
            } else {
                count += face->halo[nr + 1][nc + 1] > 0 ? 1 : 0;
            }
        }
    }
    return count;
}

void face_tick(Face* face, unsigned long long* global_points) {
    if (!face->unlocked) return;

    static Cell nextGrid[MAX_ROWS][MAX_COLS];
    unsigned char next_active[10][10] = {0};

    int num_chunks_r = (face->rows + 9) / 10;
    int num_chunks_c = (face->cols + 9) / 10;

    for (int cr = 0; cr < num_chunks_r; cr++) {
        for (int cc = 0; cc < num_chunks_c; cc++) {
            if (!face->active_chunks[cr][cc]) {
                continue;
            }

            int r_start = cr * 10;
            int r_end = r_start + 10;
            if (r_end > face->rows) r_end = face->rows;
            int c_start = cc * 10;
            int c_end = c_start + 10;
            if (c_end > face->cols) c_end = face->cols;

            for (int r = r_start; r < r_end; r++) {
                for (int c = c_start; c < c_end; c++) {
                    Cell* cell = &face->grid[r][c];
                    int neighbors = face_count_neighbors_native(face, r, c);

                    unsigned char nextAlive = cell->meta & 1;

                    if (cell->meta & 1) {
                        if (neighbors < 2 || neighbors > 3) nextAlive = 0;
                    } else {
                        if (neighbors == 3) nextAlive = 1;
                    }

                    if (!(cell->meta & 1) && !nextAlive) {
                        int sum = cell->r + cell->g + cell->b;
                        int chance_num = (765 - sum) * 10;
                        int chance_den = 765000;
                        if ((int)(prng_float() * chance_den) < chance_num) {
                            nextAlive = 1;
                        }
                    }
                    
                    cell_set_next_state(cell, &nextGrid[r][c], nextAlive, neighbors);

                    if (!(cell->meta & 1) && nextAlive) {
                        *global_points += cell_get_points(cell, 5); // 5x on birth
                    }

                    if ((cell->meta & 1) && nextAlive) {
                        *global_points += cell_get_points(cell, 1); // 1x per tick alive
                    }

                    if ((cell->meta & 1) && !nextAlive) {
                        cell_evolve(&nextGrid[r][c]); // Cell state increases on death
                    }

                    if (nextAlive) {
                        int min_cr = (r > 0) ? (r - 1) / 10 : 0;
                        int max_cr = (r < face->rows - 1) ? (r + 1) / 10 : (face->rows - 1) / 10;
                        int min_cc = (c > 0) ? (c - 1) / 10 : 0;
                        int max_cc = (c < face->cols - 1) ? (c + 1) / 10 : (face->cols - 1) / 10;
                        for (int i = min_cr; i <= max_cr; i++) {
                            for (int j = min_cc; j <= max_cc; j++) {
                                next_active[i][j] = 1;
                            }
                        }
                    }

                    if (!nextAlive && (cell->r + cell->g + cell->b < 765)) {
                        next_active[cr][cc] = 1;
                    }
                }
            }
        }
    }

    for (int cr = 0; cr < num_chunks_r; cr++) {
        for (int cc = 0; cc < num_chunks_c; cc++) {
            if (face->active_chunks[cr][cc]) {
                int r_start = cr * 10;
                int r_end = r_start + 10;
                if (r_end > face->rows) r_end = face->rows;
                int c_start = cc * 10;
                int c_end = c_start + 10;
                if (c_end > face->cols) c_end = face->cols;
                
                for (int r = r_start; r < r_end; r++) {
                    for (int c = c_start; c < c_end; c++) {
                        face->grid[r][c] = nextGrid[r][c];
                    }
                }
            }
            face->active_chunks[cr][cc] = next_active[cr][cc];
        }
    }

    int rand_r = (int)(prng_float() * face->rows);
    if (rand_r >= face->rows) rand_r = face->rows - 1;

    int rand_c = (int)(prng_float() * face->cols);
    if (rand_c >= face->cols) rand_c = face->cols - 1;

    face->grid[rand_r][rand_c].meta |= 1;
    face->active_chunks[rand_r / 10][rand_c / 10] = 1;
}

void face_toggle_cell(Face* face, int r, int c) {
    cell_toggle(&face->grid[r][c]);
    face->active_chunks[r / 10][c / 10] = 1;
}

void face_buy_expansion(Face* face, unsigned long long* global_points, int debug_mode, int amount) {
    int bought = 0;
    while (amount == -1 || bought < amount) {
        if (face->rows >= get_max_grid() && face->cols >= get_max_grid()) break;
        int currentSize = face->rows;
        unsigned long long cost = (unsigned long long)(currentSize * 50);
        if (debug_mode || *global_points >= cost) {
            if (!debug_mode) *global_points -= cost;
            int max_g = get_max_grid();
            int newRows = face->rows + 5;
            if (newRows > max_g) newRows = max_g;
            int newCols = face->cols + 5;
            if (newCols > max_g) newCols = max_g;

            face->rows = newRows;
            face->cols = newCols;
            bought++;
        } else {
            break;
        }
    }
}

void face_buy_autotick(Face* face, unsigned long long* global_points, int debug_mode, int amount) {
    int bought = 0;
    while (amount == -1 || bought < amount) {
        if (face->autoTick >= 100) break;
        unsigned long long cost = face->autoTick == 0 ? 50 : (unsigned long long)(face->autoTick * 100);
        if (debug_mode || *global_points >= cost) {
            if (!debug_mode) *global_points -= cost;
            face->autoTick++;
            bought++;
        } else {
            break;
        }
    }
}
