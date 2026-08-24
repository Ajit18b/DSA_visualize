import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

// --- Scene Setup ---
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x09090b, 0.015);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 30);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 80);
spotLight.position.set(10, 30, 10);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.5;
spotLight.castShadow = true;
scene.add(spotLight);

const accentLight = new THREE.PointLight(0x3b82f6, 50, 40);
accentLight.position.set(0, -5, 0);
scene.add(accentLight);

// --- Environment ---
const gridHelper = new THREE.GridHelper(60, 60, 0x3b82f6, 0x1a1a2e);
gridHelper.position.y = -3;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.2;
scene.add(gridHelper);

// --- State Management ---
let currentTopic = 'array'; // 'array' | 'linkedlist'
let isAnimating = false;

// --- Utilities ---
function logAction(msg) {
    document.getElementById('log-text').innerText = msg;
}

function toggleButtons(disabled) {
    isAnimating = disabled;
    document.querySelectorAll('.controls-panel button').forEach(btn => btn.disabled = disabled);
}

// Map 3D positions to 2D HTML overlays
function renderLabels(items) {
    items.forEach((item, index) => {
        if (!item.htmlEl) return;
        
        // Update index label depending on topic
        const idxLabel = item.htmlEl.querySelector('.dsa-idx');
        if (idxLabel) {
            if (currentTopic === 'array') {
                idxLabel.innerText = `[${index}]`;
            } else if (currentTopic === 'linkedlist') {
                if (index === 0) idxLabel.innerText = `Head`;
                else if (index === items.length - 1) idxLabel.innerText = `Tail`;
                else idxLabel.innerText = `Node ${index}`;
            }
        }

        const vector = new THREE.Vector3();
        item.mesh.getWorldPosition(vector);
        vector.project(camera);

        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (vector.y * -.5 + .5) * window.innerHeight;

        item.htmlEl.style.left = `${x}px`;
        item.htmlEl.style.top = `${y}px`;
        item.htmlEl.style.opacity = vector.z > 1 ? 0 : 1;
    });
}

// --- Shared Materials ---
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a, metalness: 0.2, roughness: 0.1, transmission: 0.8,
    thickness: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.1
});

const highlightMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 0.6, metalness: 0.1,
    roughness: 0.1, transmission: 0.4, thickness: 1.0, clearcoat: 1.0
});

const nodeGeometry = new THREE.BoxGeometry(3, 3, 3);
const llNodeGeometry = new THREE.BoxGeometry(2.5, 2.5, 2.5); // Slightly smaller for LL

// ==========================================
// 1. ARRAY MANAGER
// ==========================================
const ArrayManager = {
    data: [],
    spacing: 4.5,
    maxElements: 10,

    init() {
        this.data = [];
        [12, 45, 7, 89, 23].forEach(val => this._createItem(val));
        this.recenter(false);
        logAction(`Array initialized with ${this.data.length} elements.`);
    },

    clear() {
        this.data.forEach(item => {
            scene.remove(item.mesh);
            if(item.htmlEl) item.htmlEl.remove();
        });
        this.data = [];
    },

    _createItem(val) {
        const mesh = new THREE.Mesh(nodeGeometry, glassMaterial.clone());
        mesh.castShadow = true;
        scene.add(mesh);

        const el = document.createElement('div');
        el.className = 'dsa-label';
        el.innerHTML = `<div class="dsa-val">${val}</div><div class="dsa-idx"></div>`;
        document.getElementById('labels-container').appendChild(el);

        this.data.push({ mesh, value: val, htmlEl: el });
        return this.data[this.data.length - 1];
    },

    getStartX() {
        return -((this.data.length - 1) * this.spacing) / 2;
    },

    recenter(animate = true) {
        const startX = this.getStartX();
        const promises = [];
        this.data.forEach((item, i) => {
            const targetX = startX + i * this.spacing;
            if (animate) {
                promises.push(gsap.to(item.mesh.position, { x: targetX, duration: 0.6, ease: "power2.inOut" }));
            } else {
                item.mesh.position.set(targetX, 0, 0);
            }
        });
        return Promise.all(promises);
    },

    async push(val) {
        if (this.data.length >= this.maxElements) { logAction("Overflow"); return; }
        
        const item = this._createItem(val);
        item.mesh.material = highlightMaterial.clone();
        item.mesh.position.set(this.getStartX() + (this.data.length - 1) * this.spacing, 15, 0);
        
        await this.recenter(true);
        await gsap.to(item.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        item.mesh.material = glassMaterial.clone();
        logAction(`Pushed ${val}.`);
    },

    async pop() {
        if (this.data.length === 0) { logAction("Underflow"); return; }
        
        const item = this.data.pop();
        item.mesh.material = highlightMaterial.clone();
        gsap.to(item.mesh.position, { y: 10, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        
        await this.recenter(true);
        logAction(`Popped ${item.value}.`);
    },

    async insert(index, val) {
        if (index < 0 || index > this.data.length || this.data.length >= this.maxElements) return;
        
        const item = this._createItem(val);
        this.data.pop(); // remove from end of array logic
        this.data.splice(index, 0, item); // insert at correct spot
        
        item.mesh.material = highlightMaterial.clone();
        item.mesh.position.set(this.getStartX() + index * this.spacing, 15, 0);
        
        await this.recenter(true);
        await gsap.to(item.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        item.mesh.material = glassMaterial.clone();
        logAction(`Inserted ${val} at index ${index}.`);
    },

    async delete(index) {
        if (index < 0 || index >= this.data.length) return;
        
        const item = this.data[index];
        item.mesh.material = highlightMaterial.clone();
        gsap.to(item.mesh.position, { y: -10, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        this.data.splice(index, 1);
        
        await this.recenter(true);
        logAction(`Deleted at index ${index}.`);
    },

    async traverse() {
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            logAction(`Reading index [${i}] => ${item.value}`);
            item.mesh.material = highlightMaterial.clone();
            await gsap.to(item.mesh.position, { y: 2, duration: 0.25, yoyo: true, repeat: 1 });
            item.mesh.material = glassMaterial.clone();
            await new Promise(r => setTimeout(r, 100));
        }
        logAction("Traversal complete.");
    }
};

// ==========================================
// 2. LINKED LIST MANAGER
// ==========================================
class PointerArrow {
    constructor() {
        this.group = new THREE.Group();
        this.mat = new THREE.MeshBasicMaterial({ color: 0xa855f7 }); // Purple pointers
        
        // Shaft
        this.shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        this.shaftGeo.translate(0, 0.5, 0);
        this.shaftGeo.rotateX(Math.PI / 2);
        this.shaft = new THREE.Mesh(this.shaftGeo, this.mat);
        this.group.add(this.shaft);

        // Head
        this.headGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
        this.headGeo.translate(0, -0.4, 0);
        this.headGeo.rotateX(-Math.PI / 2);
        this.head = new THREE.Mesh(this.headGeo, this.mat);
        this.group.add(this.head);
        
        scene.add(this.group);
    }

    update(startPos, endPos, progress = 1.0) {
        if (progress === 0) {
            this.group.visible = false;
            return;
        }
        this.group.visible = true;
        
        // Target position based on progress
        const currentEnd = new THREE.Vector3().lerpVectors(startPos, endPos, progress);
        
        // Offset to start/end at edges of boxes (approx 1.5 units from center)
        const dir = new THREE.Vector3().subVectors(currentEnd, startPos).normalize();
        const dist = startPos.distanceTo(currentEnd);
        
        if (dist < 3) { this.group.visible = false; return; } // Too close to draw

        const offsetStart = startPos.clone().add(dir.clone().multiplyScalar(1.5));
        const offsetEnd = currentEnd.clone().sub(dir.clone().multiplyScalar(1.5));
        const drawDist = offsetStart.distanceTo(offsetEnd);

        this.group.position.copy(offsetStart);
        this.group.lookAt(offsetEnd);
        
        this.shaft.scale.set(1, 1, drawDist - 0.8); // leave room for head
        this.head.position.set(0, 0, drawDist);
    }

    destroy() {
        scene.remove(this.group);
        this.shaftGeo.dispose();
        this.headGeo.dispose();
    }
}

const LinkedListManager = {
    nodes: [],
    pointers: [],
    spacing: 5.5,
    maxElements: 8,

    init() {
        this.nodes = [];
        this.pointers = [];
        [15, 82, 33].forEach(val => this._createNode(val));
        this.rebuildPointers();
        this.recenter(false);
        logAction(`Linked List initialized.`);
    },

    clear() {
        this.nodes.forEach(n => { scene.remove(n.mesh); if(n.htmlEl) n.htmlEl.remove(); });
        this.pointers.forEach(p => p.destroy());
        this.nodes = [];
        this.pointers = [];
    },

    _createNode(val) {
        const mesh = new THREE.Mesh(llNodeGeometry, glassMaterial.clone());
        mesh.castShadow = true;
        scene.add(mesh);

        const el = document.createElement('div');
        el.className = 'dsa-label';
        el.innerHTML = `<div class="dsa-val">${val}</div><div class="dsa-idx"></div>`;
        document.getElementById('labels-container').appendChild(el);

        const node = { mesh, value: val, htmlEl: el };
        this.nodes.push(node);
        return node;
    },

    rebuildPointers() {
        // Clear old
        this.pointers.forEach(p => p.destroy());
        this.pointers = [];
        // Create new
        for (let i = 0; i < this.nodes.length - 1; i++) {
            this.pointers.push(new PointerArrow());
        }
    },

    getStartX() {
        return -((this.nodes.length - 1) * this.spacing) / 2;
    },

    recenter(animate = true) {
        const startX = this.getStartX();
        const promises = [];
        this.nodes.forEach((node, i) => {
            const targetX = startX + i * this.spacing;
            if (animate) {
                promises.push(gsap.to(node.mesh.position, { x: targetX, duration: 0.8, ease: "power2.inOut" }));
            } else {
                node.mesh.position.set(targetX, 0, 0);
            }
        });
        return Promise.all(promises);
    },

    updatePointers() {
        for (let i = 0; i < this.pointers.length; i++) {
            if (this.nodes[i] && this.nodes[i+1]) {
                this.pointers[i].update(this.nodes[i].mesh.position, this.nodes[i+1].mesh.position);
            }
        }
    },

    async append(val) {
        if (this.nodes.length >= this.maxElements) return;
        logAction(`Appending ${val} to Tail...`);
        
        const node = this._createNode(val);
        node.mesh.material = highlightMaterial.clone();
        node.mesh.position.set(this.getStartX() + (this.nodes.length - 1) * this.spacing, 15, 0);
        
        this.rebuildPointers(); // adds the new pointer
        const pObj = { progress: 0 };
        
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        
        // Animate the pointer growing
        const lastPointer = this.pointers[this.pointers.length - 1];
        if (lastPointer) {
            await gsap.to(pObj, { progress: 1, duration: 0.5, onUpdate: () => {
                lastPointer.update(this.nodes[this.nodes.length-2].mesh.position, node.mesh.position, pObj.progress);
            }});
        }
        
        node.mesh.material = glassMaterial.clone();
        logAction(`Appended ${val}.`);
    },

    async prepend(val) {
        if (this.nodes.length >= this.maxElements) return;
        logAction(`Prepending ${val} to Head...`);
        
        const node = this._createNode(val);
        this.nodes.pop();
        this.nodes.unshift(node);
        
        node.mesh.material = highlightMaterial.clone();
        node.mesh.position.set(this.getStartX(), 15, 0);
        
        this.rebuildPointers();
        
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        node.mesh.material = glassMaterial.clone();
        logAction(`Prepended ${val}.`);
    },

    async insert(index, val) {
        if (index <= 0) { this.prepend(val); return; }
        if (index >= this.nodes.length) { this.append(val); return; }
        
        logAction(`Inserting ${val} at index ${index}. Changing pointers...`);
        
        const node = this._createNode(val);
        this.nodes.pop();
        this.nodes.splice(index, 0, node);
        
        node.mesh.position.set(this.getStartX() + index * this.spacing, 15, 0);
        node.mesh.material = highlightMaterial.clone();
        
        this.rebuildPointers();
        
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        node.mesh.material = glassMaterial.clone();
        logAction(`Inserted ${val} at index ${index}.`);
    },

    async delete(index) {
        if (index < 0 || index >= this.nodes.length) return;
        
        const node = this.nodes[index];
        node.mesh.material = highlightMaterial.clone();
        
        logAction(`Deleting node at index ${index}. Bypassing pointer...`);
        
        gsap.to(node.mesh.position, { y: -10, duration: 0.5, ease: "power2.in" });
        await gsap.to(node.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        scene.remove(node.mesh);
        if(node.htmlEl) node.htmlEl.remove();
        this.nodes.splice(index, 1);
        
        this.rebuildPointers();
        await this.recenter(true);
        logAction(`Deleted node.`);
    },

    async traverse() {
        let curr = 0;
        while (curr < this.nodes.length) {
            const node = this.nodes[curr];
            logAction(`Traversing Node ${curr} => Value: ${node.value}`);
            
            node.mesh.material = highlightMaterial.clone();
            await gsap.to(node.mesh.position, { y: 2, duration: 0.25, yoyo: true, repeat: 1 });
            node.mesh.material = glassMaterial.clone();
            
            if (curr < this.pointers.length) {
                // Highlight pointer briefly
                this.pointers[curr].mat.color.setHex(0xffffff);
                await new Promise(r => setTimeout(r, 150));
                this.pointers[curr].mat.color.setHex(0xa855f7);
            }
            
            curr++;
            await new Promise(r => setTimeout(r, 100));
        }
        logAction("Traversal complete.");
    }
};

// ==========================================
// EVENT LISTENERS & UI LOGIC
// ==========================================

// Topic Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isAnimating) return;
        
        // UI updates
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentTopic = btn.dataset.topic;
        
        document.querySelectorAll('.controls-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`controls-${currentTopic}`).classList.add('active');
        
        // Topic info updates
        const titleSpan = document.getElementById('topic-title');
        const descP = document.getElementById('topic-desc');
        
        ArrayManager.clear();
        LinkedListManager.clear();
        
        if (currentTopic === 'array') {
            titleSpan.innerText = 'Array';
            titleSpan.style.color = 'var(--accent)';
            descP.innerText = 'A contiguous block of memory. Fast random access, but inserting or deleting elements requires shifting the others.';
            ArrayManager.init();
        } else {
            titleSpan.innerText = 'Linked List';
            titleSpan.style.color = '#a855f7'; // Purple theme for LL
            descP.innerText = 'A sequence of nodes connected by pointers. Fast insertion/deletion if pointer is known, but slow O(n) traversal.';
            LinkedListManager.init();
        }
    });
});

// Run a wrapper to handle disable/enable buttons
async function runAction(action) {
    if (isAnimating) return;
    toggleButtons(true);
    await action();
    toggleButtons(false);
}

// Array Bindings
document.getElementById('arr-btn-push').addEventListener('click', () => runAction(() => ArrayManager.push(Math.floor(Math.random()*99)+1)));
document.getElementById('arr-btn-pop').addEventListener('click', () => runAction(() => ArrayManager.pop()));
document.getElementById('arr-btn-insert').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('arr-insert-idx').value);
    if (!isNaN(idx)) runAction(() => ArrayManager.insert(idx, Math.floor(Math.random()*99)+1));
});
document.getElementById('arr-btn-delete').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('arr-delete-idx').value);
    if (!isNaN(idx)) runAction(() => ArrayManager.delete(idx));
});
document.getElementById('arr-btn-traverse').addEventListener('click', () => runAction(() => ArrayManager.traverse()));

// Linked List Bindings
document.getElementById('ll-btn-append').addEventListener('click', () => runAction(() => LinkedListManager.append(Math.floor(Math.random()*99)+1)));
document.getElementById('ll-btn-prepend').addEventListener('click', () => runAction(() => LinkedListManager.prepend(Math.floor(Math.random()*99)+1)));
document.getElementById('ll-btn-insert').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('ll-insert-idx').value);
    if (!isNaN(idx)) runAction(() => LinkedListManager.insert(idx, Math.floor(Math.random()*99)+1));
});
document.getElementById('ll-btn-delete').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('ll-delete-idx').value);
    if (!isNaN(idx)) runAction(() => LinkedListManager.delete(idx));
});
document.getElementById('ll-btn-traverse').addEventListener('click', () => runAction(() => LinkedListManager.traverse()));

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    if (currentTopic === 'array') {
        renderLabels(ArrayManager.data);
    } else if (currentTopic === 'linkedlist') {
        renderLabels(LinkedListManager.nodes);
        LinkedListManager.updatePointers();
    }
    
    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Boot
ArrayManager.init();
animate();
