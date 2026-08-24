import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';
import { delay,  Materials, createHtmlLabel, updateLabels } from '../utils/utils.js';

export class GraphManager {
    constructor(sceneManager, logAction, logCode, highlightCodeLine) {
        this.sm = sceneManager;
        this.logAction = logAction;
        this.logCode = logCode;
        this.highlightCodeLine = highlightCodeLine || (() => {});
        this.nodes = {}; // { id: { mesh, htmlEl, x, y } }
        this.edges = []; // { u, v, line }
        
        this.geometry = new RoundedBoxGeometry(2.5, 2.5, 2.5, 6, 0.3);
        this.themeColor = '#eab308'; // Yellow
        this.glassMat = Materials.getGlass(0x854d0e);
        this.highMat = Materials.getHighlight(0xfde047, 0xeab308);
        this.visitMat = Materials.getHighlight(0x86efac, 0x22c55e); // Green
        this.lineMat = new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 2 });
    }

    init() {
        this.clear();
        ['A', 'B', 'C'].forEach((id, i) => this.addNodeInstant(id, i, 3));
        this.addEdgeInstant('A', 'B');
        this.addEdgeInstant('B', 'C');
        this.addEdgeInstant('C', 'A');
        this.logAction(`Graph initialized.`);
        if (this.logCode) {
            this.logCode(
                "Graph: A set of nodes connected by edges. Can be represented using an Adjacency Matrix or Adjacency List.",
                "Map<String, List<String>> adjList = new HashMap<>();\nadjList.put(\"A\", new ArrayList<>(Arrays.asList(\"B\")));\nadjList.put(\"B\", new ArrayList<>(Arrays.asList(\"C\")));\nadjList.put(\"C\", new ArrayList<>(Arrays.asList(\"A\")));"
            );
        }
    }

    clear() {
        Object.values(this.nodes).forEach(n => { this.sm.scene.remove(n.mesh); if(n.htmlEl) n.htmlEl.remove(); });
        this.edges.forEach(e => { this.sm.scene.remove(e.line); e.geo.dispose(); });
        this.nodes = {};
        this.edges = [];
    }

    update() {
        updateLabels(Object.values(this.nodes), this.sm.camera);
        // Edges are stationary since nodes don't move after placement, but if they did we'd update here.
    }

    _getNodePos(index, total) {
        // Arrange in a circle
        const radius = Math.max(8, total * 1.5);
        const angle = (index / total) * Math.PI * 2;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    addNodeInstant(id, index, total) {
        const mesh = new THREE.Mesh(this.geometry, this.glassMat);
        const pos = this._getNodePos(index, total);
        mesh.position.set(pos.x, pos.y, 0);
        this.sm.scene.add(mesh);
        
        const el = createHtmlLabel(id, '', this.themeColor);
        this.nodes[id] = { id, mesh, htmlEl: el, ...pos };
    }

    addEdgeInstant(u, v) {
        if (!this.nodes[u] || !this.nodes[v]) return;
        const posU = this.nodes[u].mesh.position;
        const posV = this.nodes[v].mesh.position;
        const geo = new THREE.BufferGeometry().setFromPoints([posU, posV]);
        const line = new THREE.Line(geo, this.lineMat);
        this.sm.scene.add(line);
        this.edges.push({ u, v, line, geo });
    }

    recalcPositions() {
        const keys = Object.keys(this.nodes);
        const total = keys.length;
        const promises = [];
        
        const radius = Math.max(8, total * 1.5);
        const targetZ = Math.max(30, radius * 2.5);
        gsap.to(this.sm.camera.position, { x: 0, y: 0, z: targetZ, duration: 0.8, ease: "power2.inOut" });
        gsap.to(this.sm.controls.target, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" });

        keys.forEach((id, i) => {
            const pos = this._getNodePos(i, total);
            this.nodes[id].x = pos.x;
            this.nodes[id].y = pos.y;
            promises.push(gsap.to(this.nodes[id].mesh.position, { x: pos.x, y: pos.y, duration: 0.8, ease: "power2.inOut" }));
        });

        // Update edges
        promises.push(new Promise(resolve => {
            delay(800).then(() => {
                this.edges.forEach(e => {
                    e.geo.setFromPoints([this.nodes[e.u].mesh.position, this.nodes[e.v].mesh.position]);
                });
                resolve();
            });
        }));

        return Promise.all(promises);
    }

    async addNode(id) {
        if (this.nodes[id]) { this.logAction(`Node ${id} already exists.`); return; }
        this.logAction(`Adding Node ${id}...`);
        
        const mesh = new THREE.Mesh(this.geometry, this.highMat);
        mesh.position.set(0, 0, 15); // fly in from front
        this.sm.scene.add(mesh);
        
        const el = createHtmlLabel(id, '', this.themeColor);
        this.nodes[id] = { id, mesh, htmlEl: el, x: 0, y: 0 };
        
        await this.recalcPositions();
        mesh.material = this.glassMat;
        this.logAction(`Added Node ${id}.`);
        if (this.logCode) {
            this.logCode(
                "Add Node (Vertex): Adds a new entry in the adjacency list. O(1) time.",
                "if (!adjList.containsKey(\"" + id + "\")) {\n    adjList.put(\"" + id + "\", new ArrayList<>());\n}"
            );
        }
    }

    async addEdge(u, v) {
        if (!this.nodes[u] || !this.nodes[v]) { this.logAction(`Invalid nodes.`); return; }
        this.logAction(`Adding edge between ${u} and ${v}...`);
        
        this.nodes[u].mesh.material = this.highMat;
        this.nodes[v].mesh.material = this.highMat;
        
        this.addEdgeInstant(u, v);
        
        await delay(500);
        this.nodes[u].mesh.material = this.glassMat;
        this.nodes[v].mesh.material = this.glassMat;
        this.logAction(`Added Edge ${u}-${v}.`);
        if (this.logCode) {
            this.logCode(
                "Add Edge: Appends the destination node to the source node's adjacency list. (For directed graph, only one way). O(1) time.",
                "adjList.get(\"" + u + "\").add(\"" + v + "\");\n// If undirected graph:\n// adjList.get(\"" + v + "\").add(\"" + u + "\");"
            );
        }
    }

    async bfs() {
        const keys = Object.keys(this.nodes);
        if (keys.length === 0) return;
        const startId = keys[0]; // Start from first node added
        
        this.logAction(`Starting Breadth-First Search (BFS) from Node ${startId}...`);
        if (this.logCode) {
            this.logCode(
                "BFS (Graph): Explores neighbors level by level using a Queue and a Visited set to avoid cycles. O(V + E) time.",
                "Queue<String> q = new LinkedList<>();\nSet<String> visited = new HashSet<>();\nq.add(startNode);\nvisited.add(startNode);\n\nwhile(!q.isEmpty()) {\n    String curr = q.poll();\n    System.out.println(curr);\n    for(String neighbor : adjList.get(curr)) {\n        if(!visited.contains(neighbor)) {\n            visited.add(neighbor);\n            q.add(neighbor);\n        }\n    }\n}"
            );
        }

        const visited = new Set();
        const queue = [startId];
        visited.add(startId);
        
        // Build adj list for directed graph
        const adj = {};
        keys.forEach(k => adj[k] = []);
        this.edges.forEach(e => adj[e.u].push(e.v));

        this.highlightCodeLine(2); // q.add(startNode)
        this.highlightCodeLine(3); // visited.add(startNode)
        
        this.nodes[startId].mesh.material = this.visitMat.clone();
        await gsap.to(this.nodes[startId].mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3 });
        await delay(500);

        this.highlightCodeLine(5);
        while (queue.length > 0) {
            this.highlightCodeLine(6);
            const curr = queue.shift();
            this.logAction(`Visiting Node ${curr}`);
            
            this.highlightCodeLine(7);
            
            this.highlightCodeLine(8);
            for (let neighbor of adj[curr]) {
                if (!visited.has(neighbor)) {
                    this.highlightCodeLine(9);
                    this.logAction(`Found unvisited neighbor ${neighbor}`);
                    visited.add(neighbor);
                    queue.push(neighbor);
                    
                    this.highlightCodeLine(10);
                    this.highlightCodeLine(11);
                    
                    const nNode = this.nodes[neighbor];
                    nNode.mesh.material = this.visitMat.clone();
                    await gsap.to(nNode.mesh.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.3 });
                    await delay(400);
                }
            }
            
            // Revert scale but keep color to show visited
            await gsap.to(this.nodes[curr].mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
            this.highlightCodeLine(5);
        }
        
        this.highlightCodeLine(-1);
        this.logAction("BFS Complete.");
        await delay(1000);
        keys.forEach(k => {
            this.nodes[k].mesh.material = this.glassMat;
            this.nodes[k].mesh.scale.set(1, 1, 1);
        });
    }
}
