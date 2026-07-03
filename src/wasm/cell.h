#ifndef CELL_H
#define CELL_H

typedef struct {
    unsigned char r;
    unsigned char g;
    unsigned char b;
    unsigned char meta; // bit 0: alive, bits 1-4: neighbor count
} Cell;

void cell_clear(Cell* cell);
void cell_randomize(Cell* cell);
void cell_toggle(Cell* cell);
unsigned long long cell_get_points(Cell* cell, int multiplier);
void cell_evolve(Cell* cell);
void cell_set_next_state(Cell* current, Cell* next, int nextAlive, int neighbors);

#endif
