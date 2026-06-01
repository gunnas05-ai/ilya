import { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

const FACE_IMG = require('../../assets/heykaptan.png');

type AvatarState = 'idle' | 'greeting' | 'listening' | 'talking' | 'thinking' | 'success' | 'error';

// ── 3D Head with photo texture ─────────────────
function AvatarHead({ state, onReady }: { state: AvatarState; onReady?: () => void }) {
  const headRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  // Load face texture
  const faceTexture = useLoader(TextureLoader, FACE_IMG);
  faceTexture.colorSpace = THREE.SRGBColorSpace;

  useEffect(() => { onReady?.(); }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (!headRef.current) return;

    // Breathing
    const breathe = 1 + Math.sin(time.current * 0.8) * 0.008;
    headRef.current.scale.setScalar(breathe);
    if (bodyRef.current) bodyRef.current.scale.setScalar(breathe);

    // Head tilt when listening
    if (state === 'listening') {
      headRef.current.rotation.z = Math.sin(time.current * 1.2) * 0.06;
    } else if (state === 'idle') {
      headRef.current.rotation.z = Math.sin(time.current * 0.4) * 0.015;
    } else {
      headRef.current.rotation.z *= 0.95; // smooth return
    }

    // Lip sync when talking
    if (state === 'talking' && mouthRef.current) {
      const mouthOpen = 0.5 + Math.abs(Math.sin(time.current * 8 + Math.sin(time.current * 13) * 0.5)) * 0.5;
      mouthRef.current.scale.y = 0.3 + mouthOpen * 1.2;
    } else if (mouthRef.current) {
      mouthRef.current.scale.y += (0.5 - mouthRef.current.scale.y) * 0.1;
    }

    // Eye blink
    if (leftEyeRef.current) {
      const blinkCycle = (time.current * 1000) % 4000;
      const blinkScale = blinkCycle < 80 ? 0.1 : blinkCycle < 160 ? (blinkCycle - 80) / 80 : 1;
      leftEyeRef.current.scale.y = blinkScale;
      rightEyeRef.current?.scale.set(1, blinkScale, 1);
    }

    // Subtle head turn — feels alive
    headRef.current.rotation.y = Math.sin(time.current * 0.3) * 0.05;

    // Hand gestures when talking
    if (state === 'talking' || state === 'greeting') {
      if (leftArmRef.current) leftArmRef.current.rotation.z = Math.sin(time.current * 2.5) * 0.15 - 0.1;
      if (rightArmRef.current) rightArmRef.current.rotation.z = Math.sin(time.current * 2.5 + 1) * 0.15 - 0.1;
    } else if (leftArmRef.current) {
      leftArmRef.current.rotation.z += (0.2 - leftArmRef.current.rotation.z) * 0.05;
      rightArmRef.current.rotation.z += (-0.2 - rightArmRef.current.rotation.z) * 0.05;
    }

    // Thinking: one hand near chin
    if (state === 'thinking' && rightArmRef.current) {
      rightArmRef.current.rotation.z += (-0.8 - rightArmRef.current.rotation.z) * 0.1;
    }
  });

  return (
    <group ref={bodyRef}>
      {/* ── Neck ── */}
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#E8C4A8" roughness={0.7} />
      </mesh>

      {/* ── Shoulders / Upper body ── */}
      <mesh position={[0, -1.8, 0]}>
        <capsuleGeometry args={[0.5, 1.2, 8, 16]} />
        <meshStandardMaterial color="#0F2645" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── Left arm ── */}
      <group ref={leftArmRef} position={[-0.55, -1.4, 0]}>
        <mesh rotation={[0, 0, 0.3]}>
          <capsuleGeometry args={[0.11, 0.85, 8, 8]} />
          <meshStandardMaterial color="#0F2645" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Hand */}
        <mesh position={[-0.05, -0.52, 0.02]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#F2CBB0" roughness={0.5} />
        </mesh>
      </group>
      {/* ── Right arm ── */}
      <group ref={rightArmRef} position={[0.55, -1.4, 0]}>
        <mesh rotation={[0, 0, -0.3]}>
          <capsuleGeometry args={[0.11, 0.85, 8, 8]} />
          <meshStandardMaterial color="#0F2645" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Hand */}
        <mesh position={[0.05, -0.52, 0.02]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#F2CBB0" roughness={0.5} />
        </mesh>
      </group>

      {/* ── Collar ── */}
      <mesh position={[0, -1.25, 0.38]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.35, 0.04, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
      </mesh>

      {/* ── Head ── */}
      <mesh ref={headRef} position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial map={faceTexture} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* ── Hair cap (dark) ── */}
      <mesh position={[0, 0.45, -0.05]}>
        <sphereGeometry args={[0.57, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#1A0D03" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, -0.15]}>
        <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
        <meshStandardMaterial color="#1A0D03" roughness={0.6} />
      </mesh>

      {/* ── Hair sides ── */}
      <mesh position={[-0.5, 0.15, 0]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.15, 0.8, 0.1]} />
        <meshStandardMaterial color="#1A0D03" roughness={0.6} />
      </mesh>
      <mesh position={[0.5, 0.15, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.15, 0.8, 0.1]} />
        <meshStandardMaterial color="#1A0D03" roughness={0.6} />
      </mesh>

      {/* ── Eyes ── */}
      <mesh ref={leftEyeRef} position={[-0.16, 0.15, 0.48]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.16, 0.15, 0.48]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.16, 0.14, 0.53]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#000000" roughness={0.05} />
      </mesh>
      <mesh position={[0.16, 0.14, 0.53]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#000000" roughness={0.05} />
      </mesh>

      {/* ── Mouth ── */}
      <mesh ref={mouthRef} position={[0, -0.12, 0.5]}>
        <planeGeometry args={[0.15, 0.04]} />
        <meshStandardMaterial color="#D4786A" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ── KAPTAN Badge ── */}
      <mesh position={[0.15, -1.55, 0.45]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshStandardMaterial color="#FF6B00" roughness={0.2} metalness={0.3} />
      </mesh>

      {/* ── State indicator ring ── */}
      {state === 'listening' && (
        <mesh position={[0, -0.3, 0.5]}>
          <torusGeometry args={[0.15, 0.02, 8, 16]} />
          <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.8} roughness={0.2} />
        </mesh>
      )}
      {state === 'thinking' && (
        <mesh position={[0, -0.3, 0.5]}>
          <torusGeometry args={[0.15, 0.02, 8, 16]} />
          <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

// ── Scene camera rig ────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.1, 2.2);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// ── Lighting ────────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.5} color="#FFF5EE" />
      <directionalLight position={[2, 3, 3]} intensity={1.2} color="#FFFFFF" />
      <directionalLight position={[-1, 1, 1]} intensity={0.4} color="#FFEEDD" />
      <pointLight position={[0, 1, 1.5]} intensity={0.3} color="#FF6B0020" />
    </>
  );
}

// ── Main Component ──────────────────────────────
interface Props {
  state: AvatarState;
  height?: number;
}

export default function Avatar3D({ state, height = 350 }: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    // Fallback: 2D image
    return (
      <View style={[styles.container, { height, alignItems: 'center', justifyContent: 'center' }]}>
        <Image source={FACE_IMG} style={{ width: height * 0.5, height: height * 0.5, borderRadius: height * 0.25 }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      )}
      <Canvas
        camera={{ position: [0, 0.1, 2.2], fov: 40 }}
        style={styles.canvas}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => setReady(true)}
        onError={() => setError(true)}
      >
        <CameraRig />
        <SceneLighting />
        <AvatarHead state={state} onReady={() => setReady(true)} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: 'transparent', overflow: 'hidden', borderRadius: 20 },
  canvas: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0D1420' },
});
