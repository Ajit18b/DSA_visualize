import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';

export class ArrayManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.data = [];
        this.spacing = 4.5;
        this.maxElements = 15; // Increased max to demonstrate dynamic zoom
        
        // Smoother rounded edges
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#3b82f6';
        this.glassMat = Materials.getGlass(0x1e3a8a);
        this.highMat = Materials.getHighlight(0x93c5fd, 0x3b82f6);
        this.visitMat = Materials.getHighlight(0xfde047, 0xeab308); // Yellow for sorting/searching
    }

    init() {
        this.clear();
        [12, 45, 7, 89, 23].forEach(val => this._createItem(val));
        this.recenter(false);
        this.logAction(`Array initialized with ${this.data.length} elements.`);
        if (this.logCode) {
            this.logCode(
                "Array (Static/Dynamic): Contiguous memory allocation. Initialized with default values.",
                "int[] arr = new int[]{12, 45, 7, 89, 23};"
            );
        }
    }

    clear() {
        this.data.forEach(item => {
            this.sm.scene.remove(item.mesh);
            if(item.htmlEl) item.htmlEl.remove();
        });
        this.data = [];
    }

    update() {
        updateLabels(this.data, this.sm.camera);
        this.data.forEach((item, i) => {
            if(item.htmlEl) item.htmlEl.querySelector('.dsa-idx').innerText = `[${i}]`;
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

    getStartX() { return -((this.data.length - 1) * this.spacing) / 2; }

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
            const targetX = startX + i * this.spacing;
            if (animate) {
                promises.push(gsap.to(item.mesh.position, { x: targetX, duration: 0.6, ease: "power2.inOut" }));
            } else {
                item.mesh.position.set(targetX, 0, 0);
            }
        });
        return Promise.all(promises);
    }

    async push(val) {
        if (this.data.length >= this.maxElements) { this.logAction("Overflow"); return; }
        const item = this._createItem(val);
        item.mesh.material = this.highMat;
        item.mesh.position.set(this.getStartX() + (this.data.length - 1) * this.spacing, 15, 0);
        await this.recenter(true);
        await gsap.to(item.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        item.mesh.material = this.glassMat;
        this.logAction(`Pushed ${val}.`);
        if (this.logCode) {
            this.logCode(
                "Push (Append): Adds an element to the end. In a dynamic array (like ArrayList), if capacity is reached, a new larger array is created and elements are copied over (O(N)), but amortized it is O(1).",
                "// Using ArrayList\nlist.add(" + val + ");\n\n// Using static array with size tracker\narr[size] = " + val + ";\nsize++;"
            );
        }
    }

    async pop() {
        if (this.data.length === 0) { this.logAction("Underflow"); return; }
        const item = this.data.pop();
        item.mesh.material = this.highMat;
        gsap.to(item.mesh.position, { y: 10, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        this.sm.scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        await this.recenter(true);
        this.logAction(`Popped ${item.value}.`);
        if (this.logCode) {
            this.logCode(
                "Pop: Removes the last element. O(1) time complexity since no elements need to be shifted.",
                "// Using ArrayList\nint popped = list.remove(list.size() - 1);\n\n// Using static array with size tracker\nsize--;"
            );
        }
    }

    async insert(index, val) {
        if (index < 0 || index > this.data.length || this.data.length >= this.maxElements) return;
        const item = this._createItem(val);
        this.data.pop(); 
        this.data.splice(index, 0, item);
        item.mesh.material = this.highMat;
        item.mesh.position.set(this.getStartX() + index * this.spacing, 15, 0);
        await this.recenter(true);
        await gsap.to(item.mesh.position, { y: 0, duration: 0.8, ease: "bounce.out" });
        item.mesh.material = this.glassMat;
        this.logAction(`Inserted ${val} at index ${index}.`);
        if (this.logCode) {
            this.logCode(
                "Insert at Index: Requires shifting all subsequent elements one position to the right to make space. O(N) time complexity.",
                "// Using ArrayList\nlist.add(" + index + ", " + val + ");\n\n// Manual shift in static array\nfor (int i = size; i > " + index + "; i--) {\n    arr[i] = arr[i - 1];\n}\narr[" + index + "] = " + val + ";\nsize++;"
            );
        }
    }

    async delete(index) {
        if (index < 0 || index >= this.data.length) return;
        const item = this.data[index];
        item.mesh.material = this.highMat;
        gsap.to(item.mesh.position, { y: -10, duration: 0.5, ease: "power2.in" });
        await gsap.to(item.mesh.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: "power2.in" });
        this.sm.scene.remove(item.mesh);
        if(item.htmlEl) item.htmlEl.remove();
        this.data.splice(index, 1);
        await this.recenter(true);
        this.logAction(`Deleted at index ${index}.`);
        if (this.logCode) {
            this.logCode(
                "Delete at Index: Requires shifting all subsequent elements one position to the left to fill the gap. O(N) time complexity.",
                "// Using ArrayList\nlist.remove(" + index + ");\n\n// Manual shift in static array\nfor (int i = " + index + "; i < size - 1; i++) {\n    arr[i] = arr[i + 1];\n}\nsize--;"
            );
        }
    }

    async traverse() {
        for (let i = 0; i < this.data.length; i++) {
            const item = this.data[i];
            this.logAction(`Reading index [${i}] => ${item.value}`);
            item.mesh.material = this.highMat;
            await gsap.to(item.mesh.position, { y: 2, duration: 0.25, yoyo: true, repeat: 1 });
            item.mesh.material = this.glassMat;
            await delay(100);
        }
        this.logAction("Traversal complete.");
        if (this.logCode) {
            this.logCode(
                "Traversal: Visits each element sequentially from index 0 to N-1. O(N) time complexity.",
                "for (int i = 0; i < arr.length; i++) {\n    System.out.println(arr[i]);\n}"
            );
        }
    }

    async bubbleSort() {
        this.logAction("Starting Bubble Sort...");
        if (this.logCode) {
            this.logCode(
                "Bubble Sort: Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. O(N²) time complexity.",
                "for (int i = 0; i < arr.length - 1; i++) {\n    for (int j = 0; j < arr.length - i - 1; j++) {\n        if (arr[j] > arr[j + 1]) {\n            int temp = arr[j];\n            arr[j] = arr[j+1];\n            arr[j+1] = temp;\n        }\n    }\n}"
            );
        }

        const n = this.data.length;
        this.highlightCodeLine(0);
        for (let i = 0; i < n - 1; i++) {
            this.highlightCodeLine(1);
            for (let j = 0; j < n - i - 1; j++) {
                this.highlightCodeLine(2);
                const node1 = this.data[j];
                const node2 = this.data[j + 1];

                this.logAction(`Comparing ${node1.value} and ${node2.value}`);
                node1.mesh.material = this.visitMat.clone();
                node2.mesh.material = this.visitMat.clone();
                await gsap.to([node1.mesh.position, node2.mesh.position], { y: 2, duration: 0.3 });

                if (node1.value > node2.value) {
                    this.highlightCodeLine(3);
                    this.logAction(`Swapping ${node1.value} and ${node2.value}`);
                    // Swap positions visually
                    const targetX1 = node2.mesh.position.x;
                    const targetX2 = node1.mesh.position.x;
                    
                    this.highlightCodeLine(4);
                    await Promise.all([
                        gsap.to(node1.mesh.position, { x: targetX1, duration: 0.5, ease: "power2.inOut" }),
                        gsap.to(node2.mesh.position, { x: targetX2, duration: 0.5, ease: "power2.inOut" })
                    ]);
                    
                    this.highlightCodeLine(5);
                    // Swap in array
                    this.data[j] = node2;
                    this.data[j + 1] = node1;
                    this.highlightCodeLine(6);
                    
                    // Update index labels
                    node1.htmlEl.querySelector('.dsa-idx').innerText = `[${j+1}]`;
                    node2.htmlEl.querySelector('.dsa-idx').innerText = `[${j}]`;
                }
                
                await gsap.to([node1.mesh.position, node2.mesh.position], { y: 0, duration: 0.3 });
                node1.mesh.material = this.glassMat;
                node2.mesh.material = this.glassMat;
            }
            // Mark the last element as sorted
            this.data[n - i - 1].mesh.material = this.highMat;
            this.logAction(`${this.data[n - i - 1].value} is in its sorted position.`);
        }
        if (n > 0) this.data[0].mesh.material = this.highMat;
        this.logAction("Array is fully sorted!");
        await delay(1000);
        this.data.forEach(node => node.mesh.material = this.glassMat);
    }

    async binarySearch(val) {
        this.logAction(`Starting Binary Search for ${val}...`);
        if (this.logCode) {
            this.logCode(
                "Binary Search: Efficient algorithm for finding an item from a SORTED list of items. It repeatedly divides in half the portion of the list that could contain the item. O(log N) time.",
                "int left = 0, right = arr.length - 1;\nwhile (left <= right) {\n    int mid = left + (right - left) / 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n}\nreturn -1;"
            );
        }

        let left = 0;
        let right = this.data.length - 1;
        let found = false;
        
        this.highlightCodeLine(0);

        // Reset visual state
        this.data.forEach(node => node.mesh.material = this.glassMat);

        this.highlightCodeLine(1);
        while (left <= right) {
            this.highlightCodeLine(2);
            let mid = Math.floor((left + right) / 2);
            this.logAction(`Left: ${left}, Right: ${right}, Mid: ${mid} (Value: ${this.data[mid].value})`);
            
            this.data[mid].mesh.material = this.visitMat.clone();
            await gsap.to(this.data[mid].mesh.position, { y: 2, duration: 0.4 });
            await delay(500);

            this.highlightCodeLine(3);
            if (this.data[mid].value === val) {
                this.logAction(`Target ${val} found at index ${mid}!`);
                this.data[mid].mesh.material = this.highMat;
                await gsap.to(this.data[mid].mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.4, yoyo: true, repeat: 1 });
                found = true;
                break;
            } else if (this.data[mid].value < val) {
                this.highlightCodeLine(4);
                this.logAction(`${this.data[mid].value} < ${val}. Eliminating left half.`);
                for (let i = left; i <= mid; i++) {
                    gsap.to(this.data[i].mesh.material, { opacity: 0.2, transparent: true, duration: 0.4 });
                }
                left = mid + 1;
            } else {
                this.highlightCodeLine(5);
                this.logAction(`${this.data[mid].value} > ${val}. Eliminating right half.`);
                for (let i = mid; i <= right; i++) {
                    gsap.to(this.data[i].mesh.material, { opacity: 0.2, transparent: true, duration: 0.4 });
                }
                right = mid - 1;
            }
            await gsap.to(this.data[mid].mesh.position, { y: 0, duration: 0.4 });
            await delay(300);
            this.highlightCodeLine(1); // Back to while loop condition
        }

        if (!found) {
            this.highlightCodeLine(7);
            this.logAction(`Target ${val} not found in array.`);
        }
        
        await delay(1000);
        this.logAction("Restoring array visibility...");
        this.data.forEach(node => {
            gsap.to(node.mesh.material, { opacity: 1, duration: 0.4 });
            node.mesh.material = this.glassMat;
            gsap.to(node.mesh.position, { y: 0, duration: 0.4 });
        });
    }
}
