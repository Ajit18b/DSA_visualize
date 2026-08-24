import * as THREE from 'three';

export class PointerArrow {
    constructor(scene, color = 0xa855f7) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.mat = new THREE.MeshBasicMaterial({ color });
        
        // Shaft
        this.shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        this.shaftGeo.translate(0, 0.5, 0);
        this.shaftGeo.rotateX(Math.PI / 2);
        this.shaft = new THREE.Mesh(this.shaftGeo, this.mat);
        this.group.add(this.shaft);

        // Head
        this.headGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
        this.headGeo.translate(0, -0.4, 0);
        this.headGeo.rotateX(-Math.PI / 2);
        this.head = new THREE.Mesh(this.headGeo, this.mat);
        this.group.add(this.head);
        
        this.scene.add(this.group);
    }

    update(startPos, endPos, progress = 1.0) {
        if (progress === 0) {
            this.group.visible = false;
            return;
        }
        this.group.visible = true;
        
        const currentEnd = new THREE.Vector3().lerpVectors(startPos, endPos, progress);
        const dir = new THREE.Vector3().subVectors(currentEnd, startPos).normalize();
        const dist = startPos.distanceTo(currentEnd);
        
        if (dist < 3) { this.group.visible = false; return; }

        const offsetStart = startPos.clone().add(dir.clone().multiplyScalar(1.5));
        const offsetEnd = currentEnd.clone().sub(dir.clone().multiplyScalar(1.5));
        const drawDist = offsetStart.distanceTo(offsetEnd);

        if (drawDist > 0.8) {
            this.group.position.copy(offsetStart);
            this.group.lookAt(offsetEnd);
            this.shaft.scale.set(1, 1, drawDist - 0.8);
            this.head.position.set(0, 0, drawDist);
            this.head.visible = true;
        } else {
            this.head.visible = false;
        }
    }

    destroy() {
        this.scene.remove(this.group);
        this.shaftGeo.dispose();
        this.headGeo.dispose();
        this.mat.dispose();
    }
}
