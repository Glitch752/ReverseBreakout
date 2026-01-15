const DEFAULT_VERTEX_SHADER = `#version 300 es
out vec2 v_texCoord;
void main() {
    // Single triangle covering the viewport
    v_texCoord = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(v_texCoord * 2.0 - 1.0, 0.0, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_texCoord;
out vec4 outColor;
uniform sampler2D u_texture;
void main() {
    outColor = texture(u_texture, v_texCoord);
}
`;

/**
 * A wrapper around a canvas to run a WebGL2 GLSL shader on the contents of a 2D canvas.
 */
export class Shader2DCanvas {
    private canvas2D: HTMLCanvasElement;
    private resizeObserver: ResizeObserver;
    
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private texture: WebGLTexture;
    private framebuffer: WebGLFramebuffer;

    private fragmentShaderSource: string;
    private vertexShaderSource: string;

    private uniformLocations: { [key: string]: WebGLUniformLocation } = {};
    
    constructor(private canvas: HTMLCanvasElement, options?: {
        fragment?: string,
        vertex?: string
    }) {
        this.fragmentShaderSource = options?.fragment ?? DEFAULT_FRAGMENT_SHADER;
        this.vertexShaderSource = options?.vertex ?? DEFAULT_VERTEX_SHADER;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        this.canvas2D = document.createElement('canvas');
        this.canvas2D.width = canvas.width;
        this.canvas2D.height = canvas.height;

        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = gl;

        this.program = this.initShaderProgram();
        this.texture = gl.createTexture();
        this.framebuffer = gl.createFramebuffer();

        gl.useProgram(this.program);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Flip Y axis to match canvas coordinate system
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        this.resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;

            this.canvas2D.width = canvas.width;
            this.canvas2D.height = canvas.height;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        });
        this.resizeObserver.observe(canvas);
    }

    private initShaderProgram(): WebGLProgram {
        const gl = this.gl;
        const vertexShader = this.loadShader(gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource);
        const shaderProgram = gl.createProgram() as WebGLProgram;
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        }
        return shaderProgram;
    }

    private loadShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type) as WebGLShader;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    public render() {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas2D);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /**
     * Set the value of a uniform variable in the shader program.
     */
    public setUniform1i(name: string, value: number) {
        const gl = this.gl;
        if(!(name in this.uniformLocations)) {
            this.uniformLocations[name] = gl.getUniformLocation(this.program, name) as WebGLUniformLocation;
        }
        gl.uniform1f(this.uniformLocations[name], value);
    }

    /**
     * Get the 2D rendering context of the internal canvas.
     */
    public getContext2D(): CanvasRenderingContext2D {
        return this.canvas2D.getContext('2d') as CanvasRenderingContext2D;
    }
}