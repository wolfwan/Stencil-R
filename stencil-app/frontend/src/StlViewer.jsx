import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Renders an STL (as ArrayBuffer) with an orbit-controlled three.js preview. */
export default function StlViewer({ stlArrayBuffer }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null); // holds camera/controls/mesh/material/initialView for the toolbar

  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    if (!stlArrayBuffer || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(1, 1, 1);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1, -0.5, -1);
    scene.add(fillLight);

    const geometry = new STLLoader().parse(stlArrayBuffer);
    geometry.computeVertexNormals();
    geometry.center();

    const material = new THREE.MeshStandardMaterial({ color: 0x5b9bd5, metalness: 0.1, roughness: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // STL Z-up -> three.js Y-up
    scene.add(mesh);

    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius || 50;
    const initialPosition = new THREE.Vector3(radius * 1.8, radius * 1.4, radius * 1.8);
    camera.position.copy(initialPosition);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 4;

    sceneRef.current = { camera, controls, material, initialPosition, radius };

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [stlArrayBuffer]);

  // Keep the live scene's wireframe/auto-rotate flags synced to the toolbar state.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.material.wireframe = wireframe;
  }, [wireframe, stlArrayBuffer]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.controls.autoRotate = autoRotate;
  }, [autoRotate, stlArrayBuffer]);

  const resetView = () => {
    const live = sceneRef.current;
    if (!live) return;
    live.camera.position.copy(live.initialPosition);
    live.controls.target.set(0, 0, 0);
    live.camera.updateProjectionMatrix();
  };

  const zoomBy = (factor) => {
    const live = sceneRef.current;
    if (!live) return;
    const { camera, controls } = live;
    const toTarget = camera.position.clone().sub(controls.target);
    toTarget.multiplyScalar(factor);
    camera.position.copy(controls.target).add(toTarget);
  };

  return (
    <div className="stl-viewer-wrap">
      <div ref={containerRef} className="stl-viewer" />
      <div className="viewer-toolbar">
        <button type="button" onClick={() => zoomBy(0.8)} title="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1.25)} title="Zoom out">
          −
        </button>
        <button type="button" onClick={resetView}>
          Reset view
        </button>
        <button type="button" className={wireframe ? "active" : ""} onClick={() => setWireframe((w) => !w)}>
          Wireframe
        </button>
        <button type="button" className={autoRotate ? "active" : ""} onClick={() => setAutoRotate((r) => !r)}>
          Auto-rotate
        </button>
      </div>
      <p className="viewer-hint">Drag to rotate · Scroll to zoom · Right-click drag (or two-finger drag) to pan</p>
    </div>
  );
}
