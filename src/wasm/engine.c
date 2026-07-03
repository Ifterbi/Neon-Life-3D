#include "globals.h"
#include "cube.h"

#define MAX_CUBES 15

Cube cubes[MAX_CUBES];
unsigned long long points = 0;
int debug_mode = 0;

int current_max_grid = 50;
int ascension_count = 0;

int get_max_grid() { return current_max_grid; }
int get_ascension_count() { return ascension_count; }

int* get_max_grid_ptr() { return &current_max_grid; }
int* get_ascension_count_ptr() { return &ascension_count; }

Cube* get_cubes_ptr() { return cubes; }
unsigned long long* get_points_ptr() { return &points; }

void init_game() {
    prng_seed((unsigned int)(random_float() * 4294967295.0f));
    points = 0;
    for(int c = 0; c < MAX_CUBES; c++) {
        cube_init_faces(&cubes[c], c == 0);
    }
}

static const int EDGE_MAP[6][4][3] = {
  { {4, 2, 0}, {1, 3, 0}, {5, 0, 0}, {3, 1, 0} }, // Face 0
  { {4, 1, 1}, {2, 3, 0}, {5, 1, 0}, {0, 1, 0} }, // Face 1
  { {4, 0, 1}, {3, 3, 0}, {5, 2, 1}, {1, 1, 0} }, // Face 2
  { {4, 3, 1}, {0, 3, 0}, {5, 3, 0}, {2, 1, 0} }, // Face 3
  { {2, 0, 1}, {1, 0, 1}, {0, 0, 0}, {3, 0, 1} }, // Face 4
  { {0, 2, 0}, {1, 2, 0}, {2, 2, 1}, {3, 2, 0} }  // Face 5
};

int get_aggregated_halo_value(int cubeIdx, int faceIdx, int haloR, int haloC) {
    Face* face = &cubes[cubeIdx].faces[faceIdx];

    int outEdge = -1;
    int num1 = 0, num2 = 0, denom = 1;
    if (haloR < 0) { outEdge = 0; num1 = haloC; num2 = haloC + 1; denom = face->cols; }
    else if (haloR >= face->rows) { outEdge = 2; num1 = haloC; num2 = haloC + 1; denom = face->cols; }
    else if (haloC < 0) { outEdge = 3; num1 = haloR; num2 = haloR + 1; denom = face->rows; }
    else if (haloC >= face->cols) { outEdge = 1; num1 = haloR; num2 = haloR + 1; denom = face->rows; }
    else { return 0; }

    if (num1 < 0) num1 = 0;
    if (num2 > denom) num2 = denom;

    const int* mapping = EDGE_MAP[faceIdx][outEdge];
    int targetFaceIdx = mapping[0];
    int targetEdge = mapping[1];
    int reverse = mapping[2];

    Face* targetFace = &cubes[cubeIdx].faces[targetFaceIdx];
    if (!targetFace->unlocked) return 0;

    if (reverse) {
        int tmp1 = denom - num2;
        int tmp2 = denom - num1;
        num1 = tmp1;
        num2 = tmp2;
    }

    int targetSize = (targetEdge == 0 || targetEdge == 2) ? targetFace->cols : targetFace->rows;
    int start = num1 * targetSize / denom;
    int end = num2 * targetSize / denom;

    if (end == start && end < targetSize) end = start + 1;
    if (end > targetSize) end = targetSize;
    if (start >= end) start = end - 1;
    if (start < 0) start = 0;

    int sum = 0;
    for (int i = start; i < end; i++) {
        int tR = 0, tC = 0;
        if (targetEdge == 0) { tR = 0; tC = i; }
        else if (targetEdge == 1) { tC = targetFace->cols - 1; tR = i; }
        else if (targetEdge == 2) { tR = targetFace->rows - 1; tC = i; }
        else if (targetEdge == 3) { tC = 0; tR = i; }

        if (targetFace->grid[tR][tC].meta & 1) sum++;
    }

    return sum;
}

void sync_halos() {
    for (int cIdx = 0; cIdx < MAX_CUBES; cIdx++) {
        for (int fIdx = 0; fIdx < 6; fIdx++) {
            Face* face = &cubes[cIdx].faces[fIdx];
            if (!face->unlocked) continue;

            // top row (r = -1)
            for (int c = -1; c <= face->cols; c++) {
                int v = get_aggregated_halo_value(cIdx, fIdx, -1, c);
                face->halo[0][c + 1] = v;
                if (v > 0) {
                    int clamp_c = c;
                    if (clamp_c < 0) clamp_c = 0;
                    if (clamp_c >= face->cols) clamp_c = face->cols - 1;
                    face->active_chunks[0][clamp_c / 10] = 1;
                }
            }
            // bottom row (r = face->rows)
            for (int c = -1; c <= face->cols; c++) {
                int v = get_aggregated_halo_value(cIdx, fIdx, face->rows, c);
                face->halo[face->rows + 1][c + 1] = v;
                if (v > 0) {
                    int clamp_c = c;
                    if (clamp_c < 0) clamp_c = 0;
                    if (clamp_c >= face->cols) clamp_c = face->cols - 1;
                    face->active_chunks[(face->rows - 1) / 10][clamp_c / 10] = 1;
                }
            }
            // left col (c = -1) - exclude corners
            for (int r = 0; r < face->rows; r++) {
                int v = get_aggregated_halo_value(cIdx, fIdx, r, -1);
                face->halo[r + 1][0] = v;
                if (v > 0) {
                    face->active_chunks[r / 10][0] = 1;
                }
            }
            // right col (c = face->cols) - exclude corners
            for (int r = 0; r < face->rows; r++) {
                int v = get_aggregated_halo_value(cIdx, fIdx, r, face->cols);
                face->halo[r + 1][face->cols + 1] = v;
                if (v > 0) {
                    face->active_chunks[r / 10][(face->cols - 1) / 10] = 1;
                }
            }
        }
    }
}

void tick_face(int cubeIdx, int faceIdx) {
    if (cubeIdx < 0 || cubeIdx >= MAX_CUBES || faceIdx < 0 || faceIdx >= 6) return;
    face_tick(&cubes[cubeIdx].faces[faceIdx], &points);
}

void toggle_cell(int cubeIdx, int faceIdx, int r, int c) {
    if (cubeIdx < 0 || cubeIdx >= MAX_CUBES || faceIdx < 0 || faceIdx >= 6) return;
    face_toggle_cell(&cubes[cubeIdx].faces[faceIdx], r, c);
}

void set_debug_mode(int mode) {
    debug_mode = mode;
}

void debug_max_all() {
    for (int c = 0; c < MAX_CUBES; c++) {
        for (int f = 0; f < 6; f++) {
            cubes[c].faces[f].unlocked = 1;
        }
        cube_debug_max_all(&cubes[c]);
    }
}

void debug_max_auto_tick() {
    for (int c = 0; c < MAX_CUBES; c++) {
        cube_debug_max_auto_tick(&cubes[c]);
    }
}

void buy_expansion(int cubeIdx, int faceIdx, int amount) {
    if (cubeIdx < 0 || cubeIdx >= MAX_CUBES || faceIdx < 0 || faceIdx >= 6) return;
    face_buy_expansion(&cubes[cubeIdx].faces[faceIdx], &points, debug_mode, amount);
}

void buy_autotick(int cubeIdx, int faceIdx, int amount) {
    if (cubeIdx < 0 || cubeIdx >= MAX_CUBES || faceIdx < 0 || faceIdx >= 6) return;
    face_buy_autotick(&cubes[cubeIdx].faces[faceIdx], &points, debug_mode, amount);
}

int get_unlocked_faces_count() {
    int count = 0;
    for (int c = 0; c < MAX_CUBES; c++) {
        count += cube_get_unlocked_faces_count(&cubes[c]);
    }
    return count;
}

unsigned long long get_prestige_cost() {
    int count = get_unlocked_faces_count();
    unsigned long long cost = 50000;
    for (int i = 1; i < count; i++) {
        unsigned long long next = (cost * 5) / 2;
        if (next < cost) { cost = 0xFFFFFFFFFFFFFFFFULL; break; } // overflow
        cost = next;
    }
    return cost;
}

void buy_prestige() {
    unsigned long long cost = get_prestige_cost();
    if (!debug_mode && points < cost) return;

    int allMaxed = 1;
    for (int c = 0; c < MAX_CUBES; c++) {
        for (int f = 0; f < 6; f++) {
            if (cubes[c].faces[f].unlocked) {
                if (cubes[c].faces[f].rows < current_max_grid || cubes[c].faces[f].cols < current_max_grid) {
                    allMaxed = 0;
                    break;
                }
            }
        }
        if (!allMaxed) break;
    }

    if (!debug_mode && !allMaxed) return;

    int nextCube = -1;
    int nextFace = -1;
    for (int c = 0; c < MAX_CUBES; c++) {
        for (int f = 0; f < 6; f++) {
            if (!cubes[c].faces[f].unlocked) {
                nextCube = c;
                nextFace = f;
                goto found;
            }
        }
    }
found:
    if (nextCube == -1) return;

    points = 0;
    cubes[nextCube].faces[nextFace].unlocked = 1;

    for (int c = 0; c < MAX_CUBES; c++) {
        cube_reset_unlocked_faces(&cubes[c]);
    }
}

void buy_ascend() {
    int allMaxed = 1;
    for (int c = 0; c < MAX_CUBES; c++) {
        for (int f = 0; f < 6; f++) {
            if (!cubes[c].faces[f].unlocked || cubes[c].faces[f].rows < current_max_grid || cubes[c].faces[f].cols < current_max_grid) {
                allMaxed = 0;
                break;
            }
        }
        if (!allMaxed) break;
    }

    if (!debug_mode && !allMaxed) return;

    if (ascension_count < 5) {
        ascension_count++;
        current_max_grid += 10;
        if (current_max_grid > 100) current_max_grid = 100;
    }

    init_game();
}

void debug_max_ascend() {
    ascension_count = 5;
    current_max_grid = 100;
}
