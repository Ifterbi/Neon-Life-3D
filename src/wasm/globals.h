#ifndef GLOBALS_H
#define GLOBALS_H

// Exposed by JS environment (used only for seeding)
extern float random_float();

// Fast C-side xorshift32 PRNG
static unsigned int prng_state = 1;

static inline void prng_seed(unsigned int seed) {
    prng_state = seed ? seed : 1;
}

static inline unsigned int prng_next() {
    prng_state ^= prng_state << 13;
    prng_state ^= prng_state >> 17;
    prng_state ^= prng_state << 5;
    return prng_state;
}

// Returns a float in [0, 1)
static inline float prng_float() {
    return (float)(prng_next() & 0x7FFFFF) / (float)0x800000;
}

int get_max_grid();
int get_ascension_count();

#endif
