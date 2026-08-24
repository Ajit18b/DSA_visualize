import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

export class DoublyLinkedListManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.nodes = [];
        this.pointersFwd = [];
        this.pointersBwd = [];
        this.spacing = 6.0;
        this.maxElements = 12;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#ef4444'; // Red
        this.glassMat = Materials.getGlass(0x7f1d1d);
        this.highMat = Materials.getHighlight(0xf87171, 0xef4444);
    }

    init() {
        this.clear();
        [10, 20, 30].forEach(val => this._createNode(val));
        this.rebuildPointers();
        this.recenter(false);
        this.logAction(`Doubly Linked List initialized.`);
        if (this.logCode) {
            this.logCode(
                "Doubly Linked List: Nodes have pointers to both the next and previous nodes. Allows bidirectional traversal.",
                "class Node {\n    int val;\n    Node next, prev;\n    Node(int v) { val = v; }\n}\nNode head = new Node(10);\nNode tail = head;"
            );
        }
    }

    clear() {
        this.nodes.forEach(n => { this.sm.scene.remove(n.mesh); if(n.htmlEl) n.htmlEl.remove(); });
        this.pointersFwd.forEach(p => p.destroy());
        this.pointersBwd.forEach(p => p.destroy());
        this.nodes = [];
        this.pointersFwd = [];
        this.pointersBwd = [];
    }

    update() {
        updateLabels(this.nodes, this.sm.camera);
        this.nodes.forEach((n, i) => {
            let text = `Node ${i}`;
            if(i === 0) text = 'Head';
            if(i === this.nodes.length - 1 && this.nodes.length > 1) text = 'Tail';
            if(n.htmlEl) n.htmlEl.querySelector('.dsa-idx').innerText = text;
        });
        
        for (let i = 0; i < this.nodes.length - 1; i++) {
            if (this.nodes[i] && this.nodes[i+1]) {
                const posA = this.nodes[i].mesh.position.clone();
                const posB = this.nodes[i+1].mesh.position.clone();
                
                // Offset pointers so they don't overlap
                posA.z += 0.5; posB.z += 0.5;
                if(this.pointersFwd[i]) this.pointersFwd[i].update(posA, posB);
                
                posA.z -= 1.0; posB.z -= 1.0;
                if(this.pointersBwd[i]) this.pointersBwd[i].update(posB, posA); 
            }
        }
    }

    _createNode(val) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        const el = createHtmlLabel(val, '', this.themeColor);
        const node = { mesh, value: val, htmlEl: el };
        this.nodes.push(node);
        return node;
    }

    rebuildPointers() {
        this.pointersFwd.forEach(p => p.destroy());
        this.pointersBwd.forEach(p => p.destroy());
        this.pointersFwd = [];
        this.pointersBwd = [];
        for (let i = 0; i < this.nodes.length - 1; i++) {
            this.pointersFwd.push(new PointerArrow(this.sm.scene, 0xef4444));
            this.pointersBwd.push(new PointerArrow(this.sm.scene, 0xef4444));
        }
    }

    getStartX() { return -((this.nodes.length - 1) * this.spacing) / 2; }

    recenter(animate = true) {
        const startX = this.getStartX();
        const promises = [];
        
        // Dynamically adjust camera Z
        const targetZ = Math.max(30, (this.nodes.length * this.spacing) * 0.9);
        if (animate) {
            gsap.to(this.sm.camera.position, { z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.z = targetZ;
            this.sm.controls.target.set(0, 0, 0);
        }

        this.nodes.forEach((node, i) => {
            const targetX = startX + i * this.spacing;
            if (animate) {
                promises.push(gsap.to(node.mesh.position, { x: targetX, duration: 0.8, ease: "power2.inOut" }));
            } else {
                node.mesh.position.set(targetX, 0, 0);
            }
        });
        return Promise.all(promises);
    }

    async append(val) {
        if (this.nodes.length >= this.maxElements) return;
        this.logAction(`Appending ${val}...`);
        
        const node = this._createNode(val);
        node.mesh.material = this.highMat;
        node.mesh.position.set(this.getStartX() + (this.nodes.length - 1) * this.spacing, 15, 0);
        
        this.rebuildPointers();
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        node.mesh.material = this.glassMat;
        this.logAction(`Appended ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Append: Adds a node to the end, updating both next and prev pointers. O(1) if tail is known, else O(N).",
                "Node newNode = new Node(" + val + ");\nif (head == null) {\n    head = tail = newNode;\n} else {\n    tail.next = newNode;\n    newNode.prev = tail;\n    tail = newNode;\n}"
            );
        }
    }

    async prepend(val) {
        if (this.nodes.length >= this.maxElements) return;
        this.logAction(`Prepending ${val}...`);
        
        const node = this._createNode(val);
        this.nodes.pop(); this.nodes.unshift(node);
        node.mesh.material = this.highMat;
        node.mesh.position.set(this.getStartX(), 15, 0);
        
        this.rebuildPointers();
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        node.mesh.material = this.glassMat;
        this.logAction(`Prepended ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Prepend: Inserts a node at the head. Both the new node's next and the old head's prev must be updated. O(1) time.",
                "Node newNode = new Node(" + val + ");\nif (head == null) {\n    head = tail = newNode;\n} else {\n    newNode.next = head;\n    head.prev = newNode;\n    head = newNode;\n}"
            );
        }
    }

    async insert(index, val) {
        if (index <= 0) { this.prepend(val); return; }
        if (index >= this.nodes.length) { this.append(val); return; }
        
        this.logAction(`Inserting ${val} at index ${index}...`);
        const node = this._createNode(val);
        this.nodes.pop(); this.nodes.splice(index, 0, node);
        
        node.mesh.position.set(this.getStartX() + index * this.spacing, 15, 0);
        node.mesh.material = this.highMat;
        
        this.rebuildPointers();
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        node.mesh.material = this.glassMat;
        this.logAction(`Inserted ${val} at index ${index}.`);
        if (this.logCode) {
            this.logCode(
                "Insert at Index: Traverses to index, updates next/prev pointers for the new node and its neighbors. O(N) time.",
                "Node newNode = new Node(" + val + ");\nNode curr = head;\nfor(int i=0; i<" + index + "-1; i++) curr = curr.next;\nnewNode.next = curr.next;\nnewNode.prev = curr;\nif (curr.next != null) curr.next.prev = newNode;\ncurr.next = newNode;"
            );
        }
    }

    async delete(index) {
        if (index < 0 || index >= this.nodes.length) return;
        const node = this.nodes[index];
        node.mesh.material = this.highMat;
        this.logAction(`Deleting node at index ${index}.`);
        
        gsap.to(node.mesh.position, { y: -10, duration: 0.5, ease: "power2.in" });
        await gsap.to(node.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        this.sm.scene.remove(node.mesh);
        if(node.htmlEl) node.htmlEl.remove();
        this.nodes.splice(index, 1);
        
        this.rebuildPointers();
        await this.recenter(true);
        this.logAction(`Deleted node.`);
        if (this.logCode) {
            this.logCode(
                "Delete at Index: Bypasses the node by updating next and prev pointers of its neighbors. O(N) time.",
                "Node curr = head;\nfor(int i=0; i<" + index + "; i++) curr = curr.next;\nif (curr.prev != null) curr.prev.next = curr.next;\nif (curr.next != null) curr.next.prev = curr.prev;"
            );
        }
    }

    async accessLRU(index) {
        if (index < 0 || index >= this.nodes.length) {
            this.logAction(`Invalid index ${index}`);
            return;
        }

        this.logAction(`Accessing item at index ${index} (LRU Cache Simulation)...`);
        if (this.logCode) {
            this.logCode(
                "LRU Cache: Least Recently Used cache evicts the least recently accessed item. Implemented using a Hash Map + Doubly Linked List. When an item is accessed, it is moved to the Head (Most Recently Used).",
                "// Accessing a node\nNode node = map.get(key);\nremoveNode(node);\naddToHead(node);\nreturn node.val;"
            );
        }

        const node = this.nodes[index];
        this.highlightCodeLine(1);
        
        node.mesh.material = Materials.getHighlight(0xfca5a5, 0xef4444);
        await gsap.to(node.mesh.position, { y: 8, duration: 0.5, ease: "power2.out" });
        await delay(300);

        if (index === 0) {
            this.logAction("Item is already Most Recently Used (Head).");
            await gsap.to(node.mesh.position, { y: 0, duration: 0.5, ease: "bounce.out" });
            node.mesh.material = this.glassMat;
            return;
        }

        this.highlightCodeLine(2);
        this.logAction(`Detaching ${node.value}...`);
        this.nodes.splice(index, 1);
        this.rebuildPointers();
        await this.recenter(true);

        this.highlightCodeLine(3);
        this.logAction(`Moving ${node.value} to Head (Most Recently Used)...`);
        this.nodes.unshift(node);
        this.rebuildPointers();
        
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.5, ease: "bounce.out" });
        node.mesh.material = this.glassMat;
        
        this.highlightCodeLine(4);
        this.logAction(`LRU Access complete. Head is now ${node.value}.`);
    }
}
