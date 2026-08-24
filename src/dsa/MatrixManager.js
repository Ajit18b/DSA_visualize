import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';

export class MatrixManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.nodes = [];
        this.rows = 3;
        this.cols = 4;
        this.spacing = 6.0;
        
        this.geometry = new RoundedBoxGeometry(4.5, 4.5, 1.0, 4, 0.2); // flat tiles
        this.themeColor = '#14b8a6'; // Teal
        this.glassMat = Materials.getGlass(0x0f766e);
        this.highMat = Materials.getHighlight(0x2dd4bf, 0x14b8a6);
        this.visitMat = Materials.getHighlight(0xfbbf24, 0xd97706); // Orange for DFS
        this.bfsMat = Materials.getHighlight(0xa78bfa, 0x8b5cf6); // Purple for BFS
    }

    init() {
        this.clear();
        const startX = -((this.cols - 1) * this.spacing) / 2;
        const startY = ((this.rows - 1) * this.spacing) / 2;

        for (let r = 0; r < this.rows; r++) {
            this.nodes[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const val = Math.floor(Math.random() * 9);
                const mesh = new THREE.Mesh(this.geometry, this.glassMat);
                mesh.castShadow = true;
                
                const x = startX + c * this.spacing;
                const y = startY - r * this.spacing;
                
                mesh.position.set(x, y, 0);
                this.sm.scene.add(mesh);
                
                const el = createHtmlLabel(val, `[${r},${c}]`, this.themeColor);
                
                this.nodes[r][c] = { r, c, val, mesh, htmlEl: el, x, y };
            }
        }
        
        this.recenter(false);
        this.logAction(`2D Matrix (${this.rows}x${this.cols}) initialized.`);
        if (this.logCode) {
            this.logCode(
                "2D Matrix (Grid): Represented as an array of arrays. Elements are accessed via row and column indices. Contiguous in memory in row-major order (typically).",
                "int[][] matrix = new int[" + this.rows + "][" + this.cols + "];\n// Access element at row 1, col 2:\nint val = matrix[1][2];"
            );
        }
    }

    clear() {
        for (let r = 0; r < this.nodes.length; r++) {
            for (let c = 0; c < this.nodes[r].length; c++) {
                const n = this.nodes[r][c];
                this.sm.scene.remove(n.mesh);
                if(n.htmlEl) n.htmlEl.remove();
            }
        }
        this.nodes = [];
    }

    update() {
        const flatNodes = [];
        for (let r = 0; r < this.nodes.length; r++) {
            for (let c = 0; c < this.nodes[r].length; c++) {
                flatNodes.push(this.nodes[r][c]);
            }
        }
        updateLabels(flatNodes, this.sm.camera);
    }

    recenter(animate = true) {
        const targetZ = Math.max(30, this.cols * this.spacing * 1.2);
        if (animate) {
            gsap.to(this.sm.camera.position, { x: 0, y: 0, z: targetZ, duration: 0.8, ease: "power2.inOut" });
            gsap.to(this.sm.controls.target, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" });
        } else {
            this.sm.camera.position.set(0, 0, targetZ);
            this.sm.controls.target.set(0, 0, 0);
        }
    }

    async updateCell(r, c, val) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
            this.logAction(`Invalid indices [${r}, ${c}]. Out of bounds.`);
            return;
        }
        this.logAction(`Updating cell at [${r}, ${c}] to ${val}...`);
        
        const node = this.nodes[r][c];
        node.mesh.material = this.highMat;
        
        await gsap.to(node.mesh.position, { z: 5, duration: 0.3, ease: "power2.out" });
        node.val = val;
        node.htmlEl.querySelector('.dsa-val').innerText = val;
        
        await delay(300);
        await gsap.to(node.mesh.position, { z: 0, duration: 0.3, ease: "bounce.out" });
        
        node.mesh.material = this.glassMat;
        this.logAction(`Cell [${r}, ${c}] updated.`);
        
        if (this.logCode) {
            this.logCode(
                "Update Cell: Instantaneous O(1) access. We simply calculate the memory offset using the row and column index.",
                "matrix[" + r + "][" + c + "] = " + val + ";"
            );
        }
    }

    async traverseDFS() {
        this.logAction("Starting DFS Traversal from [0, 0]...");
        
        if (this.logCode) {
            this.logCode(
                "Depth First Search (DFS) on Grid: Visit a cell, then recursively visit unvisited neighbors (up, down, left, right). Uses an implicit stack (recursion). O(R*C) time.",
                "void dfs(int[][] matrix, int r, int c, boolean[][] visited) {\n    if (r < 0 || c < 0 || r >= R || c >= C || visited[r][c]) return;\n    visited[r][c] = true;\n    // Visit logic here\n    dfs(matrix, r+1, c, visited);\n    dfs(matrix, r-1, c, visited);\n    dfs(matrix, r, c+1, visited);\n    dfs(matrix, r, c-1, visited);\n}"
            );
        }

        const visited = Array(this.rows).fill(false).map(() => Array(this.cols).fill(false));
        const dr = [0, 1, 0, -1]; // right, down, left, up
        const dc = [1, 0, -1, 0];
        
        const dfs = async (r, c) => {
            if (r < 0 || r >= this.rows || c < 0 || c >= this.cols || visited[r][c]) return;
            
            visited[r][c] = true;
            const node = this.nodes[r][c];
            
            node.mesh.material = this.visitMat.clone();
            await gsap.to(node.mesh.scale, { x: 1.1, y: 1.1, duration: 0.2, yoyo: true, repeat: 1 });
            await delay(200);
            
            for (let i = 0; i < 4; i++) {
                await dfs(r + dr[i], c + dc[i]);
            }
        };

        await dfs(0, 0);
        
        this.logAction("DFS Traversal Complete. Restoring grid...");
        await delay(1000);
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.nodes[r][c].mesh.material = this.glassMat;
            }
        }
        this.logAction("Grid restored.");
    }

    async bfsShortestPath() {
        this.logAction("Starting BFS Traversal (Shortest Path) from [0, 0]...");
        
        if (this.logCode) {
            this.logCode(
                "BFS on Grid: Explores uniformly outward (level by level). Essential for finding the shortest path in an unweighted grid.",
                "Queue<int[]> q = new LinkedList<>();\nboolean[][] visited = new boolean[R][C];\nq.add(new int[]{0,0});\nvisited[0][0] = true;\nwhile(!q.isEmpty()) {\n    int[] curr = q.poll();\n    for(int i=0; i<4; i++) {\n        int nr = curr[0] + dr[i];\n        int nc = curr[1] + dc[i];\n        if(nr>=0 && nr<R && nc>=0 && nc<C && !visited[nr][nc]) {\n            visited[nr][nc] = true;\n            q.add(new int[]{nr, nc});\n        }\n    }\n}"
            );
        }

        const visited = Array(this.rows).fill(false).map(() => Array(this.cols).fill(false));
        const dr = [0, 1, 0, -1]; 
        const dc = [1, 0, -1, 0];
        
        const q = [[0, 0]];
        visited[0][0] = true;
        
        this.highlightCodeLine(2);
        this.highlightCodeLine(3);
        
        this.nodes[0][0].mesh.material = this.bfsMat.clone();
        
        this.highlightCodeLine(4);
        while (q.length > 0) {
            this.highlightCodeLine(5);
            const [r, c] = q.shift();
            const currNode = this.nodes[r][c];
            this.logAction(`Processing Cell [${r}, ${c}]`);
            
            await gsap.to(currNode.mesh.scale, { x: 1.1, y: 1.1, duration: 0.2, yoyo: true, repeat: 1 });
            
            this.highlightCodeLine(6);
            for (let i = 0; i < 4; i++) {
                const nr = r + dr[i];
                const nc = c + dc[i];
                this.highlightCodeLine(7);
                this.highlightCodeLine(8);
                
                this.highlightCodeLine(9);
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !visited[nr][nc]) {
                    this.highlightCodeLine(10);
                    visited[nr][nc] = true;
                    this.highlightCodeLine(11);
                    q.push([nr, nc]);
                    
                    const nextNode = this.nodes[nr][nc];
                    nextNode.mesh.material = this.bfsMat.clone();
                    await delay(100);
                }
            }
            this.highlightCodeLine(4);
        }
        
        this.logAction("BFS Traversal Complete. Restoring grid...");
        await delay(1000);
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.nodes[r][c].mesh.material = this.glassMat;
            }
        }
    }
}
