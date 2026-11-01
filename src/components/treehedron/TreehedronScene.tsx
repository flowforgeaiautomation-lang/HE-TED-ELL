import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";

function TreehedronGeometry() {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { viewport } = useThree();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.z += delta * 0.04;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.3;
      innerRef.current.rotation.x += delta * 0.15;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * 0.08;
      outerRef.current.rotation.x -= delta * 0.03;
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  const outerGeo = useMemo(() => new THREE.IcosahedronGeometry(2.2, 1), []);
  const innerGeo = useMemo(() => new THREE.OctahedronGeometry(1.1, 0), []);
  const coreGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 0), []);

  const edgesGeo = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(3.5, 0);
    return new THREE.EdgesGeometry(geo);
  }, []);

  return (
    <group ref={groupRef} scale={viewport.width < 5 ? 0.7 : 1}>
      {/* Outer wireframe icosahedron */}
      <mesh ref={outerRef} geometry={outerGeo}>
        <meshStandardMaterial
          color="#1a6b4e"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Inner octahedron */}
      <mesh ref={innerRef} geometry={innerGeo}>
        <meshStandardMaterial
          color="#2d8f6f"
          metalness={0.8}
          roughness={0.15}
          transparent
          opacity={0.7}
          flatShading
        />
      </mesh>

      {/* Glowing core */}
      <mesh geometry={coreGeo}>
        <meshStandardMaterial
          color="#5fffc7"
          emissive="#1a6b4e"
          emissiveIntensity={1.5}
          metalness={1}
          roughness={0}
        />
      </mesh>

      {/* Outer edge lines */}
      <lineSegments ref={linesRef} geometry={edgesGeo}>
        <lineBasicMaterial color="#2d8f6f" transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.03;
      pointsRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#5fffc7"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export function TreehedronScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#5fffc7" />
        <pointLight position={[-5, -3, 2]} intensity={0.4} color="#1a6b4e" />
        <TreehedronGeometry />
        <ParticleField />
      </Suspense>
    </Canvas>
  );
}
