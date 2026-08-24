import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
    constructor(canvasId) {
        this.canvas = document.querySelector(canvasId);
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015); // sleek slate-900

        const fov = window.innerWidth < 900 ? 75 : 45;
        this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 30);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = window.innerWidth < 900 ? 2.0 : 1.2;
        this.controls.panSpeed = window.innerWidth < 900 ? 1.8 : 1.2;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 60;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

        // Professional Soft Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Bright even light
        this.scene.add(ambientLight);

        // Soft overhead directional light instead of harsh spotlight
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 30, 20);
        this.scene.add(dirLight);

        this.accentLight = new THREE.PointLight(0x3b82f6, 40, 50);
        this.accentLight.position.set(0, -5, 0);
        this.scene.add(this.accentLight);

        // Environment
        this.gridHelper = new THREE.GridHelper(60, 60, 0x3b82f6, 0x1a1a2e);
        this.gridHelper.position.y = -3;
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.2;
        this.scene.add(this.gridHelper);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.fov = window.innerWidth < 900 ? 75 : 45;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setTheme(colorHex) {
        this.accentLight.color.setHex(colorHex);
        this.gridHelper.material.color.setHex(colorHex);
    }

    update() {
        this.controls.update();
        this.camera.updateMatrixWorld();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
