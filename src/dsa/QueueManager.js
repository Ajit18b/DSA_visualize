import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';

export class QueueManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.data = [];
        this.spacing = 4.5;
        this.maxElements = 15;
        
        this.geometry = new RoundedBoxGeometry(3, 3, 3, 6, 0.4);
        this.themeColor = '#10b981';
        this.glassMat = Materials.getGlass(0x064e3b);
        this.highMat = Materials.getHighlight(0x34d399, 0x10b981);
        
        this.baseGeo = new THREE.PlaneGeometry(60, 5);
        this.baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        this.base = new THREE.Mesh(this.baseGeo, this.baseMat);
        this.base.rotation.x = -Math.PI / 2;
        this.base.position.y = -1.6;
    }

    init() {
        this.clear();
        this.sm.scene.add(this.base);
        [10, 20, 30].forEach(val => this._createItem(val));
        this.recenter(false);
        this.logAction(`Queue initialized with ${this.data.length} elements.`);
        if (this.logCode) {
            this.logCode(
                "Queue: A FIFO (First-In-First-Out) data structure. Elements are added at the rear and removed from the front.",
                "Queue<Integer> queue = new LinkedList<>();\nqueue.add(10);\nqueue.add(20);\nqueue.add(30);"
            );
        }
    }

    clear() {
        this.sm.scene.remove(this.base);
        this.data.forEach(item => {
            this.sm.scene.remove(item.mesh);
            if(item.htmlEl) item.htmlEl.remove();
        });
        this.data = [];
    }

    update() {
        updateLabels(this.data, this.sm.camera);
        this.data.forEach((item, i) => {
            let label = `idx ${i}`;
            if(i === 0) label = 'FRONT';
            if(i === this.data.length - 1) label = 'REAR';
            if(this.data.length === 1) label = 'FRONT/REAR';
            if(item.htmlEl) item.htmlEl.querySelector('.dsa-idx').innerText = label;
        });
    }

    _createItem(val) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        const el = createHtmlLabel(val, '', this.themeColor);
        const item = { mesh, value: val, htmlEl: el };
        this.data.push(item);
        return item;
    }

    getStartX() { return ((this.data.length - 1) * this.spacing) / 2; }

    recenter(animate = true) {
        const startX = this.getStartX();
        const promises = [];
        
        // Dynamically adjust camera Z to fit all elements
        const targetZ = Math.max(30, (this.data.length * this.spacing) * 0.9);
        if (animate) {
            gsap.to(this.sm.camera.position, { z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.z = targetZ;
            this.sm.controls.target.set(0, 0, 0);
        }

        this.data.forEach((item, i) => {
            const targetX = startX - i * this.spacing;
            if (animate) {
                promises.push(gsap.to(item.mesh.position, { x: targetX, y: 0, z: 0, duration: 0.6, ease: "power2.inOut" }));
            } else {
                item.mesh.position.set(targetX, 0, 0);
            }
        });
        return Promise.all(promises);
    }

    async enqueue(val) {
        if (this.data.length >= this.maxElements) { this.logAction("Queue is Full!"); return; }
        this.logAction(`Enqueueing ${val} at the Rear.`);
        
        const item = this._createItem(val);
        item.mesh.material = this.highMat;
        
        // Spawn far right
        const startX = this.getStartX();
        const dropWidth = Math.max(15, (this.data.length * this.spacing));
        item.mesh.position.set(startX + dropWidth, 0, 0); 
        
        await this.recenter(true);
        item.mesh.material = this.glassMat;
        this.logAction(`Enqueued ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Enqueue (Add/Offer): Adds an element to the rear (tail) of the queue. O(1) time complexity.",
                "queue.offer(" + val + "); // or queue.add(" + val + ");"
            );
        }
    }

    async dequeue() {
        if (this.data.length === 0) { this.logAction("Queue is Empty!"); return; }
        
        const item = this.data.shift();
        this.logAction(`Dequeueing ${item.value} from the Front.`);
        item.mesh.material = this.highMat;
        
        // Move far left and shrink
        gsap.to(item.mesh.position, { x: item.mesh.position.x - 15, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        this.sm.scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        
        await this.recenter(true);
        this.logAction(`Dequeued ${item.value}.`);
        if (this.logCode) {
            this.logCode(
                "Dequeue (Poll/Remove): Removes and returns the element at the front (head) of the queue. O(1) time complexity.",
                "int dequeuedVal = queue.poll(); // or queue.remove();"
            );
        }
    }

    async peek() {
        if (this.data.length === 0) { this.logAction("Queue is empty."); return; }
        const item = this.data[0];
        this.logAction(`Peeking at Front => ${item.value}`);
        item.mesh.material = this.highMat;
        await gsap.to(item.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
        item.mesh.material = this.glassMat;
        if (this.logCode) {
            this.logCode(
                "Peek: Returns the element at the front of the queue without removing it. O(1) time complexity.",
                "int frontVal = queue.peek();"
            );
        }
    }

    async roundRobin() {
        this.logAction("Simulating Round-Robin OS Scheduling...");
        if (this.logCode) {
            this.logCode(
                "Round-Robin: A CPU scheduling algorithm where each process is assigned a fixed time slot in a cyclic way. It uses a queue data structure.",
                "Queue<Process> q = new LinkedList<>();\n// Initialize queue with processes\nwhile(!q.isEmpty()) {\n    Process p = q.poll();\n    p.executeTimeSlice();\n    if (!p.isFinished()) {\n        q.add(p); // Re-queue\n    }\n}"
            );
        }

        // Fill queue if empty
        if (this.nodes.length < 3) {
            this.logAction("Initializing queue with 3 processes...");
            this.clear();
            await this.enqueue('P1');
            await this.enqueue('P2');
            await this.enqueue('P3');
        }

        const iterations = 4;
        this.highlightCodeLine(2);
        
        for (let i = 0; i < iterations; i++) {
            if (this.nodes.length === 0) break;
            
            this.highlightCodeLine(3);
            const pNode = this.nodes[0];
            const pName = pNode.value;
            this.logAction(`Dequeueing ${pName} for CPU execution...`);
            
            // Dequeue
            pNode.mesh.material = Materials.getHighlight(0xa7f3d0, 0x10b981);
            gsap.to(pNode.mesh.position, { y: 15, duration: 0.5, ease: "power2.in" });
            await gsap.to(pNode.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
            this.sm.scene.remove(pNode.mesh);
            if(pNode.htmlEl) pNode.htmlEl.remove();
            this.nodes.shift();
            await this.recenter(true);
            
            this.highlightCodeLine(4);
            this.logAction(`${pName} is executing time slice...`);
            await delay(800);
            
            // Re-queue
            this.highlightCodeLine(5);
            this.highlightCodeLine(6);
            this.logAction(`Time slice expired. Re-queueing ${pName}...`);
            await this.enqueue(pName);
            this.highlightCodeLine(2);
        }
        this.logAction("Round-Robin simulation complete.");
    }
}
