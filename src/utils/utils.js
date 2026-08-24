import * as THREE from 'three';
import gsap from 'gsap';

export function delay(ms) {
    return new Promise((resolve, reject) => {
        window.currentDelayReject = reject;
        
        if (window.abortAnimation) {
            reject(new Error("Aborted"));
            return;
        }

        window.globalCurrentStep++;
        const stepBackBtn = document.getElementById('btn-step-back');
        if (stepBackBtn) stepBackBtn.disabled = window.globalCurrentStep <= 1;

        if (window.isFastForwarding) {
            if (window.globalCurrentStep >= window.globalTargetStep) {
                window.isFastForwarding = false;
                window.manualMode = true;
                gsap.globalTimeline.pause();
                
                const btn = document.getElementById('btn-step');
                if (btn) btn.disabled = false;
                
                const playBtn = document.getElementById('btn-play-pause');
                if (playBtn) {
                    playBtn.innerText = '▶️';
                    playBtn.title = 'Play Animation (Auto Mode)';
                }
                
                resolve();
                return;
            } else {
                resolve();
                return;
            }
        }

        gsap.delayedCall(ms / 1000, () => {
            if (window.abortAnimation) {
                reject(new Error("Aborted"));
                return;
            }
            
            if (window.manualMode) {
                gsap.globalTimeline.pause();
                const btn = document.getElementById('btn-step');
                if (btn) btn.disabled = false;
                window.stepResolve = resolve; // Wait for user to click Step or Play
            } else {
                resolve();
            }
        });
    });
}


export const Materials = {
    getGlass(colorHex = 0x3b82f6) {
        const color = new THREE.Color(colorHex);
        const hsl = {};
        color.getHSL(hsl);
        color.setHSL(hsl.h, 0.85, 0.55); // Force perfectly vibrant matte color
        return new THREE.MeshStandardMaterial({
            color: color, 
            roughness: 0.15, 
            metalness: 0.1,
        });
    },
    getHighlight(colorHex = 0x60a5fa, emissiveHex = 0x3b82f6) {
        const color = new THREE.Color(colorHex);
        const hsl = {};
        color.getHSL(hsl);
        color.setHSL(hsl.h, 1.0, 0.75); // Lighter and highly saturated for highlight
        return new THREE.MeshStandardMaterial({
            color: color, 
            emissive: color, 
            emissiveIntensity: 0.6, 
            roughness: 0.15, 
            metalness: 0.1
        });
    }
};

export function createHtmlLabel(val, idxText, colorHex) {
    const el = document.createElement('div');
    el.className = 'dsa-label';
    el.innerHTML = `<div class="dsa-val">${val}</div><div class="dsa-idx" style="color: ${colorHex}; border-color: ${colorHex};">${idxText}</div>`;
    el.style.top = '0px';
    el.style.left = '0px';
    document.getElementById('labels-container').appendChild(el);
    return el;
}

export function updateLabels(items, camera) {
    items.forEach((item) => {
        if (!item.htmlEl) return;
        
        const vector = new THREE.Vector3();
        item.mesh.getWorldPosition(vector);
        
        // Calculate true 3D perspective scale
        const dist = camera.position.distanceTo(vector);
        const scale = Math.max(0.2, 33.5 / dist); // 33.5 is the default viewing distance

        vector.project(camera);

        const x = (vector.x * .5 + .5) * window.innerWidth;
        const y = (vector.y * -.5 + .5) * window.innerHeight;

        // Apply scale alongside position to prevent overlapping
        item.htmlEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0) scale(${scale})`;
        item.htmlEl.style.opacity = vector.z > 1 ? 0 : 1;
    });
}
