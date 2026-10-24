// ========================================================
// 3D TRAFİK POLİSİ KOVALAMACASI - CANLI ONLİNE MULTIPLAYER
// ========================================================

const canvas = document.getElementById('gameCanvas');
const minimapCanvas = document.getElementById('minimapCanvas');
const miniCtx = minimapCanvas.getContext('2d');

// Eski veya mobil tarayıcılar için roundRect desteği
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h) {
        this.rect(x, y, w, h);
    };
}

// --- SES MOTORU (Web Audio API) ---
class SoundFX {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.engineOsc = null;
        this.engineGain = null;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenInterval = null;
        this.sirenTone = 650;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.startEngineSound();
        }
    }

    startEngineSound() {
        if (!this.ctx || this.engineOsc) return;
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = 'triangle';
        this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

        this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
    }

    updateEngine(speed, maxSpeed) {
        if (!this.ctx || !this.engineOsc || this.muted) return;
        const normalized = Math.min(Math.abs(speed) / maxSpeed, 1);
        const targetFreq = 48 + normalized * 140;
        this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
        this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.03 + normalized * 0.05, this.ctx.currentTime, 0.1);
    }

    playSiren(active) {
        if (!this.ctx) return;
        if (active && !this.sirenOsc && !this.muted) {
            this.sirenOsc = this.ctx.createOscillator();
            this.sirenGain = this.ctx.createGain();
            this.sirenOsc.type = 'sawtooth';
            this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);
            this.sirenGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

            this.sirenOsc.connect(this.sirenGain);
            this.sirenGain.connect(this.ctx.destination);
            this.sirenOsc.start();

            this.sirenInterval = setInterval(() => {
                if (!this.sirenOsc || this.muted) return;
                this.sirenTone = this.sirenTone === 650 ? 880 : 650;
                this.sirenOsc.frequency.setTargetAtTime(this.sirenTone, this.ctx.currentTime, 0.15);
            }, 320);
        } else if (!active && this.sirenOsc) {
            clearInterval(this.sirenInterval);
            this.sirenOsc.stop();
            this.sirenOsc.disconnect();
            this.sirenOsc = null;
        }
    }

    playCrash() {
        if (!this.ctx || this.muted) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        whiteNoise.start();
    }

    playCoin() {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime);
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.32);
    }

    playBlinker() {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.035);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
    }

    // 📢 Gerçekçi Korna Sesi (Dual Tone: 440Hz + 554Hz)
    playHorn() {
        if (!this.ctx || this.muted) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(430, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(540, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.5);
        osc2.stop(this.ctx.currentTime + 0.5);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted && this.sirenOsc) this.playSiren(false);
        if (this.engineGain) this.engineGain.gain.setValueAtTime(this.muted ? 0 : 0.03, this.ctx ? this.ctx.currentTime : 0);
        return !this.muted;
    }
}

const audio = new SoundFX();

// ========================================================
// 3D DÜNYA VE ŞEHİR HARİTASI
// ========================================================
const WORLD_SIZE = 2600;
const ROAD_WIDTH = 48;
const BLOCK_SIZE = 180;

class City3D {
    constructor(scene) {
        this.scene = scene;
        this.roads = [];
        this.colliders = [];
        this.generateCity();
    }

    generateCity() {
        // Zemin
        const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 1.5, WORLD_SIZE * 1.5);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.95 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Izgara Yollar - 0 noktasından simetrik başlar (Böylece 0,0 noktası devasa bir kavşak ve meydan olur!)
        const halfSize = WORLD_SIZE / 2;
        const step = BLOCK_SIZE + ROAD_WIDTH;
        const maxIndex = Math.floor(halfSize / step);

        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.8 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5c542 });

        for (let i = -maxIndex; i <= maxIndex; i++) {
            const coord = i * step; // i = 0 tam merkez (0,0) yolu!

            // Dikey Yol
            const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, WORLD_SIZE), roadMat);
            vRoad.rotation.x = -Math.PI / 2;
            vRoad.position.set(coord, 0.02, 0);
            vRoad.receiveShadow = true;
            this.scene.add(vRoad);

            this.roads.push({
                x1: coord - ROAD_WIDTH / 2,
                x2: coord + ROAD_WIDTH / 2,
                z1: -WORLD_SIZE / 2,
                z2: WORLD_SIZE / 2
            });

            for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z += 16) {
                const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8), lineMat);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.set(coord, 0.04, z);
                this.scene.add(stripe);
            }

            // Yatay Yol
            const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, ROAD_WIDTH), roadMat);
            hRoad.rotation.x = -Math.PI / 2;
            hRoad.position.set(0, 0.02, coord);
            hRoad.receiveShadow = true;
            this.scene.add(hRoad);

            this.roads.push({
                x1: -WORLD_SIZE / 2,
                x2: WORLD_SIZE / 2,
                z1: coord - ROAD_WIDTH / 2,
                z2: coord + ROAD_WIDTH / 2
            });

            for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x += 16) {
                const stripe = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), lineMat);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.set(x, 0.04, coord);
                this.scene.add(stripe);
            }
        }

        // MERKEZ TOPLANMA MEYDANI (Spawn Alanı: 0,0 noktası genişletilmiş asfalt meydan)
        const plazaSize = 80;
        const plaza = new THREE.Mesh(new THREE.PlaneGeometry(plazaSize, plazaSize), roadMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.set(0, 0.025, 0);
        plaza.receiveShadow = true;
        this.scene.add(plaza);

        this.roads.push({
            x1: -plazaSize / 2,
            x2: plazaSize / 2,
            z1: -plazaSize / 2,
            z2: plazaSize / 2
        });

        // 3D Binalar (Ada Blokları - Merkez meydana asla bina koyma!)
        const buildingColors = [0x1f2738, 0x161d2d, 0x253147, 0x1c2436];
        const windowColors = [0xffdd66, 0x00f0ff, 0x55ffaa];

        for (let i = -maxIndex; i < maxIndex; i++) {
            for (let j = -maxIndex; j < maxIndex; j++) {
                const x = i * step + step / 2;
                const z = j * step + step / 2;

                // Merkez meydan çevresinde boş alan bırak (Spawn güvenliği)
                if (Math.abs(x) < step && Math.abs(z) < step) continue;

                const bw = BLOCK_SIZE - 20;
                const bd = BLOCK_SIZE - 20;
                const bh = 30 + Math.random() * 80;

                const bMat = new THREE.MeshStandardMaterial({
                    color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                    roughness: 0.6,
                    metalness: 0.2
                });

                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
                bMesh.position.set(x, bh / 2, z);
                bMesh.castShadow = true;
                bMesh.receiveShadow = true;
                this.scene.add(bMesh);

                const glowMat = new THREE.MeshBasicMaterial({
                    color: windowColors[Math.floor(Math.random() * windowColors.length)]
                });
                for (let k = 0; k < 4; k++) {
                    const strip = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 1.5, bd + 0.2), glowMat);
                    strip.position.set(x, 10 + k * 16, z);
                    this.scene.add(strip);
                }

                this.colliders.push({
                    x1: x - bw / 2,
                    x2: x + bw / 2,
                    z1: z - bd / 2,
                    z2: z + bd / 2
                });
            }
        }

        // Dış Sınır Duvarları
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.5 });
        const wallThickness = 15;
        const wallHeight = 25;

        const northWall = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE + 50, wallHeight, wallThickness), wallMat);
        northWall.position.set(0, wallHeight / 2, halfSize + 15);
        this.scene.add(northWall);
        this.colliders.push({ x1: -WORLD_SIZE, x2: WORLD_SIZE, z1: halfSize + 5, z2: halfSize + 25 });

        const southWall = new THREE.Mesh(new THREE.BoxGeometry(WORLD_SIZE + 50, wallHeight, wallThickness), wallMat);
        southWall.position.set(0, wallHeight / 2, -halfSize - 15);
        this.scene.add(southWall);
        this.colliders.push({ x1: -WORLD_SIZE, x2: WORLD_SIZE, z1: -halfSize - 25, z2: -halfSize - 5 });

        const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, WORLD_SIZE + 50), wallMat);
        eastWall.position.set(halfSize + 15, wallHeight / 2, 0);
        this.scene.add(eastWall);
        this.colliders.push({ x1: halfSize + 5, x2: halfSize + 25, z1: -WORLD_SIZE, z2: WORLD_SIZE });

        const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, WORLD_SIZE + 50), wallMat);
        westWall.position.set(-halfSize - 15, wallHeight / 2, 0);
        this.scene.add(westWall);
        this.colliders.push({ x1: -halfSize - 25, x2: -halfSize - 5, z1: -WORLD_SIZE, z2: WORLD_SIZE });
    }

    isOnRoad(x, z) {
        for (const road of this.roads) {
            if (x >= road.x1 && x <= road.x2 && z >= road.z1 && z <= road.z2) return true;
        }
        return false;
    }

    checkCollision(x, z, radius) {
        for (const c of this.colliders) {
            const closestX = Math.max(c.x1, Math.min(x, c.x2));
            const closestZ = Math.max(c.z1, Math.min(z, c.z2));

            const dx = x - closestX;
            const dz = z - closestZ;
            if (dx * dx + dz * dz < radius * radius) {
                return { collided: true, normalX: dx, normalZ: dz };
            }
        }
        return { collided: false };
    }
}

// ========================================================
// 3D OYUNCU ARABASI
// ========================================================
class PlayerCar3D {
    constructor(scene, color = 0xffbb00) {
        this.scene = scene;
        this.color = color;
        this.mesh = new THREE.Group();
        this.wheels = [];

        this.x = 0;
        this.z = 0;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 1.6;
        this.acceleration = 0.038;
        this.friction = 0.975;
        this.turnSpeed = 0.048;

        this.health = 100;
        this.isBroken = false;
        this.invulnerableTimer = 0; // Çarpışma hasar koruma süresi (anında ölmemek için)
        this.spawnGraceTimer = 300; // Başlangıç koruma süresi (~5 saniye ceza yok)

        this.signal = 0;
        this.signalTimer = 0;
        this.signalBlinkState = false;
        this.signalCooldown = 0;

        this.offRoadFrames = 0;
        this.turnAngleAccumulator = 0;
        this.lastAngle = 0;
        this.isDrifting = false;

        this.buildCarModel();
        this.scene.add(this.mesh);
    }

    buildCarModel() {
        // Gövde
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.3,
            metalness: 0.7
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 2.2), bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        this.mesh.add(body);

        // Kabin
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.1, metalness: 0.9 });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.8), cabinMat);
        cabin.position.set(-0.2, 1.5, 0);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        // Spoiler
        const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 2.2), spoilerMat);
        spoilerWing.position.set(-2.0, 1.55, 0);
        this.mesh.add(spoilerWing);

        // Tekerlekler
        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

        const wheelPositions = [
            { x: 1.4, y: 0.5, z: 1.15 }, { x: 1.4, y: 0.5, z: -1.15 },
            { x: -1.4, y: 0.5, z: 1.15 }, { x: -1.4, y: 0.5, z: -1.15 }
        ];

        for (const pos of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
            this.wheels.push(wheel);
        }

        // Farlar
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const headL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), lightMat);
        headL.position.set(2.21, 0.8, 0.75);
        this.mesh.add(headL);

        const headR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.4), lightMat);
        headR.position.set(2.21, 0.8, -0.75);
        this.mesh.add(headR);

        this.spotLight = new THREE.SpotLight(0xffffff, 2.5, 55, Math.PI / 6, 0.4);
        this.spotLight.position.set(2.3, 0.8, 0);
        this.spotLightTarget = new THREE.Object3D();
        this.spotLightTarget.position.set(15, 0, 0);
        this.mesh.add(this.spotLightTarget);
        this.spotLight.target = this.spotLightTarget;
        this.mesh.add(this.spotLight);

        // Stop Lambaları
        const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
        const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), tailMat);
        tailL.position.set(-2.21, 0.8, 0.75);
        this.mesh.add(tailL);

        const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), tailMat);
        tailR.position.set(-2.21, 0.8, -0.75);
        this.mesh.add(tailR);

        // Sinyal Lambaları
        this.signalMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
        this.activeSignalMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });

        this.sigFrontL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigFrontL.position.set(2.21, 0.8, 1.05);
        this.mesh.add(this.sigFrontL);

        this.sigRearL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigRearL.position.set(-2.21, 0.8, 1.05);
        this.mesh.add(this.sigRearL);

        this.sigFrontR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigFrontR.position.set(2.21, 0.8, -1.05);
        this.mesh.add(this.sigFrontR);

        this.sigRearR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigRearR.position.set(-2.21, 0.8, -1.05);
        this.mesh.add(this.sigRearR);
    }

    update(keys, city3D, particleSystem) {
        if (this.isBroken) return;

        if (keys.up) {
            this.speed += this.acceleration;
        } else if (keys.down) {
            this.speed -= this.acceleration * 0.7;
        } else {
            this.speed *= this.friction;
        }

        const healthFactor = Math.max(0.35, this.health / 100);
        const curMaxSpeed = this.maxSpeed * healthFactor;

        if (this.speed > curMaxSpeed) this.speed = curMaxSpeed;
        if (this.speed < -curMaxSpeed * 0.4) this.speed = -curMaxSpeed * 0.4;
        if (Math.abs(this.speed) < 0.005) this.speed = 0;

        let turningDir = 0;
        if (Math.abs(this.speed) > 0.02) {
            const dir = this.speed >= 0 ? 1 : -1;
            if (keys.left) {
                this.angle += this.turnSpeed * dir;
                turningDir = -1;
            }
            if (keys.right) {
                this.angle -= this.turnSpeed * dir;
                turningDir = 1;
            }
        }

        // Drift Kontrolü
        this.isDrifting = keys.space && Math.abs(this.speed) > 0.25;
        if (this.isDrifting) {
            this.speed *= 0.98; // Yumuşak ve kontrollü drift
            particleSystem.emitSmoke(this.x, 0.4, this.z, 0xaaaaaa, 0.8);
        }

        const lastX = this.x;
        const lastZ = this.z;
        this.x += Math.cos(this.angle) * this.speed;
        this.z -= Math.sin(this.angle) * this.speed;

        for (const w of this.wheels) {
            w.rotation.z += this.speed * 0.8;
        }

        this.mesh.position.set(this.x, 0, this.z);
        this.mesh.rotation.y = this.angle;

        const tilt = (keys.left ? -0.06 : (keys.right ? 0.06 : 0)) * Math.min(1, Math.abs(this.speed));
        this.mesh.rotation.x = tilt;

        // Sinyal Mantığı
        if (this.signal !== 0) {
            this.signalTimer++;
            if (this.signalTimer % 20 === 0) {
                this.signalBlinkState = !this.signalBlinkState;
                if (this.signalBlinkState) audio.playBlinker();
            }
        } else {
            this.signalBlinkState = false;
        }

        const leftMat = (this.signal === -1 && this.signalBlinkState) ? this.activeSignalMat : this.signalMat;
        const rightMat = (this.signal === 1 && this.signalBlinkState) ? this.activeSignalMat : this.signalMat;

        this.sigFrontL.material = leftMat;
        this.sigRearL.material = leftMat;
        this.sigFrontR.material = rightMat;
        this.sigRearR.material = rightMat;

        // Hasar koruma süresi geri sayımı
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Duvar Çarpışması
        const collision = city3D.checkCollision(this.x, this.z, 2.2);
        if (collision.collided) {
            this.x = lastX;
            this.z = lastZ;
            this.mesh.position.set(this.x, 0, this.z);

            const impactSpeed = Math.abs(this.speed);
            this.speed = -this.speed * 0.35;

            // Anında ölmemek ve ardışık hasar almamak için koruma
            if (impactSpeed > 0.2 && this.invulnerableTimer === 0) {
                audio.playCrash();
                particleSystem.emitSparks(this.x, 1.2, this.z);
                const dmg = Math.min(22, Math.round(impactSpeed * 20)); // Maksimum 22 hasar
                this.takeDamage(dmg);
                this.invulnerableTimer = 35; // 0.6 saniye hasar koruması
            }
        }

        if (this.health < 65) {
            const smokeCol = this.health < 35 ? 0x222222 : 0xcccccc;
            particleSystem.emitSmoke(this.x, 1.4, this.z, smokeCol, this.health < 35 ? 1.4 : 0.8);
        }

        audio.updateEngine(this.speed, this.maxSpeed);

        return this.evaluateRules(city3D, turningDir, keys);
    }

    evaluateRules(city3D, turningDir, keys) {
        // 1. Başlangıç / Spawn Koruma Süresi (İlk 5 saniye ceza yok!)
        if (this.spawnGraceTimer > 0) {
            this.spawnGraceTimer--;
            this.turnAngleAccumulator = 0;
            return null;
        }

        if (this.signalCooldown > 0) {
            this.signalCooldown--;
        }

        let infraction = null;

        // 2. Şerit / Yoldan Çıkma Kontrolü
        const onRoad = city3D.isOnRoad(this.x, this.z);
        if (!onRoad && Math.abs(this.speed) > 0.25) {
            this.offRoadFrames++;
            if (this.offRoadFrames > 60) { // 1 saniyeden fazla yoldan çıkarsa
                infraction = { type: 'LANE', message: '⚠️ ŞERİT İHLALİ! YOLDAN ÇIKTIN!' };
                this.offRoadFrames = 0;
            }
        } else {
            this.offRoadFrames = Math.max(0, this.offRoadFrames - 2);
        }

        // 3. Yanlama (Drift) Sırasında Sinyal Aranmaz!
        if (this.isDrifting || keys.space) {
            this.turnAngleAccumulator = 0;
            return infraction;
        }

        // 4. Gerçek Kavşak Dönüşü Kontrolü (Hafif şerit düzeltmelerinde ceza yok!)
        if (turningDir !== 0 && Math.abs(this.speed) > 0.35) {
            this.turnAngleAccumulator += this.turnSpeed;

            // En az ~50 derece (0.85 radyan) sert dönüş yapılmış olmalı
            if (this.turnAngleAccumulator > 0.85 && this.signalCooldown === 0) {
                if (turningDir === -1 && this.signal !== -1) {
                    infraction = { type: 'SIGNAL', message: '⚠️ SİNYALSİZ DÖNÜŞ! (SOL SİNYAL GEREKLİYDİ)' };
                    this.signalCooldown = 220; // 3.5 saniye tekrar uyarma
                    this.turnAngleAccumulator = 0;
                } else if (turningDir === 1 && this.signal !== 1) {
                    infraction = { type: 'SIGNAL', message: '⚠️ SİNYALSİZ DÖNÜŞ! (SAĞ SİNYAL GEREKLİYDİ)' };
                    this.signalCooldown = 220;
                    this.turnAngleAccumulator = 0;
                }
            }
        } else {
            this.turnAngleAccumulator = Math.max(0, this.turnAngleAccumulator - 0.04);
        }

        return infraction;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.isBroken = true;
            this.speed = 0;
        }
    }
}

// ========================================================
// DİĞER ONLİNE OYUNCULAR (3D Diğer Arabalar & İsim Etiketi)
// ========================================================
class OtherPlayer3D {
    constructor(scene, id, name, color = 0x00f0ff) {
        this.scene = scene;
        this.id = id;
        this.name = name;
        this.color = color;
        this.mesh = new THREE.Group();
        this.wheels = [];
        this.lastSeen = Date.now();

        this.targetX = 0;
        this.targetZ = 0;
        this.targetAngle = 0;
        this.speed = 0;

        this.buildModel();
        this.createNametag(name);
        this.scene.add(this.mesh);
    }

    createNametag(name) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.roundRect(10, 8, 236, 48, 12);
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 22px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 128, 32);

        const texture = new THREE.CanvasTexture(c);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        this.nametag = new THREE.Sprite(spriteMat);
        this.nametag.scale.set(6, 1.5, 1);
        this.nametag.position.set(0, 3.2, 0);
        this.mesh.add(this.nametag);
    }

    buildModel() {
        const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.3, metalness: 0.7 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 2.2), bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        this.mesh.add(body);

        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x101522, roughness: 0.1 });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.8), cabinMat);
        cabin.position.set(-0.2, 1.5, 0);
        this.mesh.add(cabin);

        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

        const wheelPositions = [
            { x: 1.4, y: 0.5, z: 1.15 }, { x: 1.4, y: 0.5, z: -1.15 },
            { x: -1.4, y: 0.5, z: 1.15 }, { x: -1.4, y: 0.5, z: -1.15 }
        ];

        for (const pos of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(wheel);
            this.wheels.push(wheel);
        }

        // Sinyaller
        this.signalMat = new THREE.MeshBasicMaterial({ color: 0x332200 });
        this.activeSignalMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });

        this.sigFrontL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigFrontL.position.set(2.21, 0.8, 1.05);
        this.mesh.add(this.sigFrontL);

        this.sigRearL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigRearL.position.set(-2.21, 0.8, 1.05);
        this.mesh.add(this.sigRearL);

        this.sigFrontR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigFrontR.position.set(2.21, 0.8, -1.05);
        this.mesh.add(this.sigFrontR);

        this.sigRearR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.25), this.signalMat);
        this.sigRearR.position.set(-2.21, 0.8, -1.05);
        this.mesh.add(this.sigRearR);
    }

    updateData(data) {
        this.lastSeen = Date.now();
        this.targetX = data.x;
        this.targetZ = data.z;
        this.targetAngle = data.angle;
        this.speed = data.speed;

        const leftMat = (data.signal === -1 && data.signalBlink) ? this.activeSignalMat : this.signalMat;
        const rightMat = (data.signal === 1 && data.signalBlink) ? this.activeSignalMat : this.signalMat;
        this.sigFrontL.material = leftMat;
        this.sigRearL.material = leftMat;
        this.sigFrontR.material = rightMat;
        this.sigRearR.material = rightMat;
    }

    interpolate() {
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * 0.25;
        this.mesh.position.z += (this.targetZ - this.mesh.position.z) * 0.25;

        let diff = this.targetAngle - this.mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.mesh.rotation.y += diff * 0.25;

        for (const w of this.wheels) {
            w.rotation.z += this.speed * 0.8;
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

// ========================================================
// 3D POLİS ARABASI
// ========================================================
class PoliceCar3D {
    constructor(scene, x, z) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.wheels = [];

        this.x = x;
        this.z = z;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 1.88; // Oyuncudan (1.6) daha hızlı takip eder

        this.sirenTimer = 0;
        this.sirenColor = 'blue';

        this.buildPoliceModel();
        this.scene.add(this.mesh);
    }

    buildPoliceModel() {
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.4 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.3 });

        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 2.3), blackMat);
        mainBody.position.y = 0.8;
        mainBody.castShadow = true;
        this.mesh.add(mainBody);

        const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 0.05), whiteMat);
        doorL.position.set(0, 0.8, 1.16);
        this.mesh.add(doorL);

        const doorR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 0.05), whiteMat);
        doorR.position.set(0, 0.8, -1.16);
        this.mesh.add(doorR);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.75, 1.8), whiteMat);
        cabin.position.set(-0.2, 1.5, 0);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const wheelPositions = [
            { x: 1.4, y: 0.5, z: 1.2 }, { x: 1.4, y: 0.5, z: -1.2 },
            { x: -1.4, y: 0.5, z: 1.2 }, { x: -1.4, y: 0.5, z: -1.2 }
        ];

        for (const pos of wheelPositions) {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
            this.wheels.push(wheel);
        }

        this.sirenRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        this.sirenBlueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });

        this.sirenBeaconL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), this.sirenBlueMat);
        this.sirenBeaconL.position.set(-0.2, 1.95, 0.45);
        this.mesh.add(this.sirenBeaconL);

        this.sirenBeaconR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), this.sirenRedMat);
        this.sirenBeaconR.position.set(-0.2, 1.95, -0.45);
        this.mesh.add(this.sirenBeaconR);

        this.sirenLight = new THREE.PointLight(0x0066ff, 3.5, 30);
        this.sirenLight.position.set(-0.2, 2.5, 0);
        this.mesh.add(this.sirenLight);
    }

    update(target, city3D) {
        this.sirenTimer++;
        if (this.sirenTimer % 10 === 0) {
            this.sirenColor = this.sirenColor === 'blue' ? 'red' : 'blue';
            this.sirenLight.color.setHex(this.sirenColor === 'blue' ? 0x0066ff : 0xff0044);
            this.sirenBeaconL.material = this.sirenColor === 'blue' ? this.sirenBlueMat : this.sirenRedMat;
            this.sirenBeaconR.material = this.sirenColor === 'blue' ? this.sirenRedMat : this.sirenBlueMat;
        }

        const dx = target.x - this.x;
        const dz = target.z - this.z;
        const targetAngle = Math.atan2(-dz, dx);

        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        this.angle += angleDiff * 0.085; // Keskin ve agresif dönüş

        const dist = Math.hypot(dx, dz);
        if (dist > 2) {
            this.speed = Math.min(this.maxSpeed, this.speed + 0.04);
        }

        const nextX = this.x + Math.cos(this.angle) * this.speed;
        const nextZ = this.z - Math.sin(this.angle) * this.speed;

        const col = city3D.checkCollision(nextX, nextZ, 2.3);
        if (!col.collided) {
            this.x = nextX;
            this.z = nextZ;
        } else {
            this.angle += 0.35;
            this.speed *= 0.65;
        }

        this.mesh.position.set(this.x, 0, this.z);
        this.mesh.rotation.y = this.angle;

        for (const w of this.wheels) {
            w.rotation.z += this.speed * 0.8;
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

// ========================================================
// 3D TOPLANABİLİR ALTIN PUANLAR & TAMİR KİTİ
// ========================================================
class Collectible3D {
    constructor(scene, x, z) {
        this.scene = scene;
        this.x = x;
        this.z = z;

        const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffea00, metalness: 0.9, roughness: 0.1 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(x, 1.2, z);
        this.scene.add(this.mesh);

        this.rotSpeed = 0.035;
        this.time = Math.random() * Math.PI;
    }

    update() {
        this.time += 0.05;
        this.mesh.rotation.y += this.rotSpeed;
        this.mesh.position.y = 1.2 + Math.sin(this.time) * 0.35;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class RepairKit3D {
    constructor(scene, x, z) {
        this.scene = scene;
        this.x = x;
        this.z = z;

        const mat = new THREE.MeshStandardMaterial({ color: 0x00ff88, metalness: 0.5, roughness: 0.3 });
        this.mesh = new THREE.Group();
        this.mesh.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.6), mat));
        this.mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 0.6), mat));

        this.mesh.position.set(x, 1.3, z);
        this.scene.add(this.mesh);
        this.time = 0;
    }

    update() {
        this.time += 0.05;
        this.mesh.rotation.y += 0.04;
        this.mesh.position.y = 1.3 + Math.sin(this.time) * 0.25;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

// ========================================================
// 3D PARÇACIK SİSTEMİ
// ========================================================
class ParticleSystem3D {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    }

    emitSmoke(x, y, z, color = 0xcccccc, scale = 1) {
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.75 });
        const mesh = new THREE.Mesh(this.geo, mat);
        mesh.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
        mesh.scale.setScalar(scale);

        this.scene.add(mesh);
        this.particles.push({
            mesh: mesh,
            vy: 0.06 + Math.random() * 0.04,
            vx: (Math.random() - 0.5) * 0.04,
            vz: (Math.random() - 0.5) * 0.04,
            life: 1.0,
            decay: 0.035
        });
    }

    emitSparks(x, y, z) {
        for (let i = 0; i < 10; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);

            const angle = Math.random() * Math.PI * 2;
            const spd = 0.2 + Math.random() * 0.3;
            this.particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * spd,
                vy: 0.15 + Math.random() * 0.2,
                vz: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.06
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.life -= p.decay;
            p.mesh.scale.multiplyScalar(1.03);
            p.mesh.material.opacity = p.life;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}

// ========================================================
// CANLI ONLİNE MULTIPLAYER YÖNETİCİSİ (MQTT Over WebSockets)
// ========================================================
class OnlineMultiplayerManager {
    constructor(game) {
        this.game = game;
        this.client = null;
        this.connected = false;
        this.myId = 'driver_' + Math.random().toString(36).substr(2, 6);
        this.myName = 'Sürücü';
        this.myColor = [0x00f0ff, 0xff0077, 0x00ff88, 0xff9900, 0xbb00ff, 0x00d4ff][Math.floor(Math.random() * 6)];
        this.otherPlayers = new Map();

        this.topicPlayers = 'polis3d_v1/players';
        this.topicChat = 'polis3d_v1/chat';
        this.topicHorn = 'polis3d_v1/horn';

        this.broadcastInterval = null;
        this.welcomed = false;
        this.announcedPlayers = new Set();
    }

    connect(playerName) {
        this.myName = playerName || 'Sürücü';
        const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';

        try {
            if (typeof mqtt === 'undefined') {
                console.warn('MQTT kütüphanesi hazır değil.');
                this.addChatMessage('SİSTEM', 'Online sunucu kütüphanesi hazır değil. Yerel modda başlatıldı.', 'system');
                return;
            }

            this.client = mqtt.connect(brokerUrl, {
                clientId: this.myId,
                clean: true,
                keepalive: 30
            });

            this.client.on('connect', () => {
                this.connected = true;
                this.client.subscribe([this.topicPlayers, this.topicChat, this.topicHorn]);
                
                // Yalnızca İLK bağlantıda 1 KEZ hoş geldin mesajı ver:
                if (!this.welcomed) {
                    this.welcomed = true;
                    this.addChatMessage('SİSTEM', `Online meydana hoş geldin ${this.myName}!`, 'system');
                }

                document.getElementById('onlineBadge').classList.remove('hidden');
                document.getElementById('chatContainer').classList.remove('hidden');

                if (!this.broadcastInterval) {
                    this.broadcastInterval = setInterval(() => this.broadcastPosition(), 60);
                }
            });

            this.client.on('message', (topic, message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.id === this.myId) return; // Kendi mesajlarımızı atla

                    if (topic === this.topicPlayers) {
                        this.handlePlayerUpdate(data);
                    } else if (topic === this.topicChat) {
                        this.addChatMessage(data.name, data.text);
                    } else if (topic === this.topicHorn) {
                        audio.playHorn();
                        this.addChatMessage(data.name, '📢 KORNA ÇALDI! (DÜÜT DÜÜT)', 'horn');
                    }
                } catch (e) {
                    console.error('MQTT Mesaj parse hatası', e);
                }
            });

            this.client.on('error', (err) => {
                console.warn('Online bağlantı uyarısı:', err);
            });
        } catch (e) {
            console.error('MQTT başlatılamadı:', e);
        }
    }

    broadcastPosition() {
        if (!this.connected || !this.client) return;
        const payload = {
            id: this.myId,
            name: this.myName,
            color: this.myColor,
            x: Math.round(this.game.player.x * 10) / 10,
            z: Math.round(this.game.player.z * 10) / 10,
            angle: Math.round(this.game.player.angle * 100) / 100,
            speed: Math.round(this.game.player.speed * 100) / 100,
            signal: this.game.player.signal,
            signalBlink: this.game.player.signalBlinkState,
            health: this.game.player.health
        };
        this.client.publish(this.topicPlayers, JSON.stringify(payload));
    }

    handlePlayerUpdate(data) {
        if (!this.otherPlayers.has(data.id)) {
            // Yeni online oyuncu katıldı
            const newPlayer = new OtherPlayer3D(this.game.scene, data.id, data.name, data.color);
            this.otherPlayers.set(data.id, newPlayer);

            // Sadece ilk defa katıldığında 1 kez chat'e yazdır
            if (!this.announcedPlayers.has(data.id)) {
                this.announcedPlayers.add(data.id);
                this.addChatMessage('SİSTEM', `🚗 ${data.name} online meydana katıldı!`, 'system');
            }
        }

        const p = this.otherPlayers.get(data.id);
        p.updateData(data);
        this.updateOnlineCount();
    }

    update() {
        const now = Date.now();
        // 10 saniyeden uzun süredir veri göndermeyen ayrılmış oyuncuları temizle
        this.otherPlayers.forEach((player, id) => {
            if (now - player.lastSeen > 10000) {
                player.destroy();
                this.otherPlayers.delete(id);
                this.announcedPlayers.delete(id);
                this.addChatMessage('SİSTEM', `${player.name} oyundan ayrıldı.`, 'system');
                this.updateOnlineCount();
            } else {
                player.interpolate();
            }
        });
    }

    updateOnlineCount() {
        const total = this.otherPlayers.size + 1;
        document.getElementById('onlineCountText').innerText = `ONLİNE: ${total} Oyuncu`;
    }

    sendChat(text) {
        if (!this.connected || !this.client || !text.trim()) return;
        const payload = { id: this.myId, name: this.myName, text: text.trim() };
        this.client.publish(this.topicChat, JSON.stringify(payload));
        this.addChatMessage(this.myName, text.trim());
    }

    sendHorn() {
        audio.playHorn();
        if (this.connected && this.client) {
            const payload = { id: this.myId, name: this.myName };
            this.client.publish(this.topicHorn, JSON.stringify(payload));
        }
        this.addChatMessage(this.myName, '📢 KORNA ÇALDI!', 'horn');
    }

    addChatMessage(sender, text, type = '') {
        const chatBox = document.getElementById('chatMessages');
        if (!chatBox) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type}`;
        msgDiv.innerHTML = `<b>${sender}:</b> ${text}`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// ========================================================
// ANA 3D OYUN YÖNETİCİSİ (Game Engine)
// ========================================================
class Game3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b101d);
        this.scene.fog = new THREE.FogExp2(0x0b101d, 0.0055);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraMode = 0;

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ambient = new THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xddeeff, 0.85);
        sun.position.set(100, 200, 100);
        sun.castShadow = true;
        this.scene.add(sun);

        this.city = new City3D(this.scene);
        this.particles = new ParticleSystem3D(this.scene);
        this.player = new PlayerCar3D(this.scene);
        this.police = null;

        this.online = new OnlineMultiplayerManager(this);
        this.isOnlineMode = false;

        this.collectibles = [];
        this.repairKits = [];
        this.score = 0;
        this.totalPoints = 25;

        this.wantedLevel = 0;
        this.chaseTimer = 0;
        this.gameState = 'START';

        this.keys = { up: false, down: false, left: false, right: false, space: false };

        this.initWorld();
        this.bindEvents();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initWorld() {
        this.collectibles.forEach(c => c.destroy());
        this.repairKits.forEach(r => r.destroy());
        this.collectibles = [];
        this.repairKits = [];

        for (let i = 0; i < this.totalPoints; i++) {
            const road = this.city.roads[i % this.city.roads.length];
            const px = road.x1 + 6 + Math.random() * (road.x2 - road.x1 - 12);
            const pz = road.z1 + 6 + Math.random() * (road.z2 - road.z1 - 12);
            this.collectibles.push(new Collectible3D(this.scene, px, pz));
        }

        for (let i = 0; i < 3; i++) {
            const road = this.city.roads[(i * 4 + 2) % this.city.roads.length];
            this.repairKits.push(new RepairKit3D(this.scene, (road.x1 + road.x2) / 2, (road.z1 + road.z2) / 2));
        }
    }

    start(online = false) {
        audio.init();
        this.gameState = 'PLAYING';
        this.isOnlineMode = online;
        this.score = 0;
        this.wantedLevel = 0;

        if (this.police) {
            this.police.destroy();
            this.police = null;
        }

        // HERKES AYNI MERKEZ MEYDANDA TOPLANSIN (x = 0, z = 0 civarı)
        const spawnOffset = (Math.random() - 0.5) * 16;
        this.player.x = spawnOffset;
        this.player.z = spawnOffset;
        this.player.angle = 0;
        this.player.speed = 0;
        this.player.health = 100;
        this.player.isBroken = false;
        this.player.signal = 0;
        this.player.spawnGraceTimer = 300; // 5 saniye başlangıç koruması
        this.player.signalCooldown = 0;
        this.player.invulnerableTimer = 0;
        this.player.turnAngleAccumulator = 0;

        this.initWorld();

        const nameInput = document.getElementById('playerNameInput');
        const playerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Sürücü';

        if (online) {
            this.online.connect(playerName);
        }

        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('winScreen').classList.add('hidden');
        this.updateHUD();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            // Chat inputu aktifken sürüş tuşlarını kilitle
            if (document.activeElement === document.getElementById('chatInput')) {
                if (e.key === 'Escape') document.getElementById('chatInput').blur();
                return;
            }

            if (this.gameState !== 'PLAYING') return;

            if (e.key === 'w' || e.key === 'ArrowUp') this.keys.up = true;
            if (e.key === 's' || e.key === 'ArrowDown') this.keys.down = true;
            if (e.key === 'a' || e.key === 'ArrowLeft') this.keys.left = true;
            if (e.key === 'd' || e.key === 'ArrowRight') this.keys.right = true;
            if (e.key === ' ') {
                e.preventDefault(); // Sayfa kaymasını veya buton tetiklemesini engelle
                this.keys.space = true;
            }

            // Q: Sol Sinyal
            if (e.key.toLowerCase() === 'q') {
                this.player.signal = this.player.signal === -1 ? 0 : -1;
                this.updateSignalHUD();
            }
            // E: Sağ Sinyal
            if (e.key.toLowerCase() === 'e') {
                this.player.signal = this.player.signal === 1 ? 0 : 1;
                this.updateSignalHUD();
            }
            // C: Kamera Değiştir
            if (e.key.toLowerCase() === 'c') {
                this.cameraMode = (this.cameraMode + 1) % 2;
            }
            // H: Korna Çal
            if (e.key.toLowerCase() === 'h') {
                this.online.sendHorn();
            }
            // Enter: Chat'e Odaklan
            if (e.key === 'Enter') {
                const ci = document.getElementById('chatInput');
                if (ci) ci.focus();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'ArrowUp') this.keys.up = false;
            if (e.key === 's' || e.key === 'ArrowDown') this.keys.down = false;
            if (e.key === 'a' || e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'd' || e.key === 'ArrowRight') this.keys.right = false;
            if (e.key === ' ') {
                e.preventDefault();
                this.keys.space = false;
            }
        });

        // Butonlar - Hem click hem touch desteği
        const startOnline = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.start(true);
        };
        const startSolo = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            this.start(false);
        };

        this.safeBind('startOnlineBtn', 'click', startOnline);
        this.safeBind('startOnlineBtn', 'touchend', startOnline);

        this.safeBind('startSoloBtn', 'click', startSolo);
        this.safeBind('startSoloBtn', 'touchend', startSolo);

        this.safeBind('restartBtn', 'click', () => this.start(this.isOnlineMode));
        this.safeBind('winRestartBtn', 'click', () => this.start(this.isOnlineMode));

        this.safeBind('cameraBtn', 'click', () => {
            this.cameraMode = (this.cameraMode + 1) % 2;
        });

        this.safeBind('muteBtn', 'click', () => {
            const on = audio.toggleMute();
            const btn = document.getElementById('muteBtn');
            if (btn) btn.innerText = on ? '🔊 SES AÇIK' : '🔇 SES KAPALI';
        });

        // Chat Form
        this.safeBind('chatForm', 'submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            if (input && input.value.trim()) {
                this.online.sendChat(input.value);
                input.value = '';
                input.blur();
            }
        });

        this.safeBind('hornBtn', 'click', () => {
            this.online.sendHorn();
        });

        // Mobil Kontroller
        this.bindTouch('mGasBtn', 'up');
        this.bindTouch('mBrakeBtn', 'down');
        this.bindTouch('mLeftBtn', 'left');
        this.bindTouch('mRightBtn', 'right');
        this.bindTouch('mDriftBtn', 'space');

        this.safeBind('mHornBtn', 'touchstart', (e) => {
            e.preventDefault();
            this.online.sendHorn();
        });

        this.safeBind('mSignalL', 'touchstart', (e) => {
            e.preventDefault();
            this.player.signal = this.player.signal === -1 ? 0 : -1;
            this.updateSignalHUD();
        });

        this.safeBind('mSignalR', 'touchstart', (e) => {
            e.preventDefault();
            this.player.signal = this.player.signal === 1 ? 0 : 1;
            this.updateSignalHUD();
        });
    }

    safeBind(id, event, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
        }
    }

    bindTouch(id, keyName) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys[keyName] = true;
        });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys[keyName] = false;
        });
    }

    updateSignalHUD() {
        const leftEl = document.getElementById('leftSignalIndicator');
        const rightEl = document.getElementById('rightSignalIndicator');
        leftEl.classList.toggle('active', this.player.signal === -1);
        rightEl.classList.toggle('active', this.player.signal === 1);
    }

    triggerInfraction(infraction) {
        const badge = document.getElementById('warningBadge');
        badge.innerText = infraction.message;
        badge.classList.remove('hidden');

        if (this.wantedLevel < 5) this.wantedLevel++;

        if (!this.police) {
            const spawnAngle = this.player.angle + Math.PI;
            const spawnX = this.player.x + Math.cos(spawnAngle) * 55;
            const spawnZ = this.player.z - Math.sin(spawnAngle) * 55;
            this.police = new PoliceCar3D(this.scene, spawnX, spawnZ);
            audio.playSiren(true);
        }

        clearTimeout(this.badgeTimeout);
        this.badgeTimeout = setTimeout(() => {
            badge.classList.add('hidden');
        }, 2500);
    }

    update() {
        if (this.gameState !== 'PLAYING') return;

        const infraction = this.player.update(this.keys, this.city, this.particles);
        if (infraction) this.triggerInfraction(infraction);

        // Online Diğer Oyuncuları Güncelle
        if (this.isOnlineMode) {
            this.online.update();
        }

        // Polis Takibi ve Yakalama Mekaniği
        if (this.police) {
            this.police.update(this.player, this.city);
            const dist = Math.hypot(this.police.x - this.player.x, this.police.z - this.player.z);
            const warningBadge = document.getElementById('warningBadge');

            // Polis arabaya çarptığında (Temas, İtme & Yavaşlatma)
            if (dist < 4.4) {
                this.player.speed *= 0.95; // Polisin teması arabayı yavaşlatır
                if (Math.random() > 0.5) {
                    this.particles.emitSparks(this.player.x, 1.2, this.player.z);
                }
            }

            // Yakalama Sayacı (Busted Meter)
            if (dist < 5.8) {
                // Eğer oyuncu durmuşsa veya yavaşlamışsa çok hızlı yakalanır
                if (Math.abs(this.player.speed) < 0.6) {
                    this.chaseTimer += 2.0;
                } else {
                    // Hızlı giderken de polis yapışık takip ediyorsa sayaç artar
                    this.chaseTimer += 1.0;
                }

                // Canlı yakalanma yüzdesi
                const pct = Math.min(100, Math.round((this.chaseTimer / 100) * 100));
                warningBadge.innerText = `🚨 POLİS YAKALIYOR! %${pct}`;
                warningBadge.classList.remove('hidden');

                if (this.chaseTimer >= 100) {
                    this.gameOver('POLİS EKİPLERİ SENİ KISTIRDI VE YAKALADI! GAME OVER!');
                    return;
                }
            } else {
                // Polis geride kalırsa veya kaçmayı başarırsan sayaç geri düşer
                if (this.chaseTimer > 0) {
                    this.chaseTimer = Math.max(0, this.chaseTimer - 1.5);
                    const pct = Math.min(100, Math.round((this.chaseTimer / 100) * 100));
                    if (pct > 0) {
                        warningBadge.innerText = `🚨 POLİS YAKALIYOR! %${pct}`;
                    } else {
                        warningBadge.classList.add('hidden');
                    }
                }
            }
        }

        if (this.player.isBroken) {
            this.gameOver('ARABA DUVARA ÇARPTI VE MOTOR İFLAS ETTİ! GAME OVER!');
            return;
        }

        // Altın Puanlar
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            c.update();
            const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
            if (d < 3.2) {
                c.destroy();
                this.collectibles.splice(i, 1);
                this.score++;
                audio.playCoin();
                this.particles.emitSparks(this.player.x, 1.5, this.player.z);

                if (this.score >= this.totalPoints && !this.isOnlineMode) {
                    this.winGame();
                    return;
                }
            }
        }

        // Tamir Kitleri
        for (let i = this.repairKits.length - 1; i >= 0; i--) {
            const r = this.repairKits[i];
            r.update();
            const d = Math.hypot(r.x - this.player.x, r.z - this.player.z);
            if (d < 3.5) {
                r.destroy();
                this.repairKits.splice(i, 1);
                this.player.health = Math.min(100, this.player.health + 45);
                this.particles.emitSparks(this.player.x, 1.5, this.player.z);
            }
        }

        this.particles.update();
        this.updateCamera();
        this.updateHUD();
        this.drawMinimap();
    }

    updateCamera() {
        if (this.cameraMode === 0) {
            const camDist = 14;
            const camHeight = 5.5;

            const targetX = this.player.x - Math.cos(this.player.angle) * camDist;
            const targetZ = this.player.z + Math.sin(this.player.angle) * camDist;

            this.camera.position.lerp(new THREE.Vector3(targetX, camHeight, targetZ), 0.12);
            this.camera.lookAt(this.player.x, 1.5, this.player.z);
        } else {
            this.camera.position.lerp(new THREE.Vector3(this.player.x, 45, this.player.z + 15), 0.1);
            this.camera.lookAt(this.player.x, 0, this.player.z);
        }
    }

    updateHUD() {
        const speedKmh = Math.round(Math.abs(this.player.speed) * 85);
        document.getElementById('speedVal').innerHTML = `${speedKmh} <small>KM/H</small>`;

        const healthBar = document.getElementById('healthBar');
        healthBar.style.width = `${this.player.health}%`;

        const healthText = document.getElementById('healthText');
        if (this.player.health > 70) {
            healthText.innerText = `%${this.player.health} Sağlam`;
            healthText.style.color = '#00ff88';
        } else if (this.player.health > 35) {
            healthText.innerText = `%${this.player.health} Hasarlı`;
            healthText.style.color = '#ffaa00';
        } else {
            healthText.innerText = `%${this.player.health} Kritik Arıza!`;
            healthText.style.color = '#ff3366';
        }

        document.getElementById('scoreVal').innerText = `${this.score} / ${this.totalPoints}`;

        const stars = document.getElementById('wantedStars').children;
        for (let i = 0; i < stars.length; i++) {
            stars[i].classList.toggle('active', i < this.wantedLevel);
        }
    }

    drawMinimap() {
        miniCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        const mapScale = minimapCanvas.width / (WORLD_SIZE * 0.9);
        const centerX = minimapCanvas.width / 2;
        const centerY = minimapCanvas.height / 2;

        // Yollar
        miniCtx.fillStyle = '#2b3346';
        for (const road of this.city.roads) {
            const rx = centerX + road.x1 * mapScale;
            const rz = centerY + road.z1 * mapScale;
            const rw = (road.x2 - road.x1) * mapScale;
            const rh = (road.z2 - road.z1) * mapScale;
            miniCtx.fillRect(rx, rz, rw, rh);
        }

        // Puanlar
        miniCtx.fillStyle = '#ffea00';
        for (const c of this.collectibles) {
            miniCtx.fillRect(centerX + c.x * mapScale, centerY + c.z * mapScale, 3, 3);
        }

        // Oyuncu (Kendi arabamız - Mavi)
        miniCtx.fillStyle = '#00f0ff';
        miniCtx.beginPath();
        miniCtx.arc(centerX + this.player.x * mapScale, centerY + this.player.z * mapScale, 4, 0, Math.PI * 2);
        miniCtx.fill();

        // Diğer Online Oyuncular (Yeşil Noktalar)
        if (this.isOnlineMode) {
            miniCtx.fillStyle = '#00ff88';
            this.online.otherPlayers.forEach((p) => {
                miniCtx.beginPath();
                miniCtx.arc(centerX + p.mesh.position.x * mapScale, centerY + p.mesh.position.z * mapScale, 4, 0, Math.PI * 2);
                miniCtx.fill();
            });
        }

        // Polis
        if (this.police) {
            miniCtx.fillStyle = this.police.sirenColor === 'blue' ? '#0066ff' : '#ff0044';
            miniCtx.beginPath();
            miniCtx.arc(centerX + this.police.x * mapScale, centerY + this.police.z * mapScale, 5, 0, Math.PI * 2);
            miniCtx.fill();
        }
    }

    gameOver(reason) {
        this.gameState = 'GAMEOVER';
        audio.playSiren(false);
        document.getElementById('gameOverReason').innerText = reason;
        document.getElementById('finalScore').innerText = `${this.score} / ${this.totalPoints}`;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    winGame() {
        this.gameState = 'WIN';
        audio.playSiren(false);
        document.getElementById('winScreen').classList.remove('hidden');
    }

    loop() {
        this.update();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.loop());
    }
}

// Global başlatma fonksiyonu
window.startGame = function(online) {
    if (window.gameInstance) {
        window.gameInstance.start(online);
    }
};

// Oyunu Başlat
try {
    window.gameInstance = new Game3D();
    window.gameInstance.loop();
} catch (err) {
    console.error('3D Oyun başlatma hatası:', err);
}
