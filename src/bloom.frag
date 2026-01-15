#version 300 es
precision highp float;

in vec2 v_texCoord;
#define tex_coord v_texCoord

out vec4 outColor;

uniform sampler2D u_texture;
#define t0 u_texture

uniform float bloom_spread; // e.g. 1
uniform float bloom_intensity; // e.g. 2

void main() {
	ivec2 size = textureSize(t0, 0);

    float uv_x = tex_coord.x * float(size.x);
    float uv_y = tex_coord.y * float(size.y);

    vec4 sum = vec4(0.0);
    for(int n = 0; n < 9; ++n) {
        uv_y = (tex_coord.y * float(size.y)) + (bloom_spread * float(n - 4));
        vec4 h_sum = vec4(0.0);
        h_sum += texelFetch(t0, ivec2(uv_x - (4.0 * bloom_spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - (3.0 * bloom_spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - (2.0 * bloom_spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - bloom_spread, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + bloom_spread, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (2.0 * bloom_spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (3.0 * bloom_spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (4.0 * bloom_spread), uv_y), 0);
        sum += h_sum / 9.0;
    }

    outColor = texture(t0, tex_coord) + ((sum / 9.0) * bloom_intensity);
}