import gsap from 'gsap';
import { SceneManager } from './core/SceneManager.js';
import { ArrayManager } from './dsa/ArrayManager.js';
import { LinkedListManager } from './dsa/LinkedListManager.js';
import { StackManager } from './dsa/StackManager.js';
import { QueueManager } from './dsa/QueueManager.js';
import { DoublyLinkedListManager } from './dsa/DoublyLinkedListManager.js';
import { BSTManager } from './dsa/BSTManager.js';
import { HeapManager } from './dsa/HeapManager.js';
import { HashTableManager } from './dsa/HashTableManager.js';
import { GraphManager } from './dsa/GraphManager.js';
import { TrieManager } from './dsa/TrieManager.js';
import { MatrixManager } from './dsa/MatrixManager.js';

// Setup Core
const sm = new SceneManager('#webgl-canvas');
let isAnimating = false;
let currentTopic = 'array';
let currentJavaCode = "";

window.manualMode = false;
window.stepResolve = null;
window.abortAnimation = false;
window.actionHistory = [];
window.globalCurrentStep = 0;
window.isFastForwarding = false;
window.globalTargetStep = 0;
window.currentDelayReject = null;
let replayId = 0;

// Override GSAP to for Fast-Forward
const originalGsapTo = gsap.to;
gsap.to = function(target, vars) {
    if (window.isFastForwarding) {
        vars.duration = 0;
        vars.delay = 0;
        const tween = originalGsapTo.call(gsap, target, vars);
        tween.progress(1);
        return tween;
    }
    return originalGsapTo.call(gsap, target, vars);
};

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

function logAction(msg) {
    document.getElementById('log-text').innerText = msg;
}

function logCode(notes, javaCode) {
    document.getElementById('algo-notes').innerText = notes;
    currentJavaCode = javaCode;
    highlightCodeLine(-1);
}

function highlightCodeLine(index) {
    if (!currentJavaCode) return;
    if (index === -1) {
        document.getElementById('java-code').innerHTML = `<code>${escapeHTML(currentJavaCode)}</code>`;
    } else {
        const lines = currentJavaCode.split('\n');
        const highlighted = lines.map((line, i) => {
            if (i === index) {
                return `<span style="background: rgba(251, 191, 36, 0.2); border-left: 3px solid #fbbf24; padding-left: 10px; margin-left: -13px; display: block; width: calc(100% + 26px);">${escapeHTML(line)}</span>`;
            }
            return escapeHTML(line);
        }).join('\n');
        document.getElementById('java-code').innerHTML = `<code>${highlighted}</code>`;
    }
}

function toggleButtons(disabled) {
    isAnimating = disabled;
    document.querySelectorAll('.controls-panel button, .topic-tabs button').forEach(btn => {
        if (!btn.closest('.playback-controls-floating') && !btn.classList.contains('disabled')) {
            btn.disabled = disabled;
        }
    });
    
    const playbackEl = document.querySelector('.playback-controls-floating');
    if (disabled) {
        playbackEl.classList.add('active');
    } else {
        playbackEl.classList.remove('active');
    }
}

// Initialize Managers
const managers = {
    array: new ArrayManager(sm, logAction, logCode, highlightCodeLine),
    linkedlist: new LinkedListManager(sm, logAction, logCode, highlightCodeLine),
    stack: new StackManager(sm, logAction, logCode, highlightCodeLine),
    queue: new QueueManager(sm, logAction, logCode, highlightCodeLine),
    dll: new DoublyLinkedListManager(sm, logAction, logCode, highlightCodeLine),
    bst: new BSTManager(sm, logAction, logCode, highlightCodeLine),
    heap: new HeapManager(sm, logAction, logCode, highlightCodeLine),
    hashtable: new HashTableManager(sm, logAction, logCode, highlightCodeLine),
    graph: new GraphManager(sm, logAction, logCode, highlightCodeLine),
    trie: new TrieManager(sm, logAction, logCode, highlightCodeLine),
    matrix: new MatrixManager(sm, logAction, logCode, highlightCodeLine)
};

const topicData = {
    array: { 
        title: 'Array', desc: 'Contiguous block of memory. Fast access, slow insertion.', color: 0x3b82f6,
        analogy: 'Like lockers in a hallway. You can instantly open locker #5, but adding a new locker in the middle means shifting all lockers down.',
        complexities: { access: 'O(1)', search: 'O(N)', insert: 'O(N)', delete: 'O(N)', space: 'O(N)' }
    },
    linkedlist: { 
        title: 'Linked List', desc: 'Sequence of nodes with forward pointers. Fast insertion.', color: 0xa855f7,
        analogy: 'Like a treasure hunt. Each clue (node) tells you where to find the next clue. You must follow them in order.',
        complexities: { access: 'O(N)', search: 'O(N)', insert: 'O(1)', delete: 'O(1)', space: 'O(N)' }
    },
    stack: { 
        title: 'Stack', desc: 'LIFO structure. Like a stack of plates.', color: 0xf59e0b,
        analogy: 'Like a stack of plates at a buffet or an undo history. You can only take or add to the top.',
        complexities: { access: 'O(N)', search: 'O(N)', insert: 'O(1)', delete: 'O(1)', space: 'O(N)' }
    },
    queue: { 
        title: 'Queue', desc: 'FIFO structure. Like a line at a store.', color: 0x10b981,
        analogy: 'Like waiting in line at a grocery store checkout. First person in line is the first person served.',
        complexities: { access: 'O(N)', search: 'O(N)', insert: 'O(1)', delete: 'O(1)', space: 'O(N)' }
    },
    dll: { 
        title: 'Doubly Linked List', desc: 'Nodes with forward and backward pointers. Bi-directional traversal.', color: 0xef4444,
        analogy: 'Like a train with cars connected front and back. You can walk from the engine to the caboose, or vice versa.',
        complexities: { access: 'O(N)', search: 'O(N)', insert: 'O(1)', delete: 'O(1)', space: 'O(N)' }
    },
    bst: { 
        title: 'Binary Search Tree', desc: 'Hierarchical tree where left child < parent and right child > parent.', color: 0xf97316,
        analogy: 'Like a "Higher/Lower" guessing game. Each choice splits the remaining options in half.',
        complexities: { access: 'O(log N)', search: 'O(log N)', insert: 'O(log N)', delete: 'O(log N)', space: 'O(N)' }
    },
    heap: { 
        title: 'Max Heap', desc: 'Complete binary tree where parent is always greater than its children.', color: 0xec4899,
        analogy: 'Like a corporate hierarchy where a manager always has a higher salary than their subordinates.',
        complexities: { access: 'N/A', search: 'O(N)', insert: 'O(log N)', delete: 'O(log N)', space: 'O(N)' }
    },
    hashtable: { 
        title: 'Hash Table', desc: 'Maps keys to values using a hash function. Handles collisions via chaining.', color: 0x14b8a6,
        analogy: 'Like a dictionary or address book. You instantly know which page to flip to based on the first letter.',
        complexities: { access: 'N/A', search: 'O(1)', insert: 'O(1)', delete: 'O(1)', space: 'O(N)' }
    },
    graph: { 
        title: 'Graph', desc: 'A set of nodes connected by edges. Represents complex networks.', color: 0xeab308,
        analogy: 'Like a map of cities (nodes) connected by highways (edges).',
        complexities: { access: 'N/A', search: 'O(V+E)', insert: 'O(1)', delete: 'O(V+E)', space: 'O(V+E)' }
    },
    trie: { 
        title: 'Trie', desc: 'Prefix tree for efficient string matching and retrieval.', color: 0x0ea5e9,
        analogy: 'Like predictive text or autocomplete on your phone. It narrows down words as you type each letter.',
        complexities: { access: 'N/A', search: 'O(L)', insert: 'O(L)', delete: 'O(L)', space: 'O(N*L)' } // L is word length
    },
    matrix: {
        title: '2D Matrix', desc: 'A grid of rows and columns. Forms the basis of many dynamic programming and pathfinding algorithms.', color: 0x14b8a6,
        analogy: 'Like a chessboard or a spreadsheet. You locate a specific square using a row and column number.',
        complexities: { access: 'O(1)', search: 'O(R*C)', insert: 'O(1)', delete: 'O(1)', space: 'O(R*C)' }
    }
};
// UI Topic Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        
        // Fully abort any running animations
        window.abortAnimation = true;
        if (window.currentDelayReject) window.currentDelayReject(new Error("Aborted"));
        gsap.globalTimeline.clear();
        
        replayId++; // Take ownership to prevent old loops from updating UI
        
        // Reset state
        isAnimating = false;
        window.manualMode = false;
        window.actionHistory = [];
        window.globalCurrentStep = 0;
        window.isFastForwarding = false;
        window.abortAnimation = false;
        
        toggleButtons(false);
        highlightCodeLine(-1);
        
        // Re-enable GSAP playback
        gsap.globalTimeline.play();
        document.getElementById('btn-play-pause').innerText = '⏸';
        document.getElementById('btn-play-pause').title = 'Pause Animation (Manual Mode)';
        document.getElementById('btn-step').disabled = true;
        const btnStepBack = document.getElementById('btn-step-back');
        if (btnStepBack) btnStepBack.disabled = true;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (managers[currentTopic]) managers[currentTopic].clear();
        
        currentTopic = btn.dataset.topic;
        
        document.querySelectorAll('.controls-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`controls-${currentTopic}`).classList.add('active');
        
        const data = topicData[currentTopic];
        document.getElementById('topic-title').innerText = data.title;
        document.getElementById('topic-title').style.color = '#' + data.color.toString(16).padStart(6, '0');
        document.getElementById('topic-desc').innerText = data.desc;
        
        // Update Cheatsheet
        document.getElementById('topic-analogy').innerText = data.analogy;
        document.getElementById('o-access').innerText = data.complexities.access;
        document.getElementById('o-search').innerText = data.complexities.search;
        document.getElementById('o-insert').innerText = data.complexities.insert;
        document.getElementById('o-delete').innerText = data.complexities.delete;
        document.getElementById('o-space').innerText = data.complexities.space;
        
        sm.setTheme(data.color);
        managers[currentTopic].init();
    });
});

// Speed Slider Logic
document.getElementById('speed-slider').addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    document.getElementById('speed-val').innerText = speed.toFixed(1) + 'x';
    gsap.globalTimeline.timeScale(speed);
});

function queueAction(action) {
    if (isAnimating) return;
    window.actionHistory.push(action);
    runAction(action);
}

async function runAction(action) {
    if (isAnimating) return;
    toggleButtons(true);
    window.abortAnimation = false;
    const currentReplayId = ++replayId;
    
    try {
        await action();
    } catch (e) {
        if (currentReplayId !== replayId) return; // Silent exit if superseded
        if (e.message !== "Aborted") console.error("Animation/Action Error:", e);
    } finally {
        if (currentReplayId === replayId) {
            toggleButtons(false);
            highlightCodeLine(-1);
            
            if (window.stepResolve) {
                const resolve = window.stepResolve;
                window.stepResolve = null;
                resolve();
            }
            document.getElementById('btn-step').disabled = true;
        }
    }
}

async function replayHistory() {
    const currentReplayId = ++replayId;
    window.isFastForwarding = true;
    
    managers[currentTopic].clear();
    managers[currentTopic].init();
    
    for (let i = 0; i < window.actionHistory.length; i++) {
        try {
            await window.actionHistory[i]();
        } catch (e) {
            if (currentReplayId !== replayId) return;
            if (e.message !== "Aborted") console.error(e);
        }
        if (currentReplayId !== replayId) return;
    }
    
    if (currentReplayId !== replayId) return;
    
    toggleButtons(false);
    highlightCodeLine(-1);
    document.getElementById('btn-step').disabled = true;
}

// Media Controls (Play / Pause / Step / Restart)
document.getElementById('btn-play-pause').addEventListener('click', () => {
    window.manualMode = !window.manualMode;
    const playPauseBtn = document.getElementById('btn-play-pause');
    const stepBtn = document.getElementById('btn-step');
    
    if (window.manualMode) {
        gsap.globalTimeline.pause();
        playPauseBtn.innerText = '▶️';
        playPauseBtn.title = 'Play Animation (Auto Mode)';
        if (isAnimating) stepBtn.disabled = false;
    } else {
        gsap.globalTimeline.play();
        playPauseBtn.innerText = '⏸';
        playPauseBtn.title = 'Pause Animation (Manual Mode)';
        stepBtn.disabled = true;
    }
});

document.getElementById('btn-step').addEventListener('click', () => {
    if (window.manualMode) {
        document.getElementById('btn-step').disabled = true;
        gsap.globalTimeline.play();
    }
});

document.getElementById('btn-step-back').addEventListener('click', () => {
    let baseTarget = window.isFastForwarding ? window.globalTargetStep : window.globalCurrentStep;
    if (baseTarget <= 1) return;
    
    window.globalTargetStep = baseTarget - 1;
    window.abortAnimation = true;
    if (window.currentDelayReject) window.currentDelayReject(new Error("Aborted"));
    
    gsap.globalTimeline.clear();
    
    window.abortAnimation = false;
    window.globalCurrentStep = 0;
    
    document.getElementById('btn-play-pause').innerText = '▶️';
    document.getElementById('btn-play-pause').title = 'Play Animation (Auto Mode)';
    
    replayHistory();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    window.abortAnimation = true;
    if (window.currentDelayReject) window.currentDelayReject(new Error("Aborted"));
    gsap.globalTimeline.clear();
    
    replayId++;
    
    window.actionHistory = [];
    window.globalCurrentStep = 0;
    window.manualMode = false;
    
    document.getElementById('btn-play-pause').innerText = '⏸';
    document.getElementById('btn-play-pause').title = 'Pause Animation (Manual Mode)';
    document.getElementById('btn-step').disabled = true;
    document.getElementById('btn-step-back').disabled = true;
    
    gsap.globalTimeline.play();
    
    isAnimating = false;
    toggleButtons(false);
    highlightCodeLine(-1);
    logAction("History cleared and topic restarted.");
    
    managers[currentTopic].clear();
    managers[currentTopic].init();
});

// Bindings: Phase 1
document.getElementById('arr-btn-push').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.array.push(v)); });
document.getElementById('arr-btn-pop').addEventListener('click', () => queueAction(() => managers.array.pop()));
document.getElementById('arr-btn-insert').addEventListener('click', () => { const i = parseInt(document.getElementById('arr-insert-idx').value)||0; const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.array.insert(i, v)); });
document.getElementById('arr-btn-delete').addEventListener('click', () => { const i = parseInt(document.getElementById('arr-delete-idx').value)||0; queueAction(() => managers.array.delete(i)); });
document.getElementById('arr-btn-traverse').addEventListener('click', () => queueAction(() => managers.array.traverse()));
document.getElementById('arr-btn-bubblesort').addEventListener('click', () => queueAction(() => managers.array.bubbleSort()));
document.getElementById('arr-btn-binarysearch').addEventListener('click', () => { const v = parseInt(document.getElementById('arr-bs-val').value)||42; queueAction(() => managers.array.binarySearch(v)); });

document.getElementById('ll-btn-append').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.linkedlist.append(v)); });
document.getElementById('ll-btn-prepend').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.linkedlist.prepend(v)); });
document.getElementById('ll-btn-insert').addEventListener('click', () => { const i = parseInt(document.getElementById('ll-insert-idx').value)||0; const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.linkedlist.insert(i, v)); });
document.getElementById('ll-btn-delete').addEventListener('click', () => { const i = parseInt(document.getElementById('ll-delete-idx').value)||0; queueAction(() => managers.linkedlist.delete(i)); });
document.getElementById('ll-btn-traverse').addEventListener('click', () => queueAction(() => managers.linkedlist.traverse()));
document.getElementById('ll-btn-reverse').addEventListener('click', () => queueAction(() => managers.linkedlist.reverse()));

document.getElementById('stack-btn-push').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.stack.push(v)); });
document.getElementById('stack-btn-pop').addEventListener('click', () => queueAction(() => managers.stack.pop()));
document.getElementById('stack-btn-peek').addEventListener('click', () => queueAction(() => managers.stack.peek()));
document.getElementById('stack-btn-validparen').addEventListener('click', () => { const v = document.getElementById('stack-input-paren').value; queueAction(() => managers.stack.validateParentheses(v)); });

document.getElementById('queue-btn-enqueue').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.queue.enqueue(v)); });
document.getElementById('queue-btn-dequeue').addEventListener('click', () => queueAction(() => managers.queue.dequeue()));
document.getElementById('queue-btn-peek').addEventListener('click', () => queueAction(() => managers.queue.peek()));
document.getElementById('queue-btn-roundrobin').addEventListener('click', () => queueAction(() => managers.queue.roundRobin()));

document.getElementById('dll-btn-append').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.dll.append(v)); });
document.getElementById('dll-btn-prepend').addEventListener('click', () => { const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.dll.prepend(v)); });
document.getElementById('dll-btn-insert').addEventListener('click', () => { const i = parseInt(document.getElementById('dll-insert-idx').value)||0; const v = Math.floor(Math.random()*99)+1; queueAction(() => managers.dll.insert(i, v)); });
document.getElementById('dll-btn-delete').addEventListener('click', () => { const i = parseInt(document.getElementById('dll-delete-idx').value)||0; queueAction(() => managers.dll.delete(i)); });
document.getElementById('dll-btn-lru').addEventListener('click', () => { const i = parseInt(document.getElementById('dll-lru-idx').value)||0; queueAction(() => managers.dll.accessLRU(i)); });

// Bindings: Phase 2
document.getElementById('bst-btn-insert').addEventListener('click', () => { const v = parseInt(document.getElementById('bst-input-val').value)||50; queueAction(() => managers.bst.insert(v)); });
document.getElementById('bst-btn-search').addEventListener('click', () => { const v = parseInt(document.getElementById('bst-input-val').value)||50; queueAction(() => managers.bst.search(v)); });
document.getElementById('bst-btn-inorder').addEventListener('click', () => queueAction(() => managers.bst.inorderTraversal()));

// Bindings: Phase 3
document.getElementById('heap-btn-insert').addEventListener('click', () => { const v = parseInt(document.getElementById('heap-input-val').value)||50; queueAction(() => managers.heap.insert(v)); });
document.getElementById('heap-btn-extract').addEventListener('click', () => queueAction(() => managers.heap.extractMax()));
document.getElementById('heap-btn-sort').addEventListener('click', () => queueAction(() => managers.heap.heapSort()));

document.getElementById('ht-btn-insert').addEventListener('click', () => { const k = document.getElementById('ht-input-key').value; const v = document.getElementById('ht-input-val').value; queueAction(() => managers.hashtable.put(k, v)); });
document.getElementById('ht-btn-search').addEventListener('click', () => { const k = document.getElementById('ht-input-key').value; queueAction(() => managers.hashtable.get(k)); });
document.getElementById('ht-btn-twosum').addEventListener('click', () => { const t = parseInt(document.getElementById('ht-twosum-target').value)||100; queueAction(() => managers.hashtable.twoSum(t)); });

document.getElementById('graph-btn-addnode').addEventListener('click', () => { const v = document.getElementById('graph-input-node').value; queueAction(() => managers.graph.addNode(v)); });
document.getElementById('graph-btn-addedge').addEventListener('click', () => { const u = document.getElementById('graph-input-edge1').value; const v = document.getElementById('graph-input-edge2').value; queueAction(() => managers.graph.addEdge(u, v)); });
document.getElementById('graph-btn-bfs').addEventListener('click', () => queueAction(() => managers.graph.bfs()));

document.getElementById('trie-btn-insert').addEventListener('click', () => { const w = document.getElementById('trie-input-word').value; queueAction(() => managers.trie.insert(w)); });
document.getElementById('trie-btn-search').addEventListener('click', () => { const w = document.getElementById('trie-input-word').value; queueAction(() => managers.trie.search(w)); });
document.getElementById('trie-btn-autocomplete').addEventListener('click', () => { const p = document.getElementById('trie-auto-prefix').value; queueAction(() => managers.trie.autocomplete(p)); });

document.getElementById('matrix-btn-update').addEventListener('click', () => { const r = parseInt(document.getElementById('matrix-input-r').value); const c = parseInt(document.getElementById('matrix-input-c').value); const v = parseInt(document.getElementById('matrix-input-v').value); queueAction(() => managers.matrix.updateCell(r, c, v)); });
document.getElementById('matrix-btn-traverse').addEventListener('click', () => queueAction(() => managers.matrix.traverseDFS()));
document.getElementById('matrix-btn-bfs').addEventListener('click', () => queueAction(() => managers.matrix.bfsShortestPath()));

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    sm.update();
    managers[currentTopic].update();
    sm.render();
}

// Boot
managers.array.init();
animate();
