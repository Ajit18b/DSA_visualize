import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';

export class StackManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.data = [];
        this.spacing = 3.5;
        this.maxElements = 15;
        
        this.geometry = new RoundedBoxGeometry(3, 1.5, 3, 4, 0.2);
        this.themeColor = '#f59e0b';
        this.glassMat = Materials.getGlass(0xb45309);
        this.highMat = Materials.getHighlight(0xfcd34d, 0xf59e0b);
        this.visitMat = Materials.getHighlight(0xfef3c7, 0xf59e0b);
        
        this.baseGeo = new RoundedBoxGeometry(5, 0.5, 5, 4, 0.1);
        this.baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        this.base = new THREE.Mesh(this.baseGeo, this.baseMat);
        this.base.position.y = -3;
    }

    init() {
        this.clear();
        this.sm.scene.add(this.base);
        [10, 20, 30].forEach(val => this._createItem(val));
        this.recenter(false);
        this.logAction(`Stack initialized with ${this.data.length} elements.`);
        if (this.logCode) {
            this.logCode(
                "Stack: A LIFO (Last-In-First-Out) data structure. The last element added is the first one to be removed.",
                "Stack<Integer> stack = new Stack<>();\nstack.push(10);\nstack.push(20);\nstack.push(30);"
            );
        }
    }

    clear() {
        this.sm.scene.remove(this.base);
        if (this.data) {
            this.data.forEach(item => {
                this.sm.scene.remove(item.mesh);
                if(item.htmlEl) item.htmlEl.remove();
            });
        }
        this.data = [];
    }

    update() {
        updateLabels(this.data, this.sm.camera);
        this.data.forEach((item, i) => {
            if(item.htmlEl) item.htmlEl.querySelector('.dsa-idx').innerText = i === this.data.length - 1 ? 'TOP' : `idx ${i}`;
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

    recenter(animate = true) {
        const promises = [];
        
        // Dynamically adjust camera Y and Z to fit all elements vertically
        const targetY = Math.max(15, 5 + (this.data.length * this.spacing) * 0.5);
        const targetZ = Math.max(30, 20 + (this.data.length * this.spacing) * 0.8);
        if (animate) {
            gsap.to(this.sm.camera.position, { x: 0, y: targetY, z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: targetY - 10, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.set(0, targetY, targetZ);
            this.sm.controls.target.set(0, targetY - 10, 0);
        }

        this.data.forEach((item, i) => {
            const targetYItem = -1.5 + i * this.spacing;
            if (animate) {
                promises.push(gsap.to(item.mesh.position, { y: targetYItem, x: 0, z: 0, duration: 0.6, ease: "power2.inOut" }));
            } else {
                item.mesh.position.set(0, targetYItem, 0);
            }
        });
        return Promise.all(promises);
    }

    async push(val) {
        if (this.data.length >= this.maxElements) { this.logAction("Stack Overflow!"); return; }
        this.logAction(`Pushing ${val} onto Stack.`);
        
        const item = this._createItem(val);
        item.mesh.material = this.highMat;
        
        // Spawn high above current stack
        const dropHeight = Math.max(25, (this.data.length * this.spacing) + 10);
        item.mesh.position.set(0, dropHeight, 0); 
        
        await this.recenter(true);
        await gsap.to(item.mesh.position, { y: -1.5 + (this.data.length - 1) * this.spacing, duration: 0.8, ease: "bounce.out" });
        item.mesh.material = this.glassMat;
        this.logAction(`Pushed ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Push: Adds an item to the top of the stack. O(1) time complexity.",
                "stack.push(" + val + ");"
            );
        }
    }

    async pop() {
        if (this.data.length === 0) { this.logAction("Stack Underflow!"); return; }
        
        const item = this.data.pop();
        this.logAction(`Popping ${item.value} from Stack.`);
        item.mesh.material = this.highMat;
        
        const dropHeight = Math.max(25, (this.data.length * this.spacing) + 10);
        gsap.to(item.mesh.position, { y: dropHeight, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        
        this.sm.scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        await this.recenter(true);
        this.logAction(`Popped ${item.value}.`);
        if (this.logCode) {
            this.logCode(
                "Pop: Removes the top item from the stack and returns it. O(1) time complexity.",
                "int poppedVal = stack.pop();"
            );
        }
    }

    async peek() {
        if (this.data.length === 0) { this.logAction("Stack is empty."); return; }
        const item = this.data[this.data.length - 1];
        this.logAction(`Peeking at Top => ${item.value}`);
        item.mesh.material = this.highMat;
        await gsap.to(item.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
        item.mesh.material = this.glassMat;
        if (this.logCode) {
            this.logCode(
                "Peek: Returns the top item from the stack without removing it. O(1) time complexity.",
                "int topVal = stack.peek();"
            );
        }
    }

    async validateParentheses(str) {
        this.logAction(`Validating Parentheses: ${str}`);
        if (this.logCode) {
            this.logCode(
                "Valid Parentheses: Uses a stack to keep track of opening brackets. When a closing bracket is encountered, it must match the top of the stack.",
                "Stack<Character> stack = new Stack<>();\nfor(char c : s.toCharArray()) {\n    if(c=='(' || c=='{' || c=='[') stack.push(c);\n    else if(stack.isEmpty()) return false;\n    else if(c==')' && stack.pop()!='(') return false;\n    // ... same for }, ]\n}\nreturn stack.isEmpty();"
            );
        }

        // Clear the stack first to prep for the algorithm
        while (this.data.length > 0) {
            this.logAction("Clearing stack...");
            await this.pop();
        }

        const map = { ')': '(', '}': '{', ']': '[' };
        let isValid = true;

        this.highlightCodeLine(0);
        this.highlightCodeLine(1);
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            this.logAction(`Processing char: '${char}'`);
            
            if (char === '(' || char === '{' || char === '[') {
                this.highlightCodeLine(2);
                await this.push(char);
            } else if (char === ')' || char === '}' || char === ']') {
                if (this.data.length === 0) {
                    this.highlightCodeLine(3);
                    this.logAction(`Stack is empty! Cannot match '${char}'. Invalid.`);
                    isValid = false;
                    break;
                }
                const topNode = this.data[this.data.length - 1];
                const topChar = topNode.value;
                
                // Highlight peek
                topNode.mesh.material = this.visitMat.clone();
                await gsap.to(topNode.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3, yoyo: true, repeat: 1 });
                topNode.mesh.material = this.glassMat;
                
                if (topChar === map[char]) {
                    this.highlightCodeLine(4);
                    this.logAction(`'${char}' matches '${topChar}'. Popping...`);
                    await this.pop();
                } else {
                    this.highlightCodeLine(4); // else if(c==')' && stack.pop()!='(') return false
                    this.logAction(`'${char}' does NOT match '${topChar}'. Invalid.`);
                    isValid = false;
                    break;
                }
            }
            await delay(300);
            this.highlightCodeLine(1);
        }

        if (isValid && this.data.length === 0) {
            this.highlightCodeLine(6);
            this.logAction(`String "${str}" is VALID!`);
        } else if (isValid && this.data.length > 0) {
            this.highlightCodeLine(6);
            this.logAction(`String "${str}" is INVALID! (Unmatched opening brackets left)`);
        }
    }
}
