class CosmicEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    // Add a very faint dark blue fog for depth
    this.scene.fog = new THREE.FogExp2(0x030308, 0.0015);
    
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.z = 400;
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    this.symbols = ['μ', 'σ', 'Σ', 'α', 'β', 'π', 'ρ', 'λ', 'n', 'N', 'P(X)', 'E(X)', '∫', '∞', 'Δ', 'θ'];
    this.particles = [];
    this.clock = new THREE.Clock();
    
    // Globals for transitions
    this.transitioning = false;
    this.blackHole = null;
    this.magnetar = null;
    this.pulsarLight = null;
    this.kilonova = null;
    
    this.initLighting();
    this.initStarfield();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Touch/Mouse interaction state
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    
    this.container.addEventListener('mousedown', this.onPointerDown);
    this.container.addEventListener('mousemove', this.onPointerMove);
    window.addEventListener('mouseup', this.onPointerUp);
    
    this.container.addEventListener('touchstart', this.onPointerDown, { passive: true });
    this.container.addEventListener('touchmove', this.onPointerMove, { passive: true });
    window.addEventListener('touchend', this.onPointerUp);
    
    this.animate = this.animate.bind(this);
    this.animate();
  }
  
  onPointerDown(e) {
      if (this.transitioning) return;
      this.isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      this.previousMousePosition = { x: clientX, y: clientY };
  }
  
  onPointerMove(e) {
      if (!this.isDragging || this.transitioning) return;
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const deltaMove = {
          x: clientX - this.previousMousePosition.x,
          y: clientY - this.previousMousePosition.y
      };
      
      const rotationSpeed = 0.005;
      
      if (this.particleGroup) {
          this.particleGroup.rotation.y += deltaMove.x * rotationSpeed;
          this.particleGroup.rotation.x += deltaMove.y * rotationSpeed;
      }
      if (this.genericStars) {
          this.genericStars.rotation.y += deltaMove.x * rotationSpeed;
          this.genericStars.rotation.x += deltaMove.y * rotationSpeed;
      }
      if (this.dataLines) {
          this.dataLines.rotation.y += deltaMove.x * rotationSpeed;
          this.dataLines.rotation.x += deltaMove.y * rotationSpeed;
      }
      
      this.previousMousePosition = { x: clientX, y: clientY };
  }
  
  onPointerUp(e) {
      this.isDragging = false;
  }
  
  createSymbolTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  
  initLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    this.mainLight = new THREE.PointLight(0x38bdf8, 1, 1000);
    this.mainLight.position.set(0, 0, 0);
    this.scene.add(this.mainLight);
  }
  
  initStarfield() {
    const symbolTextures = this.symbols.map(sym => this.createSymbolTexture(sym));
    const particleCount = 1200;
    
    this.particleGroup = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
      const tex = symbolTextures[Math.floor(Math.random() * symbolTextures.length)];
      const material = new THREE.SpriteMaterial({ 
        map: tex, 
        color: 0xffffff,
        transparent: true,
        opacity: Math.random() * 0.7 + 0.1,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(material);
      
      // Spherical distribution
      const r = Math.random() * 800 + 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      sprite.position.x = r * Math.sin(phi) * Math.cos(theta);
      sprite.position.y = r * Math.sin(phi) * Math.sin(theta);
      sprite.position.z = r * Math.cos(phi);
      
      // Store original data for animations
      sprite.userData = {
        originalPos: sprite.position.clone(),
        speed: Math.random() * 0.05 + 0.01,
        angle: Math.random() * Math.PI * 2,
        radius: r,
        baseOpacity: material.opacity,
        scaleMultiplier: Math.random() * 1.5 + 0.5
      };
      
      // Variations in size based on distance
      const scale = (Math.random() * 8 + 4) * sprite.userData.scaleMultiplier;
      sprite.scale.set(scale, scale, 1);
      
      this.particles.push(sprite);
      this.particleGroup.add(sprite);
    }
    
    this.scene.add(this.particleGroup);
    
    // Add some generic tiny stars (points) for density
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 3000;
    const posArray = new Float32Array(starsCount * 3);
    for(let i=0; i<starsCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({
        size: 1.5,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    this.genericStars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.genericStars);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    
    // Base gentle rotation of the cosmos
    if (!this.transitioning) {
      this.particleGroup.rotation.y += 0.001;
      this.particleGroup.rotation.x += 0.0005;
      this.genericStars.rotation.y += 0.001;
      
      if (this.dataLines) {
          this.dataLines.rotation.y += 0.001;
          this.dataLines.rotation.x += 0.0005;
          this.dataLines.material.opacity = 0.2 + Math.sin(time) * 0.1;
      }
      
      // Twinkle effect
      this.particles.forEach((p, i) => {
        p.material.opacity = p.userData.baseOpacity + Math.sin(time * 2 + i) * 0.2;
      });
    } else {
        // Transition animations
        if (this.currentTransition === 'blackHole') {
            this.animateBlackHole(delta, time);
        } else if (this.currentTransition === 'magnetar') {
            this.animateMagnetar(delta, time);
        } else if (this.currentTransition === 'pulsar') {
            this.animatePulsar(delta, time);
        } else if (this.currentTransition === 'kilonova') {
            this.animateKilonova(delta, time);
        } else if (this.currentTransition === 'wormhole') {
            this.animateWormhole(delta, time);
        } else if (this.currentTransition === 'grb') {
            this.animateGRB(delta, time);
        }
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  // --- THEMES --- //
  
  applyDataTheme() {
      // Connect nearby particles with lines to simulate data graphs/networks
      const material = new THREE.LineBasicMaterial({ 
          color: 0x38bdf8, 
          transparent: true, 
          opacity: 0.2 
      });
      const points = [];
      const threshold = 150;
      
      // Create random network connections between close particles
      for (let i = 0; i < this.particles.length; i++) {
          for (let j = i + 1; j < this.particles.length; j += 10) {
              if (this.particles[i].position.distanceTo(this.particles[j].position) < threshold) {
                  points.push(this.particles[i].position);
                  points.push(this.particles[j].position);
              }
          }
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.dataLines = new THREE.LineSegments(geometry, material);
      this.particleGroup.add(this.dataLines);
  }

  // --- TRANSITIONS --- //

  triggerBlackHole(callback) {
      this.transitioning = true;
      this.currentTransition = 'blackHole';
      
      // Create visual black hole object
      const geo = new THREE.SphereGeometry(20, 32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.blackHole = new THREE.Mesh(geo, mat);
      this.scene.add(this.blackHole);
      
      // Accretion disk glow
      const glowGeo = new THREE.RingGeometry(25, 40, 64);
      const glowMat = new THREE.MeshBasicMaterial({ 
          color: 0xff4400, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
      });
      this.accretion = new THREE.Mesh(glowGeo, glowMat);
      this.accretion.rotation.x = Math.PI / 2;
      this.scene.add(this.accretion);

      // GSAP Camera movement: pull into the black hole
      gsap.to(this.camera.position, {
          z: 10,
          duration: 4,
          ease: "power2.in",
          onComplete: () => {
              // Fade out everything
              gsap.to(document.body, { opacity: 0, duration: 1, onComplete: callback });
          }
      });
  }

  animateBlackHole(delta, time) {
      // Rotate disk
      if(this.accretion) {
          this.accretion.rotation.z += delta * 2;
          this.accretion.scale.setScalar(1 + Math.sin(time*10)*0.1);
      }
      
      // Particles spiral in
      this.particles.forEach(p => {
          // Vector towards center
          const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), p.position);
          const dist = dir.length();
          dir.normalize();
          
          // Tangent for spiral
          const tangent = new THREE.Vector3(-p.position.z, 0, p.position.x).normalize();
          
          // Move
          p.position.add(dir.multiplyScalar(delta * 20000 / (dist + 1))); // Gravity
          p.position.add(tangent.multiplyScalar(delta * 100)); // Spiral
          
          // Increase opacity as they fall in
          p.material.opacity = Math.min(1, 200 / dist);
      });
  }

  triggerMagnetar(callback) {
      this.transitioning = true;
      this.currentTransition = 'magnetar';
      
      // Magnetar core
      const geo = new THREE.SphereGeometry(30, 32, 32);
      const mat = new THREE.MeshStandardMaterial({ 
          color: 0xffffff, 
          emissive: 0x0088ff,
          emissiveIntensity: 2
      });
      this.magnetar = new THREE.Mesh(geo, mat);
      this.scene.add(this.magnetar);
      
      this.mainLight.color.setHex(0x0088ff);
      this.mainLight.intensity = 5;
      
      gsap.to(this.camera.position, {
          z: 200,
          y: 50,
          duration: 4,
          ease: "power2.inOut",
          onComplete: () => {
              // Eruption whiteout
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100%'; overlay.style.height = '100%';
              overlay.style.backgroundColor = 'white';
              overlay.style.opacity = 0;
              overlay.style.zIndex = 100;
              document.body.appendChild(overlay);
              
              gsap.to(overlay, {
                  opacity: 1, duration: 1, onComplete: callback
              });
          }
      });
  }

  animateMagnetar(delta, time) {
      if(this.magnetar) {
          this.magnetar.rotation.y += delta * 10; // Fast rotation
          this.magnetar.scale.setScalar(1 + Math.sin(time*20)*0.05);
      }
      
      // Particles align to magnetic poles and erupt
      this.particles.forEach((p, i) => {
          // Push away from equator, pull to poles, then erupt
          if (p.position.length() < 500) {
              const ySign = Math.sign(p.position.y) || 1;
              p.position.y += ySign * delta * 200; // Move to poles
              p.position.x *= 1 - (delta); // Squeeze
              p.position.z *= 1 - (delta);
              
              if (Math.abs(p.position.y) > 100) {
                  // Erupt outward from poles
                  p.position.y += ySign * delta * 500;
                  p.position.x += (Math.random() - 0.5) * delta * 200;
                  p.position.z += (Math.random() - 0.5) * delta * 200;
              }
          }
          p.material.color.setHex(0x0088ff);
      });
  }

  triggerPulsar(callback) {
      this.transitioning = true;
      this.currentTransition = 'pulsar';
      
      // Pulsar core
      const geo = new THREE.SphereGeometry(15, 32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0x8800ff });
      this.pulsar = new THREE.Mesh(geo, mat);
      this.scene.add(this.pulsar);
      
      this.pulseTimer = 0;
      this.pulseRate = 1.0; // starts slow, speeds up
      
      gsap.to(this, {
          pulseRate: 10.0,
          duration: 4,
          ease: "power2.in"
      });
      
      gsap.to(this.camera.position, {
          z: 150,
          duration: 5,
          onComplete: () => {
              gsap.to(document.body, { opacity: 0, duration: 1, onComplete: callback });
          }
      });
  }

  animatePulsar(delta, time) {
      this.pulseTimer += delta * this.pulseRate;
      const pulse = (Math.sin(this.pulseTimer * Math.PI * 2) + 1) / 2; // 0 to 1
      
      this.pulsar.scale.setScalar(1 + pulse * 0.5);
      this.mainLight.color.setHex(0x8800ff);
      this.mainLight.intensity = pulse * 10;
      
      // Particles light up in waves
      const waveRadius = (time * 200) % 800;
      this.particles.forEach(p => {
          const dist = p.position.length();
          if (Math.abs(dist - waveRadius) < 50) {
              p.material.opacity = 1;
              p.material.color.setHex(0xffffff);
          } else {
              p.material.opacity = p.userData.baseOpacity * 0.2; // Dim down
              p.material.color.setHex(0x555555);
          }
      });
  }

  triggerKilonova(callback) {
      this.transitioning = true;
      this.currentTransition = 'kilonova';
      
      const bhGeo = new THREE.SphereGeometry(10, 32, 32);
      const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.bh = new THREE.Mesh(bhGeo, bhMat);
      this.bh.position.set(50, 0, 0);
      this.scene.add(this.bh);
      
      const nsGeo = new THREE.SphereGeometry(10, 32, 32);
      const nsMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      this.ns = new THREE.Mesh(nsGeo, nsMat);
      this.ns.position.set(-50, 0, 0);
      this.scene.add(this.ns);
      
      this.mergerPhase = 0;
      
      gsap.to(this, {
          mergerPhase: 1,
          duration: 4,
          ease: "power3.in",
          onComplete: () => {
              // Eruption
              this.scene.remove(this.bh);
              this.scene.remove(this.ns);
              this.mainLight.color.setHex(0xffd700);
              this.mainLight.intensity = 20;
              
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100%'; overlay.style.height = '100%';
              overlay.style.backgroundColor = '#ffd700';
              overlay.style.opacity = 0;
              overlay.style.zIndex = 100;
              document.body.appendChild(overlay);
              
              gsap.to(overlay, {
                  opacity: 1, duration: 1, delay: 0.5, onComplete: callback
              });
          }
      });
  }

  animateKilonova(delta, time) {
      if(this.mergerPhase < 1 && this.bh && this.ns) {
          // Orbit closer and faster
          const distance = 50 * (1 - this.mergerPhase);
          const speed = time * (1 + this.mergerPhase * 10);
          this.bh.position.set(Math.cos(speed) * distance, Math.sin(speed) * distance, 0);
          this.ns.position.set(-Math.cos(speed) * distance, -Math.sin(speed) * distance, 0);
          
          this.camera.position.z = 400 - (this.mergerPhase * 100);
      } else {
          // Explosion phase
          this.particles.forEach(p => {
              p.position.multiplyScalar(1 + delta * 2);
              p.material.color.setHex(0xffa500);
              p.material.opacity = 1;
          });
      }
  }

  triggerWormhole(callback) {
      this.transitioning = true;
      this.currentTransition = 'wormhole';
      
      // Form a tunnel
      gsap.to(this.camera.position, {
          z: -1000,
          duration: 5,
          ease: "power2.in",
          onComplete: () => {
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100%'; overlay.style.height = '100%';
              overlay.style.backgroundColor = 'white';
              overlay.style.opacity = 0;
              overlay.style.zIndex = 100;
              document.body.appendChild(overlay);
              
              gsap.to(overlay, {
                  opacity: 1, duration: 1, onComplete: callback
              });
          }
      });
  }

  animateWormhole(delta, time) {
      // Particles form a cylinder around the camera Z path
      this.particles.forEach((p, i) => {
          // Target radius from Z axis
          const targetR = 50 + (i % 100);
          const currentR = Math.sqrt(p.position.x * p.position.x + p.position.y * p.position.y);
          
          const angle = Math.atan2(p.position.y, p.position.x) + delta * 2;
          
          // Interpolate to cylinder
          const newR = currentR + (targetR - currentR) * delta * 2;
          
          p.position.x = Math.cos(angle) * newR;
          p.position.y = Math.sin(angle) * newR;
          
          // Flow towards -Z
          p.position.z -= delta * 1000;
          if(p.position.z < this.camera.position.z - 2000) {
              p.position.z = this.camera.position.z + 500; // loop back in front
          }
          
          p.material.color.setHex(0xaaaaaa);
      });
  }

  triggerGRB(callback) {
      this.transitioning = true;
      this.currentTransition = 'grb';
      
      this.grbPhase = 0;
      
      // Central source
      const geo = new THREE.SphereGeometry(5, 32, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      this.grbCore = new THREE.Mesh(geo, mat);
      this.scene.add(this.grbCore);

      // Jets (invisible at first, then they expand)
      const jetGeo = new THREE.CylinderGeometry(0.1, 20, 1000, 32);
      const jetMat = new THREE.MeshBasicMaterial({ 
          color: 0x00ffff, 
          transparent: true, 
          opacity: 0,
          blending: THREE.AdditiveBlending 
      });
      this.jet1 = new THREE.Mesh(jetGeo, jetMat);
      this.jet1.position.y = 500;
      this.scene.add(this.jet1);

      this.jet2 = new THREE.Mesh(jetGeo, jetMat);
      this.jet2.position.y = -500;
      this.jet2.rotation.x = Math.PI;
      this.scene.add(this.jet2);

      // Animation sequence
      gsap.to(this, {
          grbPhase: 1, // Concentration phase
          duration: 3,
          ease: "power2.in",
          onComplete: () => {
              // Burst phase
              this.mainLight.color.setHex(0x00ffff);
              this.mainLight.intensity = 50;
              this.jet1.material.opacity = 0.8;
              this.jet2.material.opacity = 0.8;
              
              gsap.to(this.grbCore.scale, { x: 50, y: 50, z: 50, duration: 1.5 });
              gsap.to(this.jet1.scale, { x: 10, z: 10, duration: 1.5 });
              gsap.to(this.jet2.scale, { x: 10, z: 10, duration: 1.5 });

              // Move camera into the jet
              gsap.to(this.camera.position, {
                  y: 800,
                  z: 0,
                  duration: 1.5,
                  ease: "power3.in",
                  onComplete: () => {
                      const overlay = document.createElement('div');
                      overlay.style.position = 'absolute';
                      overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100%'; overlay.style.height = '100%';
                      overlay.style.backgroundColor = '#e0ffff'; // bright cyan-white
                      overlay.style.opacity = 0;
                      overlay.style.zIndex = 100;
                      document.body.appendChild(overlay);
                      
                      gsap.to(overlay, {
                          opacity: 1, duration: 0.5, onComplete: callback
                      });
                  }
              });
          }
      });
  }

  animateGRB(delta, time) {
      if (this.grbPhase < 1) {
          // Particles concentrate along the Y-axis
          this.particles.forEach(p => {
              // Move towards Y-axis
              p.position.x *= (1 - delta * 2);
              p.position.z *= (1 - delta * 2);
              // Accelerate along Y-axis slightly
              const ySign = Math.sign(p.position.y) || 1;
              p.position.y += ySign * delta * 50;
              
              p.material.color.setHex(0x00ffff);
              p.material.opacity = Math.min(1, p.material.opacity + delta);
          });
          this.grbCore.scale.setScalar(1 + this.grbPhase * 5);
      } else {
          // Burst phase: extreme acceleration along Y axis
          this.particles.forEach(p => {
              const ySign = Math.sign(p.position.y) || 1;
              p.position.y += ySign * delta * 5000;
              p.material.color.setHex(0xffffff);
          });
      }
  }
}
