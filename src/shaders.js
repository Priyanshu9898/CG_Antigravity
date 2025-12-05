// Battlezone - GLSL Shaders

const Shaders = {
    // Basic vertex shader for 3D objects
    basicVertex: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec3 aColor;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
            vWorldPosition = worldPosition.xyz;
            vPosition = (uViewMatrix * worldPosition).xyz;
            vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
            vColor = aColor;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
        }
    `,

    // Basic fragment shader with lighting
    basicFragment: `
        precision mediump float;
        
        uniform vec3 uColor;
        uniform vec3 uLightDirection;
        uniform vec3 uAmbientColor;
        uniform float uAlpha;
        uniform bool uUseVertexColor;
        uniform bool uFog;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;
        varying vec3 vWorldPosition;
        
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(uLightDirection);
            
            // Diffuse lighting
            float diff = max(dot(normal, lightDir), 0.0);
            
            // Use vertex color or uniform color
            vec3 baseColor = uUseVertexColor ? vColor : uColor;
            
            // Combine ambient and diffuse
            vec3 ambient = uAmbientColor * baseColor;
            vec3 diffuse = diff * baseColor * 0.7;
            vec3 finalColor = ambient + diffuse;
            
            // Apply fog
            if (uFog) {
                float depth = length(vPosition);
                float fogFactor = smoothstep(uFogNear, uFogFar, depth);
                finalColor = mix(finalColor, uFogColor, fogFactor);
            }
            
            gl_FragColor = vec4(finalColor, uAlpha);
        }
    `,

    // Wireframe/line shader
    lineVertex: `
        attribute vec3 aPosition;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        void main() {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        }
    `,

    lineFragment: `
        precision mediump float;
        
        uniform vec3 uColor;
        uniform float uAlpha;
        
        void main() {
            gl_FragColor = vec4(uColor, uAlpha);
        }
    `,

    // Particle shader for explosions
    particleVertex: `
        attribute vec3 aPosition;
        attribute vec3 aVelocity;
        attribute float aLife;
        attribute float aSize;
        
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform float uTime;
        
        varying float vLife;
        varying float vSize;
        
        void main() {
            // Calculate particle position based on time
            vec3 pos = aPosition + aVelocity * uTime;
            pos.y -= 4.9 * uTime * uTime; // Gravity
            
            vLife = aLife - uTime;
            vSize = aSize;
            
            vec4 viewPos = uViewMatrix * vec4(pos, 1.0);
            gl_Position = uProjectionMatrix * viewPos;
            gl_PointSize = aSize * (300.0 / -viewPos.z);
        }
    `,

    particleFragment: `
        precision mediump float;
        
        uniform vec3 uColor;
        
        varying float vLife;
        
        void main() {
            if (vLife <= 0.0) discard;
            
            // Circular particle
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            
            float alpha = vLife * (1.0 - dist * 2.0);
            gl_FragColor = vec4(uColor, alpha);
        }
    `,

    // Ground/terrain shader
    terrainVertex: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        varying float vHeight;
        
        void main() {
            vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
            vPosition = worldPos.xyz;
            vNormal = aNormal;
            vTexCoord = aTexCoord;
            vHeight = aPosition.y;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
        }
    `,

    terrainFragment: `
        precision mediump float;
        
        uniform vec3 uColorLow;
        uniform vec3 uColorHigh;
        uniform bool uFog;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform vec3 uLightDirection;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        varying float vHeight;
        
        void main() {
            // Height-based coloring
            float heightFactor = clamp(vHeight / 10.0, 0.0, 1.0);
            vec3 baseColor = mix(uColorLow, uColorHigh, heightFactor);
            
            // Simple lighting
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, normalize(uLightDirection)), 0.0);
            vec3 finalColor = baseColor * (0.4 + 0.6 * diff);
            
            // Grid pattern
            float grid = 0.0;
            vec2 gridCoord = vTexCoord * 20.0;
            if (fract(gridCoord.x) < 0.05 || fract(gridCoord.y) < 0.05) {
                grid = 0.1;
            }
            finalColor += grid;
            
            // Apply fog
            if (uFog) {
                float dist = length(vPosition);
                float fogFactor = smoothstep(uFogNear, uFogFar, dist);
                finalColor = mix(finalColor, uFogColor, fogFactor);
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,

    // Sky shader
    skyVertex: `
        attribute vec3 aPosition;
        
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec3 vPosition;
        
        void main() {
            vPosition = aPosition;
            // Remove translation from view matrix to keep skybox centered on camera
            mat4 view = uViewMatrix;
            view[3][0] = 0.0;
            view[3][1] = 0.0;
            view[3][2] = 0.0;
            
            gl_Position = uProjectionMatrix * view * vec4(aPosition, 1.0);
            // Force depth to max to render behind everything
            gl_Position.z = gl_Position.w;
        }
    `,

    skyFragment: `
        precision mediump float;
        
        varying vec3 vPosition;
        
        void main() {
            vec3 dir = normalize(vPosition);
            
            // Gradient based on Y direction
            // Night sky (Deep Blue)
            vec3 topColor = vec3(0.0, 0.05, 0.2);     // Very deep blue zenith
            vec3 horizonColor = vec3(0.1, 0.2, 0.4);  // Dark blue horizon
            vec3 bottomColor = vec3(0.05, 0.05, 0.1); // Dark ground
            
            vec3 color;
            if (dir.y > 0.0) {
                color = mix(horizonColor, topColor, pow(dir.y, 0.5));
            } else {
                color = mix(horizonColor, bottomColor, -dir.y);
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `,

    // Radar shader (2D orthographic)
    radarVertex: `
        attribute vec2 aPosition;
        
        uniform mat4 uProjectionMatrix;
        uniform vec2 uOffset;
        uniform float uScale;
        
        void main() {
            vec2 pos = (aPosition + uOffset) * uScale;
            gl_Position = uProjectionMatrix * vec4(pos, 0.0, 1.0);
            gl_PointSize = 6.0;
        }
    `,

    radarFragment: `
        precision mediump float;
        
        uniform vec3 uColor;
        uniform bool uIsPoint;
        
        void main() {
            if (uIsPoint) {
                vec2 coord = gl_PointCoord - vec2(0.5);
                if (length(coord) > 0.5) discard;
            }
            gl_FragColor = vec4(uColor, 1.0);
        }
    `,

    // Textured shader for power-ups
    texturedVertex: `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        uniform float uTime;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vTexCoord;
        
        void main() {
            vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
            vPosition = (uViewMatrix * worldPosition).xyz;
            vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
            vTexCoord = aTexCoord;
            gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
        }
    `,

    texturedFragment: `
        precision mediump float;
        
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        uniform vec3 uLightDirection;
        uniform float uTime;
        uniform float uGlow;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vTexCoord;
        
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(uLightDirection);
            
            // Sample texture
            vec4 texColor = texture2D(uTexture, vTexCoord);
            
            // Diffuse lighting
            float diff = max(dot(normal, lightDir), 0.0) * 0.5 + 0.5;
            
            // Mix texture with base color and add glow
            vec3 finalColor = texColor.rgb * diff;
            finalColor += uColor * uGlow * (0.5 + 0.5 * sin(uTime * 3.0));
            
            gl_FragColor = vec4(finalColor, texColor.a);
        }
    `
};

// Make available globally
window.Shaders = Shaders;
