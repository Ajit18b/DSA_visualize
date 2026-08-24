import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';
import { PointerArrow } from '../components/PointerArrow.js';

class TreeNode {
    constructor(val, mesh, htmlEl) {
        this.value = val;
        this.mesh = mesh;
        this.htmlEl = htmlEl;
        this.left = null;
        this.right = null;
        this.x = 0;
        this.y = 0;
        this.depth = 0;
        this.edgeToParent = null;
    }
}

export class BSTManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.root = null;
        this.nodes = [];
        this.ySpacing = 6;
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#f97316'; // Orange
        this.glassMat = Materials.getGlass(0x9a3412);
        this.highMat = Materials.getHighlight(0xfb923c, 0xf97316);
        this.visitMat = Materials.getHighlight(0xfef08a, 0xeab308); // Yellow for visits
    }

    init() {
        this.clear();
        [50, 25, 75, 15, 35, 60].forEach(val => this.insertInstant(val));
        this.recenter(false);
        this.logAction(`BST initialized.`);
        if (this.logCode) {
            this.logCode(
                "Binary Search Tree: A tree where left child < parent and right child > parent. Allows O(log N) operations on average.",
                "class TreeNode {\n    int val;\n    TreeNode left, right;\n    TreeNode(int v) { val = v; }\n}\nTreeNode root = new TreeNode(50);"
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
        this.nodes.forEach(n => {
            if(n.edgeToParent && n !== this.root) {
                // Find parent to update edge
                const parent = this.findParent(this.root, n);
                if(parent) n.edgeToParent.update(parent.mesh.position, n.mesh.position);
            }
        });
    }

    findParent(curr, target) {
        if(!curr) return null;
        if(curr.left === target || curr.right === target) return curr;
        return this.findParent(curr.left, target) || this.findParent(curr.right, target);
    }

    _createNode(val) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        mesh.castShadow = true;
        this.sm.scene.add(mesh);
        const el = createHtmlLabel(val, '', this.themeColor);
        const node = new TreeNode(val, mesh, el);
        this.nodes.push(node);
        return node;
    }

    // Calculates x, y positions for all nodes
    _calculatePositions(node, depth = 0, x = 0, offset = 12) {
        if (!node) return;
        node.depth = depth;
        node.x = x;
        node.y = -depth * this.ySpacing;
        
        const nextOffset = offset / 1.8;
        this._calculatePositions(node.left, depth + 1, x - offset, nextOffset);
        this._calculatePositions(node.right, depth + 1, x + offset, nextOffset);
    }

    recenter(animate = true) {
        if (!this.root) return Promise.resolve();
        this._calculatePositions(this.root, 0, 0, 16);
        
        let maxDepth = 0;
        this.nodes.forEach(n => maxDepth = Math.max(maxDepth, n.depth));
        
        // Dynamic camera based on depth and width
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

    insertInstant(val) {
        const node = this._createNode(val);
        if (!this.root) { this.root = node; return; }
        
        let curr = this.root;
        while (true) {
            if (val < curr.value) {
                if (!curr.left) { curr.left = node; break; }
                curr = curr.left;
            } else {
                if (!curr.right) { curr.right = node; break; }
                curr = curr.right;
            }
        }
        node.edgeToParent = new PointerArrow(this.sm.scene, 0xf97316);
    }

    async insert(val) {
        this.logAction(`Inserting ${val}...`);
        const node = this._createNode(val);
        node.mesh.material = this.highMat;
        
        if (!this.root) {
            this.root = node;
            node.mesh.position.set(0, 15, 0);
            await this.recenter(true);
            await gsap.to(node.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
            node.mesh.material = this.glassMat;
            this.logAction(`Inserted ${val} at Root.`);
            return;
        }

        let curr = this.root;
        node.mesh.position.copy(curr.mesh.position).add(new THREE.Vector3(0, 5, 0)); // Start above root

        while (true) {
            curr.mesh.material = this.highMat;
            await gsap.to(node.mesh.position, { x: curr.mesh.position.x, y: curr.mesh.position.y + 3, duration: 0.4 });
            curr.mesh.material = this.glassMat;

            if (val < curr.value) {
                if (!curr.left) {
                    curr.left = node;
                    break;
                }
                curr = curr.left;
            } else {
                if (!curr.right) {
                    curr.right = node;
                    break;
                }
                curr = curr.right;
            }
        }

        node.edgeToParent = new PointerArrow(this.sm.scene, 0xf97316);
        await this.recenter(true);
        await gsap.to(node.mesh.position, { y: node.y, duration: 0.5, ease: "bounce.out" });
        node.mesh.material = this.glassMat;
        this.logAction(`Inserted ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Insert: Compares value to current node. Goes left if smaller, right if larger, until an empty spot is found.",
                "TreeNode curr = root;\nwhile (true) {\n    if (val < curr.val) {\n        if (curr.left == null) { curr.left = new TreeNode(val); break; }\n        curr = curr.left;\n    } else {\n        if (curr.right == null) { curr.right = new TreeNode(val); break; }\n        curr = curr.right;\n    }\n}"
            );
        }
    }

    async search(val) {
        this.logAction(`Searching for ${val}...`);
        let curr = this.root;
        while (curr) {
            curr.mesh.material = this.highMat;
            await gsap.to(curr.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
            curr.mesh.material = this.glassMat;
            
            if (curr.value === val) {
                this.logAction(`Found ${val}!`);
                return;
            }
            if (val < curr.value) curr = curr.left;
            else curr = curr.right;
            await delay(200);
        }
        this.logAction(`${val} not found in BST.`);
        if (this.logCode) {
            this.logCode(
                "Search: Traverses left or right depending on if target is smaller or larger than current node. O(log N) average.",
                "TreeNode curr = root;\nwhile (curr != null) {\n    if (curr.val == target) return true;\n    if (target < curr.val) curr = curr.left;\n    else curr = curr.right;\n}\nreturn false;"
            );
        }
    }

    async inorderTraversal() {
        this.logAction("Starting Inorder Traversal (Left, Root, Right)...");
        if (this.logCode) {
            this.logCode(
                "Inorder Traversal: A depth-first traversal method that visits the Left subtree, the Root node, and then the Right subtree. For a BST, this yields values in sorted order.",
                "void inorder(TreeNode node) {\n    if (node == null) return;\n    inorder(node.left);\n    System.out.println(node.val);\n    inorder(node.right);\n}"
            );
        }

        const traverse = async (node) => {
            this.highlightCodeLine(1);
            if (!node) return;
            
            this.logAction(`Going left from ${node.value}...`);
            this.highlightCodeLine(2);
            await delay(200);
            await traverse(node.left);
            
            this.highlightCodeLine(3);
            this.logAction(`Visiting Node: ${node.value}`);
            node.mesh.material = this.visitMat.clone();
            await gsap.to(node.mesh.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.4, yoyo: true, repeat: 1 });
            await delay(400);
            
            this.logAction(`Going right from ${node.value}...`);
            this.highlightCodeLine(4);
            await delay(200);
            await traverse(node.right);
            
            this.highlightCodeLine(5);
        };

        await traverse(this.root);
        this.logAction("Inorder Traversal Complete!");
        
        await delay(1000);
        this.nodes.forEach(n => n.mesh.material = this.glassMat);
    }
}
