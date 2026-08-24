import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

export class HashTableManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.buckets = 5; // Array size 5 for demo
        this.table = Array.from({ length: this.buckets }, () => []); // array of arrays (chains)
        this.bucketMeshes = [];
        this.pointers = [];
        this.xSpacing = 4.5;
        this.ySpacing = 4.5;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#14b8a6'; // Teal
        this.glassMat = Materials.getGlass(0x0f766e);
        this.highMat = Materials.getHighlight(0x2dd4bf, 0x14b8a6);
        
        // Base structure to represent the Hash Table array
        this.baseGeo = new RoundedBoxGeometry(3, this.buckets * this.ySpacing, 3.5, 6, 0.2);
        this.baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        this.base = new THREE.Mesh(this.baseGeo, this.baseMat);
        this.base.position.set(-8, 0, -1);
    }

    init() {
        this.clear();
        this.sm.scene.add(this.base);
        this.logAction(`Hash Table initialized with ${this.buckets} buckets.`);
        if (this.logCode) {
            this.logCode(
                "Hash Table (Separate Chaining): An array of linked lists (buckets). Keys are hashed to find the index. Collisions are handled by appending to the list.",
                "class HashTable<K,V> {\n    class Node { K key; V val; Node next; }\n    Node[] table = new Node[5];\n    int hash(K key) { return Math.abs(key.hashCode() % 5); }\n}"
            );
        }
        
        // Create bucket labels
        for(let i = 0; i < this.buckets; i++) {
            const el = document.createElement('div');
            el.className = 'dsa-label';
            el.innerHTML = `<div class="dsa-idx" style="margin-top:0; color: #14b8a6; border-color: #14b8a6;">Bucket ${i}</div>`;
            document.getElementById('labels-container').appendChild(el);
            this.bucketMeshes.push({ 
                mesh: { getWorldPosition: (v) => v.set(-8, this.getBucketY(i), 0) },
                htmlEl: el 
            });
        }
    }

    clear() {
        this.sm.scene.remove(this.base);
        this.table.flat().forEach(item => { this.sm.scene.remove(item.mesh); if(item.htmlEl) item.htmlEl.remove(); });
        this.pointers.forEach(p => p.destroy());
        this.bucketMeshes.forEach(b => { if(b.htmlEl) b.htmlEl.remove(); });
        this.table = Array.from({ length: this.buckets }, () => []);
        this.bucketMeshes = [];
        this.pointers = [];
    }

    update() {
        updateLabels(this.table.flat(), this.sm.camera);
        updateLabels(this.bucketMeshes, this.sm.camera);
        
        // Update pointers
        this.pointers.forEach(p => p.destroy());
        this.pointers = [];
        for (let i = 0; i < this.buckets; i++) {
            const chain = this.table[i];
            for (let j = 0; j < chain.length - 1; j++) {
                const ptr = new PointerArrow(this.sm.scene, 0x14b8a6);
                ptr.update(chain[j].mesh.position, chain[j+1].mesh.position);
                this.pointers.push(ptr);
            }
        }
    }

    _hash(key) {
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i);
        return hash % this.buckets;
    }

    getBucketY(idx) {
        return ((this.buckets - 1) * this.ySpacing) / 2 - (idx * this.ySpacing);
    }

    async put(key, val) {
        const hashIdx = this._hash(key);
        this.logAction(`Hashing "${key}" => Bucket ${hashIdx}`);
        
        const chain = this.table[hashIdx];
        
        // Check if key exists and update
        const existing = chain.find(item => item.key === key);
        if (existing) {
            existing.value = val;
            existing.htmlEl.querySelector('.dsa-val').innerText = `${key}:${val}`;
            existing.mesh.material = this.highMat;
            await gsap.to(existing.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
            existing.mesh.material = this.glassMat;
            this.logAction(`Updated "${key}" in Bucket ${hashIdx}.`);
            if (this.logCode) {
                this.logCode(
                    "Put (Update): The key hashed to an existing index. We traverse the chain, find the key, and update its value. O(1) average time.",
                    "int idx = hash(key);\nNode curr = table[idx];\nwhile (curr != null) {\n    if (curr.key.equals(key)) {\n        curr.val = val; return;\n    }\n    curr = curr.next;\n}"
                );
            }
            return;
        }

        // New Item
        const mesh = new THREE.Mesh(this.geometry, this.highMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        const el = createHtmlLabel(`${key}:${val}`, '', this.themeColor);
        const item = { key, value: val, mesh, htmlEl: el };
        
        // Animate entering from top, down to bucket, then right to chain
        const startY = 15;
        const targetY = this.getBucketY(hashIdx);
        const targetX = -5 + (chain.length * this.xSpacing);
        
        mesh.position.set(-5, startY, 0);
        
        // Dynamically adjust camera to fit
        const maxChainLen = Math.max(...this.table.map(c => c.length), chain.length + 1);
        const targetZ = Math.max(30, 20 + maxChainLen * 5);
        gsap.to(this.sm.camera.position, { x: 0, y: 0, z: targetZ, duration: 0.8, ease: "power2.inOut" });
        gsap.to(this.sm.controls.target, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" });

        await gsap.to(mesh.position, { y: targetY, duration: 0.5, ease: "power2.in" });
        await gsap.to(mesh.position, { x: targetX, duration: 0.5, ease: "power2.out" });
        
        chain.push(item);
        mesh.material = this.glassMat;
        this.logAction(`Put "${key}" in Bucket ${hashIdx}.`);
        if (this.logCode) {
            this.logCode(
                "Put (Insert): Key hashed to an index. Key wasn't found in the chain, so a new node is appended to the chain. O(1) average time.",
                "int idx = hash(key);\nNode newNode = new Node(key, val);\nnewNode.next = table[idx];\ntable[idx] = newNode; // Inserting at head of chain"
            );
        }
    }

    async get(key) {
        const hashIdx = this._hash(key);
        this.logAction(`Searching "${key}" in Bucket ${hashIdx}...`);
        
        const chain = this.table[hashIdx];
        for (let i = 0; i < chain.length; i++) {
            const item = chain[i];
            item.mesh.material = this.highMat;
            await gsap.to(item.mesh.position, { y: item.mesh.position.y + 1, duration: 0.2, yoyo: true, repeat: 1 });
            item.mesh.material = this.glassMat;
            
            if (item.key === key) {
                this.logAction(`Found "${key}" => ${item.value}`);
                if (this.logCode) {
                    this.logCode(
                        "Get (Found): Hashes the key to find the bucket index, then traverses the chain until the key is found. O(1) average time.",
                        "int idx = hash(key);\nNode curr = table[idx];\nwhile (curr != null) {\n    if (curr.key.equals(key)) return curr.val;\n    curr = curr.next;\n}\nreturn null;"
                    );
                }
                return;
            }
            await delay(200);
        }
        this.logAction(`Key "${key}" not found.`);
        if (this.logCode) {
            this.logCode(
                "Get (Not Found): Hashes the key, traverses the chain at that index, and reaches the end without finding the key.",
                "int idx = hash(key);\nNode curr = table[idx];\nwhile (curr != null) {\n    if (curr.key.equals(key)) return curr.val;\n    curr = curr.next;\n}\nreturn null;"
            );
        }
    }

    async twoSum(targetSum) {
        this.logAction(`Starting Two Sum (Target: ${targetSum})...`);
        if (this.logCode) {
            this.logCode(
                "Two Sum (using Hash Table): We iterate through the array. For each element, we check if (target - element) exists in our hash table. If not, we add the element to the hash table.",
                "Map<Integer, Integer> map = new HashMap<>();\nfor (int i = 0; i < nums.length; i++) {\n    int complement = target - nums[i];\n    if (map.containsKey(complement)) {\n        return new int[] { map.get(complement), i };\n    }\n    map.put(nums[i], i);\n}"
            );
        }

        // Just simulating the traversal of some implicit array that was used to build the current hash table
        const elements = [];
        this.table.flat().forEach(item => elements.push(parseInt(item.value))); // Assuming values are the numbers
        
        this.highlightCodeLine(0);
        this.highlightCodeLine(1);
        
        for (let i = 0; i < elements.length; i++) {
            const num = elements[i];
            const comp = targetSum - num;
            this.highlightCodeLine(2);
            this.logAction(`Checking element ${num}. Complement needed: ${comp}`);
            
            this.highlightCodeLine(3);
            const foundNode = this.table.flat().find(item => parseInt(item.value) === comp);
            
            if (foundNode && foundNode.value !== num) { // Avoid using same element twice for demo
                this.highlightCodeLine(4);
                this.logAction(`Complement ${comp} found! Two Sum solved.`);
                
                // Highlight both
                const currNode = this.table.flat().find(item => parseInt(item.value) === num);
                if (currNode) currNode.mesh.material = Materials.getHighlight(0x86efac, 0x22c55e);
                foundNode.mesh.material = Materials.getHighlight(0x86efac, 0x22c55e);
                
                await delay(1000);
                if (currNode) currNode.mesh.material = this.glassMat;
                foundNode.mesh.material = this.glassMat;
                return;
            } else {
                this.highlightCodeLine(6);
                this.logAction(`Complement not in map. Proceeding...`);
            }
            await delay(500);
            this.highlightCodeLine(1);
        }
        
        this.logAction(`No Two Sum solution found for target ${targetSum}.`);
    }
}
