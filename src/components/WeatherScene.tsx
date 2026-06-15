/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { WeatherSettings, SunPreset } from "../types";
import { Compass, Waves, Sun, MapPin } from "lucide-react";

interface WeatherSceneProps {
  settings: WeatherSettings;
  speedMultiplier: number;
  isFirstPerson: boolean;
}

export default function WeatherScene({
  settings,
  speedMultiplier,
  isFirstPerson,
}: WeatherSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Keep settings ref to avoid recreating ThreeJS resources on every React state change
  const settingsRef = useRef<WeatherSettings>(settings);
  settingsRef.current = settings;

  const speedMultiplierRef = useRef<number>(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;

  const isFirstPersonRef = useRef<boolean>(isFirstPerson);
  isFirstPersonRef.current = isFirstPerson;

  // Virtual Joypad state for mobile/inline compatibility
  const [showSubmergedUI, setShowSubmergedUI] = useState(false);
  const [fpsCoordinates, setFpsCoordinates] = useState({ x: 0, y: 3.5, z: 0 });

  // Movement input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const cameraRotation = useRef<{ yaw: number; pitch: number }>({
    yaw: -Math.PI / 2, // point towards the sea by default
    pitch: -0.1,
  });
  
  // Camera Position in 3D Space
  const cameraPosition = useRef<THREE.Vector3>(new THREE.Vector3(-45, 4.0, -15));
  
  // Standard mouse dragging control for looking around directly in iframe
  const isMouseDown = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Virtual controller triggers
  const virtualControls = useRef<{ forward: boolean; backward: boolean; left: boolean; right: boolean; up: boolean; down: boolean }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Height formula of sandy beach and dunes
  const getTerrainHeight = (x: number, z: number): number => {
    // Slopes down towards z = 20 where water begins
    const baseSlope = Math.max(-12, -z * 0.12);
    // Add nice rolling hills (dunes) on the beach
    const dunes = Math.sin(x * 0.04) * Math.cos(z * 0.05) * 2.2;
    // Base sandbox offset
    return 2.0 + baseSlope + dunes;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- 1. SETUP THREE.JS SCENE, CAMERA, & RENDERER ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.copy(cameraPosition.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // --- 2. PROCEDURAL TEXTURE GENERATORS ---
    
    // A. Wispy Cirrus clouds canvas texture
    const generateCirrusTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 512, 512);
      
      // Draw feathery streaks of white
      ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
      ctx.shadowBlur = 12;

      for (let i = 0; i < 28; i++) {
        ctx.lineWidth = 1 + Math.random() * 6;
        ctx.beginPath();
        let lx = -50;
        let ly = 30 + i * 18 + Math.random() * 15;
        ctx.moveTo(lx, ly);
        while (lx < 562) {
          lx += 15 + Math.random() * 25;
          ly += Math.sin(lx * 0.035) * 4 + (Math.random() * 4 - 2);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      return texture;
    };

    // B. Ripple-like Altocumulus clouds canvas texture
    const generateAltocumulusTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 256, 256);

      // Create a small grid of soft puffy cloudlets
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(255, 255, 255, 0.1)";

      for (let x = 16; x < 256; x += 40) {
        for (let y = 16; y < 256; y += 40) {
          const rx = x + (Math.random() * 10 - 5);
          const ry = y + (Math.random() * 10 - 5);
          const size = 6 + Math.random() * 8;
          
          const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, size);
          grad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
          grad.addColorStop(0.5, "rgba(240, 245, 255, 0.15)");
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(rx, ry, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(6, 6);
      return texture;
    };

    // --- 3. CREATING SIMULATION GEOMETRIES ---

    // A. Sky Sphere Dome
    const skyGeom = new THREE.SphereGeometry(450, 32, 15);
    // Render inside of sphere
    const skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
    });
    const skyDome = new THREE.Mesh(skyGeom, skyMat);
    scene.add(skyDome);

    // B. Sand Beach Heightmap / Ground
    const groundGeom = new THREE.PlaneGeometry(600, 600, 100, 100);
    groundGeom.rotateX(-Math.PI / 2);
    
    // Apply sandy height function to vertices
    const posAttr = groundGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getTerrainHeight(x, z);
      posAttr.setY(i, y);
    }
    groundGeom.computeVertexNormals();

    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe2ceb5, // Beautiful warm sand
      roughness: 0.9,
      metalness: 0.05,
      shadowSide: THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeom, sandMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // C. Ocean Surface Plane
    const oceanGeom = new THREE.PlaneGeometry(600, 600, 80, 80);
    oceanGeom.rotateX(-Math.PI / 2);
    
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x015c7a, // Deep coastal blue
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
    oceanMesh.position.y = 2.0; // Ocean levels
    scene.add(oceanMesh);

    // Seabed layer
    const seabedGeom = new THREE.PlaneGeometry(600, 600, 10, 10);
    seabedGeom.rotateX(-Math.PI / 2);
    const seabedMat = new THREE.MeshBasicMaterial({
      color: 0x14343d,
    });
    const seabedMesh = new THREE.Mesh(seabedGeom, seabedMat);
    seabedMesh.position.y = -18.0;
    scene.add(seabedMesh);

    // D. Cloud Layers Group
    const cirrusTexture = generateCirrusTexture();
    const cirrusPlaneGeom = new THREE.PlaneGeometry(800, 800);
    cirrusPlaneGeom.rotateX(Math.PI / 2);
    const cirrusMaterial = new THREE.MeshBasicMaterial({
      map: cirrusTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const cirrusCloud = new THREE.Mesh(cirrusPlaneGeom, cirrusMaterial);
    cirrusCloud.position.y = 110;
    scene.add(cirrusCloud);

    // Middle Layer (Altocumulus)
    const altocumulusTexture = generateAltocumulusTexture();
    const altoPlaneGeom = new THREE.PlaneGeometry(800, 800);
    altoPlaneGeom.rotateX(Math.PI / 2);
    const altocumulusMaterial = new THREE.MeshBasicMaterial({
      map: altocumulusTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const altocumulusCloud = new THREE.Mesh(altoPlaneGeom, altocumulusMaterial);
    altocumulusCloud.position.y = 70;
    scene.add(altocumulusCloud);

    // Low Level Volumetric Cumulus Clouds
    const cumulusGroup = new THREE.Group();
    scene.add(cumulusGroup);

    // Create 18 distinct physical fluffy cumulus clouds that map around boundaries
    const cumulusCloudsList: Array<{
      group: THREE.Group;
      baseX: number;
      baseZ: number;
    }> = [];

    const cloudMeshGeoGroup = new THREE.SphereGeometry(5, 12, 10);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xfdfdfd,
      transparent: true,
      opacity: 0.9,
    });

    for (let c = 0; c < 18; c++) {
      const cGroup = new THREE.Group();
      
      // Build a cluster of 5 spheres to look real fluffy
      const spheresCount = 4 + Math.floor(Math.random() * 3);
      for (let s = 0; s < spheresCount; s++) {
        const sMesh = new THREE.Mesh(cloudMeshGeoGroup, cloudMat);
        const radiusScale = 0.5 + Math.random() * 0.9;
        sMesh.scale.set(radiusScale, radiusScale * 0.7, radiusScale);
        
        // Offset spheres nested to form a beautiful cumulus
        sMesh.position.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.3) * 4,
          (Math.random() - 0.5) * 12
        );
        sMesh.castShadow = true;
        cGroup.add(sMesh);
      }

      // Scatter cloud starting positions
      const baseX = (Math.random() - 0.5) * 400;
      const baseZ = (Math.random() - 0.5) * 400;
      cGroup.position.set(baseX, 35 + Math.random() * 8, baseZ);
      
      cumulusGroup.add(cGroup);
      cumulusCloudsList.push({ group: cGroup, baseX, baseZ });
    }

    // E. Dynamic Bending Trees (12 procedurally created beach trees)
    const treesList: Array<{
      group: THREE.Group;
      trunkMesh: THREE.Mesh;
      leavesGroup: THREE.Group;
      originalX: number;
      originalZ: number;
      phaseOffset: number;
    }> = [];

    const generateTrees = () => {
      // Place trees around the beach mostly on dune slopes (X values between -100 and 10)
      const treePositions = [
        { x: -75, z: -40 },
        { x: -60, z: -70 },
        { x: -90, z: -10 },
        { x: -110, z: -50 },
        { x: -50, z: -25 },
        { x: -80, z: 20 },
        { x: -95, z: 75 },
        { x: -40, z: 65 },
        { x: -70, z: -110 },
        { x: -55, z: 120 },
        { x: -105, z: -115 },
        { x: -120, z: 40 },
      ];

      treePositions.forEach((pos, treeIdx) => {
        const treeGroup = new THREE.Group();
        const yCoord = getTerrainHeight(pos.x, pos.z);
        treeGroup.position.set(pos.x, yCoord, pos.z);

        // Cylinder trunk base
        const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 8, 8);
        trunkGeo.translate(0, 4, 0); // align origin pivot to the bottom
        const trunkMat = new THREE.MeshStandardMaterial({
          color: 0x5a3e2e,  // wood brown
          roughness: 0.9,
        });
        const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
        trunkMesh.castShadow = true;
        treeGroup.add(trunkMesh);

        // Cone segments of lush palm/pine foliage
        const leavesGroup = new THREE.Group();
        leavesGroup.position.y = 8; // placed on top of trunk

        const coneMat = new THREE.MeshStandardMaterial({
          color: 0x225c34, // beach forest green
          roughness: 0.7,
        });

        // 3 layers of leaves
        for (let l = 0; l < 3; l++) {
          const coneGeo = new THREE.ConeGeometry(3.5 - l * 0.8, 4.5, 8);
          coneGeo.translate(0, l * 2.2, 0);
          const leafBranch = new THREE.Mesh(coneGeo, coneMat);
          leafBranch.castShadow = true;
          leavesGroup.add(leafBranch);
        }
        
        treeGroup.add(leavesGroup);
        scene.add(treeGroup);

        treesList.push({
          group: treeGroup,
          trunkMesh,
          leavesGroup,
          originalX: pos.x,
          originalZ: pos.z,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      });
    };
    generateTrees();

    // F. Flagpole & Flapping Flag (Physics Response)
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 16, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const flagPole = new THREE.Mesh(poleGeo, poleMat);
    // position flag central in front of the starter beach view
    flagPole.position.set(-40, getTerrainHeight(-40, -10) + 8, -10);
    flagPole.castShadow = true;
    scene.add(flagPole);

    // Subdivided Flag Mesh
    const flagGeo = new THREE.PlaneGeometry(8, 4.5, 16, 8);
    // Move layout pivot to the left edge of flag (W = -4 to 4 shift to 0 to 8)
    flagGeo.translate(4, 0, 0);

    const flagCanvas = document.createElement("canvas");
    flagCanvas.width = 128;
    flagCanvas.height = 128;
    const fCtx = flagCanvas.getContext("2d")!;
    // Draw beautiful weather vane pattern (orange with wind arrows)
    fCtx.fillStyle = "#e11d48"; // vibrant cyan or crimson
    fCtx.fillRect(0, 0, 128, 128);
    fCtx.fillStyle = "#ffffff";
    fCtx.beginPath();
    // draw a stylized wind spiral/compass rose on the flag
    fCtx.arc(64, 64, 25, 0, Math.PI * 2);
    fCtx.lineWidth = 4;
    fCtx.strokeStyle = "#ffffff";
    fCtx.stroke();
    // wind arrow
    fCtx.moveTo(45, 64);
    fCtx.lineTo(83, 64);
    fCtx.lineTo(73, 54);
    fCtx.moveTo(83, 64);
    fCtx.lineTo(73, 74);
    fCtx.lineWidth = 5;
    fCtx.stroke();

    const flagTexture = new THREE.CanvasTexture(flagCanvas);
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTexture,
      roughness: 0.6,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0, 5, 0); // on top part of pole
    flagMesh.castShadow = true;
    flagPole.add(flagMesh);

    // G. Ambient Dust Particles (Haze/Scattering in the Wind Vector)
    const dustCount = 400;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);

    for (let d = 0; d < dustCount; d++) {
      dustPositions[d * 3] = (Math.random() - 0.5) * 150; // spread around camera
      dustPositions[d * 3 + 1] = 1 + Math.random() * 25;
      dustPositions[d * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    
    const dustMat = new THREE.PointsMaterial({
      color: 0xe2a85c, // sandy dust yellow-brown
      size: 0.45,
      transparent: true,
      opacity: 0.65,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // H. Visual Sun Sphere representing absolute position
    const sunVisGeo = new THREE.SphereGeometry(14, 16, 16);
    const sunVisMat = new THREE.MeshBasicMaterial({ color: 0xfff3cc });
    const sunSphereVisual = new THREE.Mesh(sunVisGeo, sunVisMat);
    scene.add(sunSphereVisual);

    // --- 4. LIGHTING & FOG ---

    // Ambient light maps generally to sun presets
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional Light with real shadows
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 400;
    
    // Bounds for beach shadows
    const dFar = 100;
    dirLight.shadow.camera.left = -dFar;
    dirLight.shadow.camera.right = dFar;
    dirLight.shadow.camera.top = dFar;
    dirLight.shadow.camera.bottom = -dFar;
    scene.add(dirLight);

    // Exponential ground fog
    scene.fog = new THREE.FogExp2(0xd6e5eb, 0.005);

    // Auxiliary Hemisphere Sky Light for soft bounce fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemiLight);

    // --- 5. KEYBOARD LYNCS & INPUT HANDLERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // --- 6. DRAG-TO-LOOK HANDLERS (iframe friendly) ---
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      const sensitivity = 0.0035;
      cameraRotation.current.yaw -= deltaX * sensitivity;
      cameraRotation.current.pitch -= deltaY * sensitivity;

      // Lock vertical viewing range
      cameraRotation.current.pitch = Math.max(-1.45, Math.min(1.45, cameraRotation.current.pitch));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUpOrLeave = () => {
      isMouseDown.current = false;
    };

    // Mount events to container element
    const container = mountRef.current;
    if (container) {
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUpOrLeave);
    }

    // Touch support for dragging look
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      isMouseDown.current = true;
      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMouseDown.current || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

      const sensitivity = 0.005;
      cameraRotation.current.yaw -= deltaX * sensitivity;
      cameraRotation.current.pitch -= deltaY * sensitivity;
      cameraRotation.current.pitch = Math.max(-1.4, Math.min(1.4, cameraRotation.current.pitch));

      previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    if (container) {
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: true });
      container.addEventListener("touchend", handleMouseUpOrLeave, { passive: true });
    }

    // --- 7. SIMULATION TIME LOOP ---
    const clock = new THREE.Clock();
    let animRequestID: number;

    const animate = () => {
      animRequestID = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1); // clamp delta
      const elapsed = clock.getElapsedTime();

      const currentSettings = settingsRef.current;
      const currentMultiplier = speedMultiplierRef.current;
      const isFP = isFirstPersonRef.current;

      // --- A. ATMOSPHERE & ENVIRONMENT ADAPTABILITY ---
      // Map 'sunTime' (range 5 to 23) into sky colors and lighting
      const sunTime = currentSettings.sunTime;
      
      // Calculate sun angles
      // Sun rotates across sky plane (Z, Y). Sunset and Sunrise at Y level ~0
      const sunRad = ((sunTime - 6) / 12) * Math.PI; // 0 to PI
      const sunY = Math.sin(sunRad); // 0 up to 1 which is noon, then down to 0 at twilight
      const sunZ = Math.cos(sunRad); // south-east arc movement
      const sunX = 0.25; // slight tilt

      // Update actual light vectors
      const lightDistance = 250;
      dirLight.position.set(sunX * lightDistance, sunY * lightDistance, sunZ * lightDistance);
      sunSphereVisual.position.set(sunX * 380, sunY * 380, sunZ * 380);

      // Interpolate colors based on time of day
      let skyColorTop = new THREE.Color(0x0e111a); // default night
      let skyColorBottom = new THREE.Color(0x0a0c10);
      let fogColor = new THREE.Color(0x050608);
      let dirLightColor = new THREE.Color(0xffffff);
      let sunIntensity = 1.0;
      let ambIntensity = 0.15;

      // 6 to 7: Sunrise
      if (sunTime >= 6.0 && sunTime < 8.0) {
        const t = (sunTime - 6.0) / 2.0;
        skyColorTop.lerpColors(new THREE.Color(0x1a121e), new THREE.Color(0x739bbd), t);
        skyColorBottom.lerpColors(new THREE.Color(0xd26848), new THREE.Color(0xe9b794), t); // glowing orange base
        fogColor.lerpColors(new THREE.Color(0x613632), new THREE.Color(0xc0b0aa), t);
        dirLightColor.setHex(0xf9ba85); // golden beam
        sunIntensity = 0.35 + t * 0.75;
        ambIntensity = 0.1 + t * 0.25;
      }
      // 8 to 16: Daytime
      else if (sunTime >= 8.0 && sunTime < 16.0) {
        const t = sunTime <= 12.0 ? (sunTime - 8.0) / 4.0 : 1.0 - (sunTime - 12.0) / 4.0;
        skyColorTop.lerpColors(new THREE.Color(0x739bbd), new THREE.Color(0x1e6ca3), t);
        skyColorBottom.lerpColors(new THREE.Color(0xe9b794), new THREE.Color(0xdceef7), t);
        fogColor.lerpColors(new THREE.Color(0xc0b0aa), new THREE.Color(0xd3e5ed), t);
        dirLightColor.setHex(0xffffff);
        sunIntensity = 1.1 + t * 0.3;
        ambIntensity = 0.35 + t * 0.15;
      }
      // 16 to 18.5: Sunset
      else if (sunTime >= 16.0 && sunTime < 19.0) {
        const t = (sunTime - 16.0) / 3.0;
        skyColorTop.lerpColors(new THREE.Color(0x6a87aa), new THREE.Color(0x1b182e), t);
        skyColorBottom.lerpColors(new THREE.Color(0xd9dfef), new THREE.Color(0xe05638), t); // burning sunset
        fogColor.lerpColors(new THREE.Color(0xccdae0), new THREE.Color(0x431b2e), t);
        dirLightColor.lerpColors(new THREE.Color(0xffebcd), new THREE.Color(0xff4500), t);
        sunIntensity = 1.2 - t * 0.8;
        ambIntensity = 0.4 - t * 0.25;
      }
      // 19 to 23, and 5 to 6: Twilight / Night
      else {
        skyColorTop.setHex(0x060812);
        skyColorBottom.setHex(0x030406);
        fogColor.setHex(0x020305);
        dirLightColor.setHex(0x35405c); // moonlight blue
        sunIntensity = 0.12;
        ambIntensity = 0.08;
      }

      // Mix in Dust Factor
      const dustRatio = currentSettings.dustHaze / 100;
      if (dustRatio > 0.05) {
        // Blends sky bottom and fog with a dusty, thick tan-orange color
        const dustHue = new THREE.Color(0xb68b55);
        skyColorBottom.lerp(dustHue, dustRatio * 0.72);
        fogColor.lerp(dustHue, dustRatio * 0.85);
        dirLightColor.lerp(new THREE.Color(0x9d7744), dustRatio * 0.5);
        sunIntensity *= (1.0 - dustRatio * 0.4);
      }

      // Update sky material colors
      const vertexColors = skyGeom.attributes.color;
      if (!vertexColors) {
        const colorsArr = new Float32Array(skyGeom.attributes.position.count * 3);
        skyGeom.setAttribute("color", new THREE.BufferAttribute(colorsArr, 3));
      }
      
      const skyPositions = skyGeom.attributes.position;
      const skyColors = skyGeom.attributes.color;
      for (let i = 0; i < skyPositions.count; i++) {
        const yCoord = skyPositions.getY(i);
        const ratio = Math.max(0, Math.min(1, (yCoord + 100) / 450)); // normalize y coordinates
        
        // gradient sky
        const vertColor = new THREE.Color();
        vertColor.lerpColors(skyColorBottom, skyColorTop, ratio);
        skyColors.setXYZ(i, vertColor.r, vertColor.g, vertColor.b);
      }
      skyColors.needsUpdate = true;

      // Update lights properties
      dirLight.intensity = sunIntensity;
      dirLight.color.copy(dirLightColor);
      ambientLight.intensity = ambIntensity;

      // Set fog
      const fogDensityExponent = 0.0016 + (currentSettings.fogCover / 100) * 0.024;
      (scene.fog as THREE.FogExp2).density = fogDensityExponent;
      (scene.fog as THREE.FogExp2).color.copy(fogColor);
      renderer.setClearColor(fogColor);

      // --- B. CLOUD COVERS & SCALING ---
      // 1. High level Cirrus Opacity Mapping
      cirrusMaterial.opacity = (currentSettings.cirrusCover / 100) * 0.75;
      
      // 2. Middle level Altocumulus Opacity Mapping
      altocumulusMaterial.opacity = (currentSettings.middleCover / 100) * 0.85;

      // Calculate wind vector components derived from angle settings
      const windAngleRad = (currentSettings.windDirectionAngle * Math.PI) / 180;
      // direction vector the wind is BLOWING TOWARDS
      const windDirX = Math.sin(windAngleRad);
      const windDirZ = Math.cos(windAngleRad);

      // Drift high clouds relative to wind direction and speed
      const driftSpeedFactorVal = currentSettings.windSpeed * currentMultiplier * 0.00015;
      cirrusTexture.offset.x += windDirX * driftSpeedFactorVal;
      cirrusTexture.offset.y += windDirZ * driftSpeedFactorVal;

      altocumulusTexture.offset.x += windDirX * driftSpeedFactorVal * 0.8;
      altocumulusTexture.offset.y += windDirZ * driftSpeedFactorVal * 0.8;

      // 3. Low Level Cumulus drifting and wrapping across coordinates
      const cumulusTargetScale = currentSettings.cumulusCover / 50; // default cover 50% maps to scale 1.0

      cumulusCloudsList.forEach((cloudObj) => {
        // Drift position
        const cumulusSpeed = currentSettings.windSpeed * currentMultiplier * 0.07 * delta;
        cloudObj.group.position.x += windDirX * cumulusSpeed;
        cloudObj.group.position.z += windDirZ * cumulusSpeed;

        // Wrap boundaries around a 450 width range
        const limitX = 250;
        const limitZ = 250;
        if (cloudObj.group.position.x > limitX) cloudObj.group.position.x = -limitX;
        if (cloudObj.group.position.x < -limitX) cloudObj.group.position.x = limitX;
        if (cloudObj.group.position.z > limitZ) cloudObj.group.position.z = -limitZ;
        if (cloudObj.group.position.z < -limitZ) cloudObj.group.position.z = limitZ;

        // Dynamic scale scaling with Cumulus slider instantly
        // Grow and shrink smoothly
        const currentScale = cloudObj.group.scale.x;
        const speedMultiplierVal = 1.8 * delta;
        const nextScale = THREE.MathUtils.lerp(currentScale, cumulusTargetScale, speedMultiplierVal);
        cloudObj.group.scale.set(nextScale, nextScale, nextScale);
        
        // Hide completely if cover is very low
        cloudObj.group.visible = currentSettings.cumulusCover > 2;
      });

      // --- C. WATER VERTEX WAVES PHYSICS (Wind speed dependency) ---
      const wavePosAttribute = oceanGeom.attributes.position;
      const waveAmplitude = 0.15 + (currentSettings.windSpeed / 120) * 0.95; // Waves up to 1.1 meters high under storm!
      const waveFrequency = 0.08 + (currentSettings.windSpeed / 120) * 0.08;
      const waveSpeed = 1.0 + (currentSettings.windSpeed / 120) * 4.0; // Rough water moves much faster!

      for (let i = 0; i < wavePosAttribute.count; i++) {
        const vx = wavePosAttribute.getX(i);
        const vz = wavePosAttribute.getZ(i);

        // Advanced mathematical sinus combination using wind direction alignment
        const mainWave = Math.sin((vx * windDirX + vz * windDirZ) * waveFrequency - elapsed * waveSpeed) * waveAmplitude;
        const secondaryWave = Math.cos((vx * 0.15 - vz * 0.12) - elapsed * (waveSpeed * 1.5)) * (waveAmplitude * 0.35);
        const waterHeight = mainWave + secondaryWave;

        // update position geometry
        wavePosAttribute.setY(i, waterHeight);
      }
      wavePosAttribute.needsUpdate = true;
      oceanGeom.computeVertexNormals();

      // Change sea appearance according to wind intensity
      // Calmer winds => clear light turquoise. Stormy winds => dark gray foam-blue.
      const seaBaseColor = new THREE.Color(0x015c7a);
      const stormySeaColor = new THREE.Color(0x132731);
      const targetSeaColor = new THREE.Color();
      targetSeaColor.lerpColors(seaBaseColor, stormySeaColor, Math.min(1, currentSettings.windSpeed / 90));
      oceanMat.color.copy(targetSeaColor);
      oceanMat.roughness = 0.12 + (currentSettings.windSpeed / 120) * 0.28;

      // --- D. FLAG WAVE PHYSICS & ROTATION ---
      const flagPosAttr = flagGeo.attributes.position;
      // Flag waves faster and harder based on speed
      const flagAmp = 0.08 + (currentSettings.windSpeed / 120) * 0.72;
      const flagFreq = 1.2 + (currentSettings.windSpeed / 120) * 2.8;

      // Point flag exactly AWAY from the direction wind is blowing
      // Wind vector has angle. Let's orient the flagpole flag pivot
      // Flag starts along local +X axis. We rotate around Y axis to blow in wind
      const flagRotationAngle = Math.atan2(windDirX, windDirZ) - Math.PI / 2;
      flagMesh.rotation.y = flagRotationAngle;

      // Hanging down if no wind
      if (currentSettings.windSpeed <= 3) {
        flagMesh.rotation.z = -Math.PI / 3; // droops down
        for (let i = 0; i < flagPosAttr.count; i++) {
          flagPosAttr.setZ(i, 0);
        }
      } else {
        flagMesh.rotation.z = THREE.MathUtils.lerp(flagMesh.rotation.z, 0, 0.08); // stands horizontal
        for (let i = 0; i < flagPosAttr.count; i++) {
          const fx = flagPosAttr.getX(i); // distance along flag sheet: 0 (tethered) to 8 (free edge)
          const fRatio = fx / 8.0; // 0.0 to 1.0

          // wave equation that ripples towards the right tip and is tethered (amplitude=0) at the pole (left)
          const zDisp = Math.sin(fx * 0.85 - elapsed * (flagFreq * 7.5)) * flagAmp * fRatio;
          const yDisp = Math.cos(fx * 0.4 - elapsed * (flagFreq * 4.5)) * flagAmp * 0.25 * fRatio;
          
          flagPosAttr.setZ(i, zDisp);
          flagPosAttr.setY(i, (flagGeo.parameters.height / 2) * (1 - 2 * (i % 9 / 8)) + yDisp); // restore local y heights + wobble
        }
      }
      flagPosAttr.needsUpdate = true;

      // --- E. TREES BENDING & RUSTLING IN THE WIND ---
      const windForceRatio = currentSettings.windSpeed / 120; // 0.0 to 1.0
      const maxBendAngle = windForceRatio * 0.24; // Bends up to 14 degrees under heavy storms

      treesList.forEach((tree) => {
        // Bending vector away from wind directions
        const treeBendX = windDirX * maxBendAngle;
        const treeBendZ = windDirZ * maxBendAngle;

        // Apply gentle high-frequency sway oscillations (rustling leaf noise)
        const rustleSpeed = 5.0 + windForceRatio * 15.0;
        const rustleAmp = 0.02 + windForceRatio * 0.055;
        const rustleOsc = Math.sin(elapsed * rustleSpeed + tree.phaseOffset) * rustleAmp;

        // Sway foliage group smoothly
        tree.leavesGroup.rotation.z = THREE.MathUtils.lerp(tree.leavesGroup.rotation.z, -treeBendX + rustleOsc, 0.06);
        tree.leavesGroup.rotation.x = THREE.MathUtils.lerp(tree.leavesGroup.rotation.x, treeBendZ + rustleOsc, 0.06);

        // Bend trunk slightly
        tree.trunkMesh.rotation.z = THREE.MathUtils.lerp(tree.trunkMesh.rotation.z, -treeBendX * 0.5, 0.06);
        tree.trunkMesh.rotation.x = THREE.MathUtils.lerp(tree.trunkMesh.rotation.x, treeBendZ * 0.5, 0.06);
      });

      // --- F. DUST PARTICLES MOVEMENT (Haze) ---
      const dustAttr = dustGeo.attributes.position;
      const activeDustDensity = currentSettings.dustHaze / 100;
      dustParticles.visible = activeDustDensity > 0.02;
      
      if (dustParticles.visible) {
        dustMat.opacity = activeDustDensity * 0.75;
        const dustDriftSpeed = currentSettings.windSpeed * currentMultiplier * 0.04 * delta;

        for (let d = 0; d < dustCount; d++) {
          // Drift along wind directions
          let px = dustAttr.getX(d) + windDirX * dustDriftSpeed;
          let pz = dustAttr.getZ(d) + windDirZ * dustDriftSpeed;
          let py = dustAttr.getY(d) + (Math.sin(elapsed + d) * 0.02); // slight vertical float

          // Wrap boundaries around camera views
          const wrapDist = 75;
          const relativeX = px - camera.position.x;
          const relativeZ = pz - camera.position.z;

          if (relativeX > wrapDist) px = camera.position.x - wrapDist;
          if (relativeX < -wrapDist) px = camera.position.x + wrapDist;
          if (relativeZ > wrapDist) pz = camera.position.z - wrapDist;
          if (relativeZ < -wrapDist) pz = camera.position.z + wrapDist;

          dustAttr.setXYZ(d, px, py, pz);
        }
        dustAttr.needsUpdate = true;
      }

      // --- 8. FIRST-PERSON & FREE CAMERA NAVIGATION & CONTROLS ---
      const moveSpeedBase = isFP ? 14.0 : 35.0; // fly faster, walk at human speeds
      
      // Calculate underwater resistance
      const isSubmerged = cameraPosition.current.y <= 1.95;
      if (isSubmerged !== showSubmergedUI) {
        setShowSubmergedUI(isSubmerged);
      }
      
      const speedModifierValue = isSubmerged ? 0.38 : 1.0; // drag resistance under water
      const moveSpeed = moveSpeedBase * speedModifierValue * delta;

      // Construct forward and right movement vectors based on yaw (looking angle)
      // yaw is horizontal. pitch is vertical look angle
      const forwardVec = new THREE.Vector3(
        Math.cos(cameraRotation.current.yaw),
        0,
        Math.sin(cameraRotation.current.yaw)
      ).normalize();

      const rightVec = new THREE.Vector3(
        Math.cos(cameraRotation.current.yaw + Math.PI / 2),
        0,
        Math.sin(cameraRotation.current.yaw + Math.PI / 2)
      ).normalize();

      // Gather input vectors from keys or virtual controllers
      const isMoveForward = keysPressed.current["w"] || keysPressed.current["arrowup"] || virtualControls.current.forward;
      const isMoveBackward = keysPressed.current["s"] || keysPressed.current["arrowdown"] || virtualControls.current.backward;
      const isMoveLeft = keysPressed.current["a"] || keysPressed.current["arrowleft"] || virtualControls.current.left;
      const isMoveRight = keysPressed.current["d"] || keysPressed.current["arrowright"] || virtualControls.current.right;
      const isMoveUp = keysPressed.current[" "] || virtualControls.current.up;
      const isMoveDown = keysPressed.current["shift"] || virtualControls.current.down;

      const movementVector = new THREE.Vector3(0, 0, 0);

      if (isMoveForward) movementVector.addScaledVector(forwardVec, 1);
      if (isMoveBackward) movementVector.addScaledVector(forwardVec, -1);
      if (isMoveLeft) movementVector.addScaledVector(rightVec, -1);
      if (isMoveRight) movementVector.addScaledVector(rightVec, 1);

      if (!isFP) {
        // Free flying mode supports Y shifting
        if (isMoveUp) movementVector.y += 1;
        if (isMoveDown) movementVector.y -= 1;
      }

      // Apply movement to position ref
      if (movementVector.lengthSq() > 0) {
        movementVector.normalize();
        cameraPosition.current.addScaledVector(movementVector, moveSpeed);
      }

      // Apply boundaries to prevent wander-off
      const blockRegion = 280;
      cameraPosition.current.x = Math.max(-blockRegion, Math.min(blockRegion, cameraPosition.current.x));
      cameraPosition.current.z = Math.max(-blockRegion, Math.min(blockRegion, cameraPosition.current.z));

      // Resolve Gravity & Height clamping
      if (isFP) {
        // Walk mode locks camera Y coordinates exactly to Sandy terrain height + Human Eye Level
        const sandHeight = getTerrainHeight(cameraPosition.current.x, cameraPosition.current.z);
        const playerEyeHeight = 2.2;
        
        // Under water we let you submerge down to seabed, but walk on sand if higher
        if (sandHeight > 1.8) {
          // Walking on beach dry sand
          cameraPosition.current.y = sandHeight + playerEyeHeight;
        } else {
          // In deep water walk on sand or float
          const deepWaterEyeLevel = sandHeight + playerEyeHeight;
          if (cameraPosition.current.y < deepWaterEyeLevel) {
            cameraPosition.current.y = deepWaterEyeLevel;
          }
        }
      } else {
        // Flying mode prevents diving beneath the subterranean floor
        const sandHeight = getTerrainHeight(cameraPosition.current.x, cameraPosition.current.z);
        if (cameraPosition.current.y < sandHeight + 1.2) {
          cameraPosition.current.y = sandHeight + 1.2;
        }
        // Prevents floating away to orbit
        cameraPosition.current.y = Math.min(180, cameraPosition.current.y);
      }

      // Update actual Three.js Camera position
      camera.position.copy(cameraPosition.current);

      // Compute camera view target based on yaw and pitch angles
      const targetLookX = camera.position.x + Math.cos(cameraRotation.current.yaw) * Math.cos(cameraRotation.current.pitch);
      const targetLookY = camera.position.y + Math.sin(cameraRotation.current.pitch);
      const targetLookZ = camera.position.z + Math.sin(cameraRotation.current.yaw) * Math.cos(cameraRotation.current.pitch);
      camera.lookAt(targetLookX, targetLookY, targetLookZ);

      // Export coordinates to React layout HUD periodically
      setFpsCoordinates({
        x: Math.round(cameraPosition.current.x),
        y: Math.round(cameraPosition.current.y * 10) / 10,
        z: Math.round(cameraPosition.current.z),
      });

      // Render the scene!
      renderer.render(scene, camera);
    };
    
    animate();

    // --- 9. RESIZE HANDLER ---
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- 10. CLEANUP REMOVALS ---
    return () => {
      cancelAnimationFrame(animRequestID);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mouseup", handleMouseUpOrLeave);
      window.removeEventListener("resize", handleResize);
      
      if (container) {
        container.removeEventListener("mousedown", handleMouseDown);
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleMouseUpOrLeave);
        container.removeChild(renderer.domElement);
      }

      // Dispose Three assets
      skyGeom.dispose();
      skyMat.dispose();
      groundGeom.dispose();
      sandMat.dispose();
      oceanGeom.dispose();
      oceanMat.dispose();
      seabedGeom.dispose();
      seabedMat.dispose();
      cirrusPlaneGeom.dispose();
      cirrusMaterial.dispose();
      cirrusTexture.dispose();
      altoPlaneGeom.dispose();
      altocumulusMaterial.dispose();
      altocumulusTexture.dispose();
      cloudMeshGeoGroup.dispose();
      cloudMat.dispose();
      poleGeo.dispose();
      poleMat.dispose();
      flagGeo.dispose();
      flagMat.dispose();
      flagTexture.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sunVisGeo.dispose();
      sunVisMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three Display Canvas Mount Point */}
      <div 
        ref={mountRef} 
        id="three-weather-stage"
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Underwater Tint Overlay */}
      {showSubmergedUI && (
        <div className="absolute inset-0 bg-teal-950/45 border-8 border-teal-500/20 backdrop-blur-[1px] pointer-events-none flex flex-col items-center justify-center animate-pulse">
          <div className="bg-slate-900/80 px-4 py-2 rounded-xl text-center text-xs text-teal-300 font-semibold flex items-center gap-2 border border-teal-500/30">
            <Waves size={14} className="animate-bounce" />
            <span>شنا در دریا (Submerged Under Water - Swim Mode)</span>
          </div>
        </div>
      )}

      {/* Floating Coordinate HUD */}
      <div className="absolute bottom-4 left-4 z-40 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-[10px] text-slate-400 flex flex-col gap-1 items-start text-left font-mono pointer-events-none">
        <div className="flex gap-2 items-center text-teal-400 font-bold mb-0.5">
          <MapPin size={10} />
          <span>موقعیت مکانی شبیه‌ساز</span>
        </div>
        <div>X Position: {fpsCoordinates.x} m</div>
        <div>Y Altitude: {fpsCoordinates.y} m {(fpsCoordinates.y < 2.0 && isFirstPerson) ? "(شناور)" : ""}</div>
        <div>Z Position: {fpsCoordinates.z} m</div>
        <div className="text-[9px] text-slate-500 mt-1">
          {isFirstPerson ? "🚶 زاویه: با کشیدن ماوس تغییر دهید" : "🛸 زاویه آزاد پروازی"}
        </div>
      </div>

      {/* Integrated Iframe Virtual Gamepad Controller (Highly useful if keys unfocused!) */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-center gap-2 pointer-events-auto bg-slate-950/75 p-3 rounded-2xl border border-white/10 shadow-2xl">
        <span className="text-[9px] text-slate-400 font-sans tracking-wide">🕹️ کنترل حرکت در این فریم</span>
        
        <div className="flex flex-col items-center gap-1.5">
          {/* Forward */}
          <button
            onTouchStart={() => { virtualControls.current.forward = true; }}
            onTouchEnd={() => { virtualControls.current.forward = false; }}
            onMouseDown={() => { virtualControls.current.forward = true; }}
            onMouseUp={() => { virtualControls.current.forward = false; }}
            onMouseLeave={() => { virtualControls.current.forward = false; }}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center transition-all border border-white/10 active:scale-90 cursor-pointer text-xs"
            title="جلو"
          >
            ▲
          </button>
          
          <div className="flex gap-1.5">
            {/* Left */}
            <button
              onTouchStart={() => { virtualControls.current.left = true; }}
              onTouchEnd={() => { virtualControls.current.left = false; }}
              onMouseDown={() => { virtualControls.current.left = true; }}
              onMouseUp={() => { virtualControls.current.left = false; }}
              onMouseLeave={() => { virtualControls.current.left = false; }}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center transition-all border border-white/10 active:scale-90 cursor-pointer text-xs"
              title="چپ"
            >
              ◀
            </button>
            
            {/* Backward */}
            <button
              onTouchStart={() => { virtualControls.current.backward = true; }}
              onTouchEnd={() => { virtualControls.current.backward = false; }}
              onMouseDown={() => { virtualControls.current.backward = true; }}
              onMouseUp={() => { virtualControls.current.backward = false; }}
              onMouseLeave={() => { virtualControls.current.backward = false; }}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center transition-all border border-white/10 active:scale-90 cursor-pointer text-xs"
              title="عقب"
            >
              ▼
            </button>
            
            {/* Right */}
            <button
              onTouchStart={() => { virtualControls.current.right = true; }}
              onTouchEnd={() => { virtualControls.current.right = false; }}
              onMouseDown={() => { virtualControls.current.right = true; }}
              onMouseUp={() => { virtualControls.current.right = false; }}
              onMouseLeave={() => { virtualControls.current.right = false; }}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center transition-all border border-white/10 active:scale-90 cursor-pointer text-xs"
              title="راست"
            >
              ▶
            </button>
          </div>

          {/* Up and Down controls for free flying */}
          {!isFirstPerson && (
            <div className="flex gap-1 border-t border-white/5 pt-1.5 w-full justify-between mt-1">
              <button
                onTouchStart={() => { virtualControls.current.down = true; }}
                onTouchEnd={() => { virtualControls.current.down = false; }}
                onMouseDown={() => { virtualControls.current.down = true; }}
                onMouseUp={() => { virtualControls.current.down = false; }}
                onMouseLeave={() => { virtualControls.current.down = false; }}
                className="flex-1 py-1 px-1 bg-red-950/80 text-[9px] hover:bg-red-900/80 text-red-300 font-bold rounded border border-red-500/20 active:scale-90 cursor-pointer"
                title="پایین"
              >
                پایین (Shift)
              </button>
              <button
                onTouchStart={() => { virtualControls.current.up = true; }}
                onTouchEnd={() => { virtualControls.current.up = false; }}
                onMouseDown={() => { virtualControls.current.up = true; }}
                onMouseUp={() => { virtualControls.current.up = false; }}
                onMouseLeave={() => { virtualControls.current.up = false; }}
                className="flex-1 py-1 px-1 bg-emerald-950/80 text-[9px] hover:bg-emerald-900/80 text-emerald-300 font-bold rounded border border-emerald-500/20 active:scale-90 cursor-pointer"
                title="بالا"
              >
                بالا (Space)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
