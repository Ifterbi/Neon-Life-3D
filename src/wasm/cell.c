#include "cell.h"
#include "globals.h"

void cell_clear(Cell* cell) {
    cell->meta = 0;
    cell->r = 0;
    cell->g = 0;
    cell->b = 0;
}

void cell_randomize(Cell* cell) {
    cell_clear(cell);
    if (prng_float() > 0.99f) {
        cell->meta |= 1;
    }
}

void cell_toggle(Cell* cell) {
    cell->meta ^= 1;
}

unsigned long long cell_get_points(Cell* cell, int multiplier) {
    unsigned long long sum = cell->r + cell->g + cell->b;
    unsigned long long earned = sum / 100;
    if (earned < 1) earned = 1;
    return earned * multiplier;
}

void cell_evolve(Cell* cell) {
    int available[3];
    int count = 0;

    if (cell->r > 0 && cell->r < 255) {
        int val = cell->r + 25;
        cell->r = val > 255 ? 255 : val;
        return;
    }
    available[count++] = 0;

    if (cell->g > 0 && cell->g < 255) {
        int val = cell->g + 25;
        cell->g = val > 255 ? 255 : val;
        return;
    }
    available[count++] = 1;

    if (cell->b > 0 && cell->b < 255) {
        int val = cell->b + 25;
        cell->b = val > 255 ? 255 : val;
        return;
    }
    available[count++] = 2;

    if (count > 0) {
        int choice = (int)(prng_float() * count);
        int channel = available[choice];
        switch (channel) {
            case 0:
                cell->r = 25;
                break;
            case 1:
                cell->g = 25;
                break;
            case 2:
                cell->b = 25;
                break;
        }
    }
}

void cell_set_next_state(Cell* current, Cell* next, int nextAlive, int neighbors) {
    next->meta = nextAlive | ((unsigned char)(neighbors & 0x0F) << 1);
    next->r = current->r;
    next->g = current->g;
    next->b = current->b;
}
