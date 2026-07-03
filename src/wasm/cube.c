#include "cube.h"
#include "globals.h"

void cube_init_faces(Cube* cube, int is_first_cube) {
    for(int f = 0; f < FACES_PER_CUBE; f++) {
        cube->faces[f].unlocked = (is_first_cube && f == 0) ? 1 : 0;
        face_reset(&cube->faces[f]);
    }
}

void cube_reset_unlocked_faces(Cube* cube) {
    for (int f = 0; f < FACES_PER_CUBE; f++) {
        if (cube->faces[f].unlocked) {
            face_reset(&cube->faces[f]);
        }
    }
}

int cube_get_unlocked_faces_count(Cube* cube) {
    int count = 0;
    for (int f = 0; f < FACES_PER_CUBE; f++) {
        if (cube->faces[f].unlocked) count++;
    }
    return count;
}

void cube_debug_max_all(Cube* cube) {
    int max_g = get_max_grid();
    for (int f = 0; f < FACES_PER_CUBE; f++) {
        if (cube->faces[f].unlocked) {
            cube->faces[f].rows = max_g;
            cube->faces[f].cols = max_g;
        }
    }
}

void cube_debug_max_auto_tick(Cube* cube) {
    for (int f = 0; f < FACES_PER_CUBE; f++) {
        if (cube->faces[f].unlocked) {
            cube->faces[f].autoTick = 100;
        }
    }
}
