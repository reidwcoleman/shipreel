import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import * as THREE from "three";

/**
 * Same hero shot in react-three-fiber via @remotion/three (needs three + @react-three/fiber, and
 * chromiumOptions.gl = "angle" when rendering). Real lighting/bevels, but the screen becomes a
 * texture: text in it is resampled (softer than the CSS version) and live DOM (captions, chat
 * bubbles) cannot go on the screen without first drawing it to a canvas.
 */
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry UVs are raw shape coordinates; remap them to 0..1 so the screenshot fills the screen. */
function normalizeUVs(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x);
    uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

const PhoneMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const handle = delayRender("Loading screen texture");
    new THREE.TextureLoader().load(
      staticFile("screenshot.png"),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTexture(t);
        continueRender(handle);
      },
      undefined,
      (e) => cancelRender(e),
    );
  }, [delayRender, continueRender, cancelRender]);

  const body = useMemo(
    () => new THREE.ExtrudeGeometry(roundedRect(1, 2.165, 0.16), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 6, curveSegments: 24 }),
    [],
  );
  const screen = useMemo(() => normalizeUVs(new THREE.ShapeGeometry(roundedRect(0.93, 2.095, 0.13), 24)), []);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const rotY = interpolate(enter, [0, 1], [-1.1, -0.32]);
  const rotX = interpolate(enter, [0, 1], [0.4, 0.16]);
  return (
    <group rotation={[rotX, rotY, -0.05]}>
      <mesh geometry={body} position={[0, 0, -0.08]}>
        <meshStandardMaterial color="#202024" metalness={0.65} roughness={0.32} />
      </mesh>
      {texture ? (
        <mesh geometry={screen} position={[0, 0, 0.012]}>
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

export const ThreePhoneShot: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #1d1b3a, #0c0c14)" }}>
      <ThreeCanvas width={width} height={height} linear camera={{ fov: 30, position: [0, 0, 7.2] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[-3, 4, 5]} intensity={2.2} />
        <directionalLight position={[4, -2, 2]} intensity={0.6} color="#9db4ff" />
        <PhoneMesh />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
