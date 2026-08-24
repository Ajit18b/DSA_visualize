import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

class TrieNode {
    constructor(char, mesh, htmlEl) {
        this.char = char;
        this.mesh = mesh;
        this.htmlEl = htmlEl;
        this.children = {}; // char -> TrieNode
        this.isEndOfWord = false;
        this.x = 0;
        this.y = 0;
        this.depth = 0;
        this.edgeToParent = null;
    }
}

export class TrieManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.root = null;
        this.nodes = [];
        this.ySpacing = 6;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#0ea5e9'; // Light Blue
        this.glassMat = Materials.getGlass(0x0369a1);
        this.highMat = Materials.getHighlight(0x38bdf8, 0x0ea5e9);
    }

    init() {
        this.clear();
        this.root = this._createNode('root');
        this.insertInstant('CAT');
        this.insertInstant('CAR');
        this.recenter(false);
        this.logAction(`Trie initialized.`);
        if (this.logCode) {
            this.logCode(
                "Trie (Prefix Tree): An n-ary tree where characters are stored at nodes. Useful for prefix searches. The root is typically empty.",
                "class TrieNode {\n    TrieNode[] children = new TrieNode[26];\n    boolean isEndOfWord;\n}\nTrieNode root = new TrieNode();"
            );
        }
    }

    clear() {
        this.nodes.forEach(n => {
            this.sm.scene.remove(n.mesh);
            if(n.htmlEl) n.htmlEl.remove();
            if(n.edgeToParent) n.edgeToParent.destroy();
        });
        this.nodes = [];
        this.root = null;
    }

    update() {
        updateLabels(this.nodes, this.sm.camera);
        // Find parent dynamically to update edges is complex for a trie, 
        // Instead we can just do a traversal. 
        this._updateEdges(this.root);
    }

    _updateEdges(node) {
        if(!node) return;
        Object.values(node.children).forEach(child => {
            if(child.edgeToParent) {
                child.edgeToParent.update(node.mesh.position, child.mesh.position);
            }
            this._updateEdges(child);
        });
    }

    _createNode(char) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        // 'root' is visually an empty box or '*'
        const displayChar = char === 'root' ? '*' : char;
        const el = createHtmlLabel(displayChar, '', this.themeColor);
        const node = new TrieNode(char, mesh, el);
        this.nodes.push(node);
        return node;
    }

    // Calculates x, y positions
    _calculatePositions(node, depth = 0, startX = 0, width = 20) {
        if (!node) return;
        node.depth = depth;
        node.y = -depth * this.ySpacing;
        node.x = startX;
        
        const children = Object.values(node.children);
        if (children.length === 0) return;
        
        const step = width / children.length;
        let currX = startX - (width / 2) + (step / 2);
        
        children.forEach(child => {
            this._calculatePositions(child, depth + 1, currX, step * 0.8);
            currX += step;
        });
    }

    recenter(animate = true) {
        if (!this.root) return Promise.resolve();
        this._calculatePositions(this.root, 0, 0, 30);
        
        let maxDepth = 0;
        this.nodes.forEach(n => maxDepth = Math.max(maxDepth, n.depth));
        
        const targetY = -maxDepth * this.ySpacing / 2;
        const targetZ = Math.max(30, 20 + maxDepth * 10);
        
        if (animate) {
            gsap.to(this.sm.camera.position, { x: 0, y: targetY + 5, z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: targetY, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.set(0, targetY + 5, targetZ);
            this.sm.controls.target.set(0, targetY, 0);
        }

        const promises = [];
        this.nodes.forEach((node) => {
            if (animate) {
                promises.push(gsap.to(node.mesh.position, { x: node.x, y: node.y, duration: 0.8, ease: "power2.inOut" }));
            } else {
                node.mesh.position.set(node.x, node.y, 0);
            }
        });
        return Promise.all(promises);
    }

    insertInstant(word) {
        let curr = this.root;
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (!curr.children[char]) {
                const node = this._createNode(char);
                curr.children[char] = node;
                node.edgeToParent = new PointerArrow(this.sm.scene, 0x0ea5e9);
            }
            curr = curr.children[char];
        }
        curr.isEndOfWord = true;
        curr.htmlEl.querySelector('.dsa-idx').innerText = 'END';
    }

    async insert(word) {
        if (!word) return;
        word = word.toUpperCase();
        this.logAction(`Inserting word "${word}"...`);
        
        let curr = this.root;
        curr.mesh.material = this.highMat;
        await delay(300);
        curr.mesh.material = this.glassMat;

        let modified = false;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (!curr.children[char]) {
                this.logAction(`Adding node "${char}"...`);
                const node = this._createNode(char);
                node.mesh.position.set(curr.mesh.position.x, curr.mesh.position.y - 2, 0);
                curr.children[char] = node;
                node.edgeToParent = new PointerArrow(this.sm.scene, 0x0ea5e9);
                modified = true;
                
                await this.recenter(true);
            }
            curr = curr.children[char];
            curr.mesh.material = this.highMat;
            await delay(400);
            curr.mesh.material = this.glassMat;
        }
        
        curr.isEndOfWord = true;
        curr.htmlEl.querySelector('.dsa-idx').innerText = 'END';
        this.logAction(`Inserted word "${word}".`);
        if (this.logCode) {
            this.logCode(
                "Insert: For each character, check if a child exists. If not, create it. Move to the child. Mark the final node as end of word. O(L) time where L is word length.",
                "TrieNode curr = root;\nfor (char c : word.toCharArray()) {\n    int idx = c - 'A';\n    if (curr.children[idx] == null) {\n        curr.children[idx] = new TrieNode();\n    }\n    curr = curr.children[idx];\n}\ncurr.isEndOfWord = true;"
            );
        }
    }

    async search(word) {
        if (!word) return;
        word = word.toUpperCase();
        this.logAction(`Searching word "${word}"...`);
        
        let curr = this.root;
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (!curr.children[char]) {
                this.logAction(`Character "${char}" not found. Word does not exist.`);
                return;
            }
            curr = curr.children[char];
            curr.mesh.material = this.highMat;
            await gsap.to(curr.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
            curr.mesh.material = this.glassMat;
        }
        
        if (curr.isEndOfWord) {
            this.logAction(`Word "${word}" found!`);
            if (this.logCode) {
                this.logCode(
                    "Search: Traverse the tree matching characters. If we can traverse all characters AND the last node is marked as end of word, it exists.",
                    "TrieNode curr = root;\nfor (char c : word.toCharArray()) {\n    int idx = c - 'A';\n    if (curr.children[idx] == null) return false;\n    curr = curr.children[idx];\n}\nreturn curr.isEndOfWord;"
                );
            }
        } else {
            this.logAction(`Prefix "${word}" exists, but not as a full word.`);
            if (this.logCode) {
                this.logCode(
                    "Search (Prefix found, not full word): We traversed the characters, but the final node wasn't marked as end of word.",
                    "// Loop finished successfully, but:\nreturn curr.isEndOfWord; // returns false"
                );
            }
        }
    }

    async autocomplete(prefix) {
        if (!prefix) return;
        prefix = prefix.toUpperCase();
        this.logAction(`Autocompleting prefix "${prefix}"...`);
        if (this.logCode) {
            this.logCode(
                "Autocomplete (Trie): 1. Traverse to the node matching the prefix. 2. Perform DFS from that node to find all endOfWord nodes.",
                "List<String> results = new ArrayList<>();\nTrieNode curr = root;\nfor(char c : prefix.toCharArray()) {\n    if(curr.children[c-'A'] == null) return results;\n    curr = curr.children[c-'A'];\n}\ndfs(curr, prefix, results);\nreturn results;"
            );
        }

        let curr = this.root;
        this.highlightCodeLine(2);
        for (let i = 0; i < prefix.length; i++) {
            const char = prefix[i];
            this.highlightCodeLine(3);
            if (!curr.children[char]) {
                this.logAction(`Prefix "${prefix}" not found.`);
                return;
            }
            this.highlightCodeLine(4);
            curr = curr.children[char];
            curr.mesh.material = this.highMat;
            await gsap.to(curr.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
            curr.mesh.material = this.glassMat;
        }

        this.highlightCodeLine(6);
        this.logAction(`Prefix found. Gathering suffixes via DFS...`);
        const words = [];
        
        const dfs = async (node, path) => {
            node.mesh.material = Materials.getHighlight(0x86efac, 0x22c55e); // Green highlight
            await delay(200);
            
            if (node.isEndOfWord) {
                words.push(path);
                this.logAction(`Found word: ${path}`);
            }
            
            for (let [char, childNode] of Object.entries(node.children)) {
                await dfs(childNode, path + char);
            }
            node.mesh.material = this.glassMat;
        };

        await dfs(curr, prefix);
        
        this.highlightCodeLine(7);
        this.logAction(`Autocomplete results: ${words.length > 0 ? words.join(', ') : 'None'}`);
    }
}
