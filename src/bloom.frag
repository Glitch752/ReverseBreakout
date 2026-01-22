#version 300 es
precision highp float;

in vec2 v_texCoord;
#define tex_coord v_texCoord

out vec4 outColor;

uniform sampler2D u_texture;
#define t0 u_texture

uniform float bloom_spread; // e.g. 1
uniform float bloom_intensity; // e.g. 2
uniform float filter_amount; // e.g. 0.5

void main() {
	ivec2 size = textureSize(t0, 0);

    float uv_x = tex_coord.x * float(size.x);
    float uv_y = tex_coord.y * float(size.y);

    // Increase spread based on filter amount
    float spread = bloom_spread * (1.0 + filter_amount);

    vec4 sum = vec4(0.0);
    for(int n = 0; n < 9; ++n) {
        uv_y = (tex_coord.y * float(size.y)) + (spread * float(n - 4));
        vec4 h_sum = vec4(0.0);
        h_sum += texelFetch(t0, ivec2(uv_x - (4.0 * spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - (3.0 * spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - (2.0 * spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x - spread, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + spread, uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (2.0 * spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (3.0 * spread), uv_y), 0);
        h_sum += texelFetch(t0, ivec2(uv_x + (4.0 * spread), uv_y), 0);
        sum += h_sum / 9.0;
    }

    outColor = texture(t0, tex_coord) + ((sum / 9.0) * bloom_intensity);

    // Apply a simple grayscale/desaturation filter based on filter_amount
    float gray = dot(outColor.rgb, vec3(0.299, 0.587, 0.114));
    outColor.rgb = mix(outColor.rgb, vec3(gray), filter_amount);
}