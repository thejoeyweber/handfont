"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react"
import * as THREE from "three"

interface ImageDistortionEffectProps {
  imageSrc: string
  onLoad?: () => void
}

export interface ImageDistortionEffectRef {
  handleMouseMove: (clientX: number, clientY: number) => void
  handleMouseEnter: () => void
  handleMouseLeave: () => void
}

export const ImageDistortionEffect = forwardRef<
  ImageDistortionEffectRef,
  ImageDistortionEffectProps
>(({ imageSrc, onLoad }, ref) => {
  // Refs for canvas and animation frame
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number | null>(null)

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const uniformsRef = useRef<any>(null)
  const textureRef = useRef<THREE.Texture | null>(null)

  // Ref to store original image dimensions once loaded - never changes
  const originalImageSizeRef = useRef<{ width: number; height: number } | null>(
    null
  )

  // Refs for mouse tracking
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const isHoveringRef = useRef<boolean>(false)
  const velocityRef = useRef<number>(0)
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 })

  // State for dimensions and loading
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isLoaded, setIsLoaded] = useState(false)

  // Expose methods to parent component
  useImperativeHandle(
    ref,
    () => ({
      handleMouseMove: (clientX: number, clientY: number) => {
        handleMouseMove(clientX, clientY)
      },
      handleMouseEnter: () => {
        isHoveringRef.current = true
      },
      handleMouseLeave: () => {
        isHoveringRef.current = false
        if (uniformsRef.current) {
          uniformsRef.current.uMouse.value.x = -0.1
          uniformsRef.current.uMouse.value.y = -0.1
        }
      }
    }),
    []
  )

  // Function to update the renderer and uniforms with current dimensions
  const updateCanvasSize = useCallback(() => {
    if (!canvasRef.current || !rendererRef.current || !uniformsRef.current)
      return

    const parent = canvasRef.current.parentElement
    if (!parent) return

    const { width, height } = parent.getBoundingClientRect()

    // Only update if dimensions actually changed
    if (width === dimensions.width && height === dimensions.height) return

    // Update renderer size
    rendererRef.current.setSize(width, height, false)

    // Update ONLY resolution uniforms - leave image dimensions untouched
    uniformsRef.current.uResolution.value.x = width
    uniformsRef.current.uResolution.value.y = height

    // Update dimensions state
    setDimensions({ width, height })

    // Force render with updated dimensions
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }
  }, [dimensions])

  // Initialize the WebGL scene
  useEffect(() => {
    if (!canvasRef.current) return

    // Get the canvas element
    const canvas = canvasRef.current

    // Get parent dimensions
    const parent = canvas.parentElement
    if (!parent) return

    const { width, height } = parent.getBoundingClientRect()
    setDimensions({ width, height })

    // Create scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Create camera
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = 1
    cameraRef.current = camera

    // Create renderer with settings to prevent flicker
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    })
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    // Create placeholder texture
    const placeholderTexture = new THREE.Texture()
    const placeholderCanvas = document.createElement("canvas")
    placeholderCanvas.width = 2
    placeholderCanvas.height = 2
    const ctx = placeholderCanvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, 2, 2)
      placeholderTexture.image = placeholderCanvas
      placeholderTexture.needsUpdate = true
    }

    // Create shader uniforms - use default values for now
    const uniforms = {
      uTexture: { value: placeholderTexture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uVelo: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uImageSize: { value: new THREE.Vector2(16, 9) } // Default 16:9 aspect ratio until loaded
    }
    uniformsRef.current = uniforms

    // Create fragment shader
    const fragmentShader = `
        uniform float uTime;
        uniform sampler2D uTexture;
        uniform vec2 uMouse;
        uniform float uVelo;
        uniform vec2 uResolution;
        uniform vec2 uImageSize;
        varying vec2 vUv;
        
        // Function for pseudo-random values
        float hash12(vec2 p) {
          float h = dot(p,vec2(127.1,311.7));	
          return fract(sin(h)*43758.5453123);
        }
        
        // Function for organic ripple effect
        float organicRipple(vec2 uv, vec2 center, float time) {
          float dist = distance(uv, center);
          float distort = sin(dist * 20.0 - time * 2.0) * 0.005;
          distort += sin(dist * 30.0 - time * 3.0) * 0.003;
          distort += sin(dist * 50.0 - time * 1.5) * 0.001;
          return distort;
        }
        
        void main() {
          // Start with original UV coordinates
          vec2 newUV = vUv;
          
          // Get aspect ratios for proper calculation
          float imageAspect = uImageSize.x / uImageSize.y;
          float screenAspect = uResolution.x / uResolution.y;
          
          // CRITICAL FIX: Always use cover behavior - maintain aspect ratio and fill screen
          // The principle is to ensure the SHORTER dimension fills the view completely
          if (screenAspect < imageAspect) {
            // Screen is narrower than image - scale image height to fill height, width proportional
            float scale = screenAspect / imageAspect;
            // Center horizontally
            newUV.x = 0.5 + (newUV.x - 0.5) * (1.0/scale);
          } else {
            // Screen is wider than image - scale image width to fill width, height proportional
            float scale = imageAspect / screenAspect;
            // Center vertically
            newUV.y = 0.5 + (newUV.y - 0.5) * (1.0/scale); 
          }
          
          // Calculate distance from mouse position
          vec2 mouse = uMouse;
          bool isDefault = (mouse.x < 0.01 && mouse.y < 0.01) || (mouse.x > 0.99 && mouse.y > 0.99);
          
          if (!isDefault) {
            float dist = distance(newUV, mouse);
            
            // Define effect parameters
            float innerRadius = 0.05;
            float maxRadius = 0.20;
            float featherZone = 0.25;
            
            // Calculate effect intensity with smooth falloff
            float intensity = 1.0 - smoothstep(innerRadius, maxRadius, dist);
            intensity = pow(intensity, 1.5);
            
            // Apply distortion when within radius - with performance optimizations
            if (dist < maxRadius * 1.2) {
              // Pull toward mouse position (primary effect) - simplified for performance
              float magnetStrength = intensity * 0.35;
              newUV = mix(newUV, mouse, magnetStrength);
              
              // Add velocity-based effects only when the cursor is moving fast
              float veloPower = uVelo * 10.0;
              
              if (veloPower > 0.05) {
                // Add organic ripple only when moving fast (saves calculations)
                float ripple = organicRipple(newUV, mouse, uTime);
                newUV += ripple * intensity * min(veloPower, 0.3);
                
                // Add action lines when moving cursor quickly
                vec2 dir = normalize(newUV - mouse);
                float angle = atan(dir.y, dir.x);
                float actionLines = sin(angle * 12.0 + uTime * 5.0) * 0.003 * veloPower;
                
                float actionIntensity = intensity * smoothstep(maxRadius, innerRadius, dist);
                newUV += dir * actionLines * actionIntensity;
              }
            }
            
            // Apply color effects in a wider area
            if (dist < maxRadius * featherZone) {
              // Calculate color shift strength based on velocity and distance
              float separationIntensity = smoothstep(maxRadius * featherZone, innerRadius * 0.8, dist) * min(uVelo * 5.0, 0.5);
              
              // Get texture color with shifted coordinates
              vec2 rOffset = vec2(0.02, 0.02) * separationIntensity;
              vec2 bOffset = -rOffset;
              
              // Sample texture once if no significant separation effect
              if (separationIntensity < 0.02) {
                vec4 texColor = texture2D(uTexture, newUV);
                
                // Apply comic effect with tinting
                texColor.r = min(texColor.r * 1.3, 1.0);
                texColor.g = min(texColor.g * 0.85, 1.0);
                
                gl_FragColor = texColor;
              } else {
                // Full color separation effect
                float r = texture2D(uTexture, newUV + rOffset).r;
                float g = texture2D(uTexture, newUV).g;
                float b = texture2D(uTexture, newUV + bOffset).b;
                
                // Enhance contrast for comic effect 
                r = smoothstep(0.3, 0.7, r);
                g = smoothstep(0.2, 0.8, g);
                b = smoothstep(0.3, 0.7, b);
                
                // Orange tint
                vec4 color = vec4(r, g, b, 1.0);
                color.r = min(color.r * 1.3, 1.0);
                color.g = min(color.g * 0.85, 1.0);
                
                gl_FragColor = color;
              }
            } else {
              gl_FragColor = texture2D(uTexture, newUV);
            }
          } else {
            // Default rendering when no mouse interaction
            gl_FragColor = texture2D(uTexture, newUV);
          }
        }
      `

    // Create vertex shader
    const vertexShader = `
        varying vec2 vUv;
        
        void main() {
          // Pass UVs unchanged to fragment shader
          vUv = uv;
          
          // Standard vertex position calculation
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `

    // Create material
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    })

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1)

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Load the texture only once
    const loadTexture = () => {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = "anonymous"

      loader.load(
        imageSrc,
        texture => {
          // Apply texture settings
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.generateMipmaps = false
          texture.wrapS = THREE.ClampToEdgeWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping

          // Store the original image dimensions - CRITICAL
          const image = texture.image
          if (image && image.width && image.height) {
            const imgWidth = image.width
            const imgHeight = image.height

            // Store dimensions in our ref for future use
            originalImageSizeRef.current = {
              width: imgWidth,
              height: imgHeight
            }

            // Set the dimensions in our uniforms - NEVER change these after initial setup
            uniformsRef.current.uImageSize.value.x = imgWidth
            uniformsRef.current.uImageSize.value.y = imgHeight

            console.log(
              `Image loaded - Dimensions: ${imgWidth}x${imgHeight}, Aspect Ratio: ${imgWidth / imgHeight}`
            )
          }

          // Update texture uniform
          uniformsRef.current.uTexture.value = texture
          textureRef.current = texture
          texture.needsUpdate = true

          // Mark as loaded
          setIsLoaded(true)
          if (onLoad) onLoad()

          // Force an initial render
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current)
          }
        },
        undefined,
        error => {
          console.error("Error loading texture:", error)
        }
      )
    }

    // Load the texture
    loadTexture()

    // Clean up
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      if (geometry) geometry.dispose()
      if (material) material.dispose()
      if (renderer) renderer.dispose()
      if (textureRef.current) textureRef.current.dispose()
    }
  }, [imageSrc, onLoad])

  // Animation loop with performance optimizations
  useEffect(() => {
    if (
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !uniformsRef.current
    )
      return

    // Track last frame time for more consistent animation speed
    let lastTime = performance.now()
    let needsRender = true

    const animate = () => {
      const uniforms = uniformsRef.current
      const renderer = rendererRef.current
      const scene = sceneRef.current
      const camera = cameraRef.current

      if (uniforms && renderer && scene && camera) {
        // Calculate delta time for smoother animation
        const currentTime = performance.now()
        const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2) // Cap at 2x normal speed
        lastTime = currentTime

        // Update time uniform
        uniforms.uTime.value += 0.01 * deltaTime

        // Update velocity
        uniforms.uVelo.value = velocityRef.current

        // Decay velocity with delta time adjustment
        if (velocityRef.current > 0.001) {
          velocityRef.current *= Math.pow(0.95, deltaTime)
          needsRender = true
        }

        // Add subtle movement when hovering
        if (isHoveringRef.current) {
          const time = uniforms.uTime.value
          const idleAmplitude = 0.0005
          uniforms.uMouse.value.x +=
            Math.sin(time * 0.3) * idleAmplitude * deltaTime
          uniforms.uMouse.value.y +=
            Math.cos(time * 0.2) * idleAmplitude * deltaTime
          needsRender = true
        }

        // Only render when necessary
        if (needsRender) {
          renderer.render(scene, camera)
          needsRender = false
        }
      }

      requestRef.current = requestAnimationFrame(animate)
    }

    requestRef.current = requestAnimationFrame(animate)

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  // Simplified resize handling
  useEffect(() => {
    // Just one simple resize handler
    const handleResize = () => {
      // Use our updateCanvasSize function
      updateCanvasSize()
    }

    // Initial setup
    handleResize()

    // Use ResizeObserver if available
    let resizeObserver: ResizeObserver | null = null

    if (
      typeof ResizeObserver !== "undefined" &&
      canvasRef.current?.parentElement
    ) {
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(canvasRef.current.parentElement)
    } else {
      // Fallback to window resize
      window.addEventListener("resize", handleResize)
    }

    return () => {
      if (resizeObserver && canvasRef.current?.parentElement) {
        resizeObserver.unobserve(canvasRef.current.parentElement)
        resizeObserver.disconnect()
      }
      window.removeEventListener("resize", handleResize)
    }
  }, [updateCanvasSize])

  // Handle mouse movement - optimized for performance
  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !uniformsRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Calculate normalized coordinates (0-1) - we do this once
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const normY = Math.max(
      0,
      Math.min(1, 1 - (clientY - rect.top) / rect.height)
    ) // Invert Y for WebGL

    // Calculate velocity - only if significant movement to avoid micro-movements
    const dx = normX - prevMouseRef.current.x
    const dy = normY - prevMouseRef.current.y
    const distSquared = dx * dx + dy * dy

    // Only process if there's meaningful movement (reduces calculations)
    if (distSquared > 0.00001) {
      const velocity = Math.sqrt(distSquared)
      velocityRef.current = Math.min(velocity * 20, 0.1)

      // Update position refs
      mouseRef.current = { x: normX, y: normY }
      prevMouseRef.current = { x: normX, y: normY }

      // Update shader uniforms
      const uniforms = uniformsRef.current
      uniforms.uMouse.value.x = normX
      uniforms.uMouse.value.y = normY
      uniforms.uVelo.value = velocityRef.current

      // Trigger an immediate render if not animating fast enough
      if (
        rendererRef.current &&
        sceneRef.current &&
        cameraRef.current &&
        velocityRef.current > 0.01
      ) {
        // Force render for responsive feel on fast movements
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[3] size-full"
      style={{
        opacity: isLoaded ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
        touchAction: "none"
      }}
    />
  )
})

ImageDistortionEffect.displayName = "ImageDistortionEffect"
