import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

export class LinkedListManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.nodes = [];
        this.pointers = [];
        this.spacing = 6.0;
        this.maxElements = 12;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#a855f7'; 
        this.glassMat = Materials.getGlass(0x4c1d95);
        this.highMat = Materials.getHighlight(0xc084fc, 0xa855f7);
        this.visitMat = Materials.getHighlight(0xfde047, 0xeab308); // Yellow for algorithm highlighting
    }

    init() {
        this.clear();
        [15, 82, 33].forEach(val => this._createNode(val));
        this.rebuildPointers();
        this.recenter(false);
        this.logAction(`Linked List initialized.`);
        if (this.logCode) {
            this.logCode(
                "Singly Linked List: A sequence of nodes where each node points to the next. Initialized with dummy values.",
                "class Node {\n    int val;\n    Node next;\n    Node(int v) { val = v; }\n}\nNode head = new Node(15);\nhead.next = new Node(82);"
            );
        }
    }

    clear() {
        this.nodes.forEach(n => { this.sm.scene.remove(n.mesh); if(n.htmlEl) n.htmlEl.remove(); });
        this.pointers.forEach(p => p.destroy());
        this.nodes = [];
        this.pointers = [];
    }

    update() {
        updateLabels(this.nodes, this.sm.camera);
        this.nodes.forEach((n, i) => {
            let text = `Node ${i}`;
            if(i === 0) text = 'Head';
            if(i === this.nodes.length - 1 && this.nodes.length > 1) text = 'Tail';
            if(n.htmlEl) n.htmlEl.querySelector('.dsa-idx').innerText = text;
        });
        
        for (let i = 0; i < this.pointers.length; i++) {
            if (this.nodes[i] && this.nodes[i+1]) {
                this.pointers[i].update(this.nodes[i].mesh.position, this.nodes[i+1].mesh.position);
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
        this.pointers.forEach(p => p.destroy());
        this.pointers = [];
        for (let i = 0; i < this.nodes.length - 1; i++) {
            this.pointers.push(new PointerArrow(this.sm.scene, 0xa855f7));
        }
    }

    getStartX() { return -((this.nodes.length - 1) * this.spacing) / 2; }

    recenter(animate = true) {
        const startX = this.getStartX();
        const promises = [];
        
        // Dynamically adjust camera Z to fit all elements
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
        this.logAction(`Appending ${val} to Tail...`);
        
        const node = this._createNode(val);
        node.mesh.material = this.highMat;
        node.mesh.position.set(this.getStartX() + (this.nodes.length - 1) * this.spacing, 15, 0);
        
        this.rebuildPointers();
        const pObj = { progress: 0 };
        const lastPointer = this.pointers[this.pointers.length - 1];
        
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        
        if (lastPointer) {
            await gsap.to(pObj, { progress: 1, duration: 0.5, onUpdate: () => {
                lastPointer.update(this.nodes[this.nodes.length-2].mesh.position, node.mesh.position, pObj.progress);
            }});
        }
        node.mesh.material = this.glassMat;
        this.logAction(`Appended ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Append (Tail): Adds a new node to the end. If we keep track of the tail pointer, it is O(1). Otherwise, we traverse to the end O(N).",
                "Node newNode = new Node(" + val + ");\nif (head == null) {\n    head = newNode;\n} else {\n    Node curr = head;\n    while (curr.next != null) curr = curr.next;\n    curr.next = newNode;\n}"
            );
        }
    }

    async prepend(val) {
        if (this.nodes.length >= this.maxElements) return;
        this.logAction(`Prepending ${val} to Head...`);
        
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
                "Prepend (Head): Inserts a node at the beginning. The new node points to the current head, then becomes the new head. O(1) time complexity.",
                "Node newNode = new Node(" + val + ");\nnewNode.next = head;\nhead = newNode;"
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
                "Insert at Index: Traverses to the node just before the index, updates pointers to include the new node. O(N) time complexity.",
                "Node newNode = new Node(" + val + ");\nNode curr = head;\nfor(int i=0; i<" + index + "-1; i++) {\n    curr = curr.next;\n}\nnewNode.next = curr.next;\ncurr.next = newNode;"
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
                "Delete at Index: Traverses to the node just before the index and bypasses the node to be deleted. O(N) time complexity.",
                "Node curr = head;\nfor(int i=0; i<" + index + "-1; i++) {\n    curr = curr.next;\n}\ncurr.next = curr.next.next;"
            );
        }
    }

    async traverse() {
        let curr = 0;
        while (curr < this.nodes.length) {
            const node = this.nodes[curr];
            this.logAction(`Traversing Node ${curr} => Value: ${node.value}`);
            node.mesh.material = this.highMat;
            await gsap.to(node.mesh.position, { y: 2, duration: 0.25, yoyo: true, repeat: 1 });
            node.mesh.material = this.glassMat;
            
            if (curr < this.pointers.length) {
                this.pointers[curr].mat.color.setHex(0xffffff);
                await delay(150);
                this.pointers[curr].mat.color.setHex(0xa855f7);
            }
            curr++;
            await delay(100);
        }
        this.logAction("Traversal complete.");
        if (this.logCode) {
            this.logCode(
                "Traversal: Follows the 'next' pointers from the head until reaching null. O(N) time complexity.",
                "Node curr = head;\nwhile (curr != null) {\n    System.out.println(curr.val);\n    curr = curr.next;\n}"
            );
        }
    }

    async reverse() {
        this.logAction("Starting Reverse Linked List...");
        if (this.logCode) {
            this.logCode(
                "Reverse Linked List: Iterates through the list, flipping the 'next' pointer of each node to point to its previous node. O(N) time complexity. O(1) space.",
                "Node prev = null;\nNode curr = head;\nwhile (curr != null) {\n    Node nextTemp = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = nextTemp;\n}\nhead = prev;"
            );
        }

        const n = this.nodes.length;
        if (n <= 1) {
            this.logAction("List is too short to reverse.");
            return;
        }

        // 1. Visually traverse the list as if updating pointers
        this.highlightCodeLine(0);
        this.highlightCodeLine(1);
        this.highlightCodeLine(2);
        for (let i = 0; i < n; i++) {
            this.highlightCodeLine(3);
            const node = this.nodes[i];
            this.logAction(`Processing Node with value ${node.value}`);
            node.mesh.material = this.visitMat.clone();
            
            this.highlightCodeLine(4);
            await gsap.to(node.mesh.position, { y: 3, duration: 0.3 });
            if (i < this.pointers.length) {
                this.pointers[i].mat.color.setHex(0xfde047); // Highlight pointer being flipped
            }
            this.highlightCodeLine(5);
            this.highlightCodeLine(6);
            await delay(400);
            this.highlightCodeLine(2);
        }

        this.highlightCodeLine(8);
        this.logAction("Pointers updated. Re-arranging nodes...");
        
        // 2. Actually reverse the internal array
        this.nodes.reverse();
        
        // 3. Rebuild pointers and physically move the nodes on screen
        this.rebuildPointers();
        const movePromises = this.recenter(true);
        
        // 4. Reset materials and labels
        this.nodes.forEach((n, i) => {
            gsap.to(n.mesh.position, { y: 0, duration: 0.8, ease: "power2.inOut" });
            n.mesh.material = this.glassMat;
        });
        
        await movePromises;
        this.logAction("Linked List fully reversed!");
    }
}
