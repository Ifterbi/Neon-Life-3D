#ifndef CUBE_H
#define CUBE_H

#include "face.h"

#define FACES_PER_CUBE 6

typedef struct {
    Face faces[FACES_PER_CUBE];
} Cube;

void cube_init_faces(Cube* cube, int is_first_cube);
void cube_reset_unlocked_faces(Cube* cube);
int cube_get_unlocked_faces_count(Cube* cube);
void cube_debug_max_all(Cube* cube);
void cube_debug_max_auto_tick(Cube* cube);

#endif
