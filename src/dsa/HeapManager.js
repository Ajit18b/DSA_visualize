import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

export class HeapManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.data = []; // array representing the heap
        this.nodes = []; // references to meshes
        this.edges = [];
        this.ySpacing = 6;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#ec4899'; // Pink
        this.glassMat = Materials.getGlass(0x831843);
        this.highMat = Materials.getHighlight(0xf472b6, 0xec4899);
        this.visitMat = Materials.getHighlight(0xfca5a5, 0xef4444); // Red/Pink
    }

    init() {
        this.clear();
        [90, 80, 70, 60, 50, 40].forEach(val => this.insertInstant(val));
        this.recenter(false);
        this.logAction(`Max Heap initialized.`);
        if (this.logCode) {
            this.logCode(
                "Max Heap: A complete binary tree where the parent is always greater than or equal to its children. Usually implemented with an array.",
                "class MaxHeap {\n    int[] heap;\n    int size;\n    // parent = (i-1)/2, left = 2i+1, right = 2i+2\n}"
            );
        }
    }

    clear() {
        this.nodes.forEach(n => { this.sm.scene.remove(n.mesh); if(n.htmlEl) n.htmlEl.remove(); });
        this.edges.forEach(e => e.destroy());
        this.nodes = [];
        this.data = [];
        this.edges = [];
    }

    update() {
        updateLabels(this.nodes, this.sm.camera);
        
        // Rebuild edges
        this.edges.forEach(e => e.destroy());
        this.edges = [];
        for (let i = 1; i < this.nodes.length; i++) {
            const parentIdx = Math.floor((i - 1) / 2);
            const edge = new PointerArrow(this.sm.scene, 0xec4899);
            edge.update(this.nodes[parentIdx].mesh.position, this.nodes[i].mesh.position);
            this.edges.push(edge);
        }
    }

    _createNode(val) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        const el = createHtmlLabel(val, '', this.themeColor);
        const node = { mesh, value: val, htmlEl: el, x: 0, y: 0 };
        this.nodes.push(node);
        return node;
    }

    // Positions nodes as a complete binary tree
    _calculatePositions() {
        for (let i = 0; i < this.nodes.length; i++) {
            const depth = Math.floor(Math.log2(i + 1));
            const levelWidth = Math.pow(2, depth);
            const posInLevel = i - (levelWidth - 1);
            
            const offset = 16 / Math.pow(1.5, depth);
            const startX = -((levelWidth - 1) * offset) / 2;
            
            this.nodes[i].x = startX + posInLevel * offset;
            this.nodes[i].y = -depth * this.ySpacing;
        }
    }

    recenter(animate = true) {
        this._calculatePositions();
        const promises = [];
        
        let maxDepth = Math.floor(Math.log2(this.nodes.length || 1));
        const targetY = -maxDepth * this.ySpacing / 2;
        const targetZ = Math.max(30, 20 + maxDepth * 10);
        
        if (animate) {
            gsap.to(this.sm.camera.position, { x: 0, y: targetY + 5, z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: targetY, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.set(0, targetY + 5, targetZ);
            this.sm.controls.target.set(0, targetY, 0);
        }

        this.nodes.forEach((node) => {
            if (animate) {
                promises.push(gsap.to(node.mesh.position, { x: node.x, y: node.y, duration: 0.8, ease: "power2.inOut" }));
            } else {
                node.mesh.position.set(node.x, node.y, 0);
            }
        });
        return Promise.all(promises);
    }

    insertInstant(val) {
        this.data.push(val);
        this._createNode(val);
        let curr = this.data.length - 1;
        while (curr > 0) {
            let parent = Math.floor((curr - 1) / 2);
            if (this.data[curr] > this.data[parent]) {
                [this.data[curr], this.data[parent]] = [this.data[parent], this.data[curr]];
                [this.nodes[curr], this.nodes[parent]] = [this.nodes[parent], this.nodes[curr]];
                curr = parent;
            } else break;
        }
    }

    async insert(val) {
        this.logAction(`Inserting ${val}...`);
        this.data.push(val);
        const node = this._createNode(val);
        
        node.mesh.position.set(0, 15, 0);
        await this.recenter(true);
        
        // Bubble up animation
        let curr = this.data.length - 1;
        node.mesh.material = this.highMat;
        
        while (curr > 0) {
            let parent = Math.floor((curr - 1) / 2);
            if (this.data[curr] > this.data[parent]) {
                this.logAction(`Swapping ${this.data[curr]} with ${this.data[parent]}`);
                // Swap values in array
                [this.data[curr], this.data[parent]] = [this.data[parent], this.data[curr]];
                // Swap nodes in visual array
                const tempNode = this.nodes[curr];
                this.nodes[curr] = this.nodes[parent];
                this.nodes[parent] = tempNode;
                
                // Animate the swap visually
                this.nodes[curr].mesh.material = this.highMat;
                this._calculatePositions();
                await Promise.all([
                    gsap.to(this.nodes[curr].mesh.position, { x: this.nodes[curr].x, y: this.nodes[curr].y, duration: 0.6 }),
                    gsap.to(this.nodes[parent].mesh.position, { x: this.nodes[parent].x, y: this.nodes[parent].y, duration: 0.6 })
                ]);
                this.nodes[curr].mesh.material = this.glassMat;
                
                curr = parent;
            } else break;
        }
        node.mesh.material = this.glassMat;
        this.logAction(`Inserted ${val} into Max Heap.`);
        if (this.logCode) {
            this.logCode(
                "Insert: Adds element to the end of the array, then 'bubbles up' (swaps with parent) until the heap property is restored. O(log N) time.",
                "heap[size] = val;\nint curr = size;\nsize++;\nwhile (curr > 0 && heap[curr] > heap[(curr - 1) / 2]) {\n    swap(curr, (curr - 1) / 2);\n    curr = (curr - 1) / 2;\n}"
            );
        }
    }

    async extractMax() {
        if (this.data.length === 0) return;
        this.logAction(`Extracting Max...`);
        
        const rootNode = this.nodes[0];
        rootNode.mesh.material = this.highMat;
        gsap.to(rootNode.mesh.position, { y: 15, duration: 0.5, ease: "power2.in" });
        await gsap.to(rootNode.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        this.sm.scene.remove(rootNode.mesh);
        if(rootNode.htmlEl) rootNode.htmlEl.remove();
        
        if (this.data.length === 1) {
            this.data.pop(); this.nodes.pop();
            this.edges.forEach(e => e.destroy()); this.edges = [];
            this.logAction(`Extracted Max.`);
            return;
        }

        // Move last to root
        this.data[0] = this.data.pop();
        this.nodes[0] = this.nodes.pop();
        
        await this.recenter(true);
        
        // Sink down
        let curr = 0;
        this.nodes[0].mesh.material = this.highMat;
        
        while (true) {
            let left = 2 * curr + 1;
            let right = 2 * curr + 2;
            let largest = curr;
            
            if (left < this.data.length && this.data[left] > this.data[largest]) largest = left;
            if (right < this.data.length && this.data[right] > this.data[largest]) largest = right;
            
            if (largest !== curr) {
                this.logAction(`Swapping ${this.data[curr]} with ${this.data[largest]}`);
                [this.data[curr], this.data[largest]] = [this.data[largest], this.data[curr]];
                
                const tempNode = this.nodes[curr];
                this.nodes[curr] = this.nodes[largest];
                this.nodes[largest] = tempNode;
                
                this.nodes[curr].mesh.material = this.highMat;
                this._calculatePositions();
                await Promise.all([
                    gsap.to(this.nodes[curr].mesh.position, { x: this.nodes[curr].x, y: this.nodes[curr].y, duration: 0.6 }),
                    gsap.to(this.nodes[largest].mesh.position, { x: this.nodes[largest].x, y: this.nodes[largest].y, duration: 0.6 })
                ]);
                this.nodes[curr].mesh.material = this.glassMat;
                
                curr = largest;
            } else break;
        }
        
        this.nodes[curr].mesh.material = this.glassMat;
        this.logAction(`Extracted Max, Heap restored.`);
        if (this.logCode) {
            this.logCode(
                "Extract Max: Removes the root (max), replaces it with the last element, then 'sinks down' to restore heap property. O(log N) time.",
                "int max = heap[0];\nheap[0] = heap[size - 1];\nsize--;\nheapifyDown(0); // sinks the new root down to correct position\nreturn max;"
            );
        }
    }

    async heapSort() {
        if (this.data.length === 0) return;
        this.logAction("Starting Heap Sort...");
        if (this.logCode) {
            this.logCode(
                "Heap Sort: Continuously extract the maximum element to yield a sorted array in reverse order.",
                "while (size > 0) {\n    int max = extractMax();\n    sortedArray.add(max);\n}"
            );
        }

        const originalCount = this.data.length;
        this.highlightCodeLine(0);
        
        for (let i = 0; i < originalCount; i++) {
            this.highlightCodeLine(1);
            await this.extractMax();
            this.highlightCodeLine(2);
            await delay(300);
        }
        
        this.highlightCodeLine(-1);
        this.logAction("Heap Sort Complete.");
    }
}
