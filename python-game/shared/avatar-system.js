/* =====================================================
   👕 Avatar System — Roblox-style customization
   ต้องโหลด Three.js ก่อนใช้ไฟล์นี้
   ===================================================== */
window.PY3D = window.PY3D || {};

PY3D.AVATAR_ITEMS = {
  skinTone: [
    { id: '#f0a500', label: 'ทองคลาสสิก', color: '#f0a500' },
    { id: '#c0c0c0', label: 'เงิน',       color: '#c0c0c0' },
    { id: '#cd7f32', label: 'ทองแดง',     color: '#cd7f32' },
    { id: '#66bb6a', label: 'มอสเขียว',    color: '#66bb6a' },
    { id: '#4faaff', label: 'น้ำเงินไซเบอร์', color: '#4faaff' },
    { id: '#ef5350', label: 'แดงไฟ',       color: '#ef5350' },
    { id: '#ab47bc', label: 'ม่วงพราว',    color: '#ab47bc' },
    { id: '#ffeb3b', label: 'เหลืองเลม่อน', color: '#ffeb3b' },
  ],
  hat: [
    { id: 'none',     label: 'ไม่ใส่' },
    { id: 'cap',      label: 'หมวกแก๊ป' },
    { id: 'beanie',   label: 'หมวกถุง' },
    { id: 'top_hat',  label: 'หมวกสูง' },
    { id: 'crown',    label: 'มงกุฎ 👑' },
    { id: 'wizard',   label: 'หมวกพ่อมด 🧙' },
    { id: 'horn',     label: 'หมวกเขา' },
    { id: 'antenna',  label: 'เสาอากาศคู่' },
  ],
  face: [
    { id: 'default', label: 'ปกติ' },
    { id: 'cool',    label: 'คูล 😎' },
    { id: 'happy',   label: 'ยิ้ม 😊' },
    { id: 'wink',    label: 'ขยิบตา 😉' },
    { id: 'angry',   label: 'โกรธ 😠' },
    { id: 'star',    label: 'ตาดาว ⭐' },
  ],
  shirt: [
    { id: 'tee',     label: 'เสื้อยืด' },
    { id: 'hoodie',  label: 'ฮูดดี้' },
    { id: 'suit',    label: 'สูท' },
    { id: 'armor',   label: 'เกราะ' },
    { id: 'stripe',  label: 'ลายขวาง' },
  ],
  shirtColor: [
    { id: '#306998', color: '#306998' },
    { id: '#1a5f3f', color: '#1a5f3f' },
    { id: '#c0392b', color: '#c0392b' },
    { id: '#7b1fa2', color: '#7b1fa2' },
    { id: '#f57c00', color: '#f57c00' },
    { id: '#212121', color: '#212121' },
    { id: '#ffffff', color: '#ffffff' },
    { id: '#ff79c6', color: '#ff79c6' },
  ],
  pants: [
    { id: 'short',  label: 'ขาสั้น' },
    { id: 'long',   label: 'ขายาว' },
    { id: 'jeans',  label: 'ยีนส์' },
    { id: 'shorts2',label: 'กางเกงกีฬา' },
  ],
  pantsColor: [
    { id: '#1a3d28', color: '#1a3d28' },
    { id: '#212121', color: '#212121' },
    { id: '#3a5a9c', color: '#3a5a9c' },
    { id: '#5d3a1f', color: '#5d3a1f' },
    { id: '#c0392b', color: '#c0392b' },
    { id: '#7b1fa2', color: '#7b1fa2' },
  ],
  accessory: [
    { id: 'none',     label: 'ไม่มี' },
    { id: 'backpack', label: 'เป้สะพาย' },
    { id: 'wings',    label: 'ปีก 🪽' },
    { id: 'cape',     label: 'ผ้าคลุม' },
    { id: 'scarf',    label: 'ผ้าพันคอ' },
    { id: 'jetpack',  label: 'เจ็ตแพ็ค' },
  ],
};

// ============================================================
//  สร้าง 3D mesh ของ avatar จาก config
// ============================================================
PY3D.buildAvatarMesh = function (avatar, opts = {}) {
  const a = { ...PY3D.DEFAULT_AVATAR, ...(avatar || {}) };
  const ghost = !!opts.ghost;  // หุ่นผีของฝ่ายตรงข้าม
  const tint  = opts.tint;     // สีเสริม (ฝ่ายตรงข้าม)

  const g = new THREE.Group();
  g.userData.parts = {};
  const parts = g.userData.parts;

  // --- BODY ---
  const bodyMat = new THREE.MeshStandardMaterial({
    color: a.skinTone, metalness: 0.45, roughness: 0.35,
    transparent: ghost, opacity: ghost ? 0.55 : 1
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  parts.body = body;

  // --- SHIRT (overlay บน body) ---
  const shirtMat = new THREE.MeshStandardMaterial({
    color: a.shirtColor, roughness: 0.7,
    transparent: ghost, opacity: ghost ? 0.55 : 1
  });
  if (a.shirt === 'tee') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.45, 0.72), shirtMat);
    shirt.position.y = 0.65;
    g.add(shirt);
  } else if (a.shirt === 'hoodie') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.75), shirtMat);
    shirt.position.y = 0.62;
    g.add(shirt);
    // hood
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI*2, 0, Math.PI/2), shirtMat);
    hood.position.set(0, 0.95, -0.18);
    hood.scale.set(1, 0.7, 0.7);
    g.add(hood);
  } else if (a.shirt === 'suit') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.7, 0.72), shirtMat);
    shirt.position.y = 0.55;
    g.add(shirt);
    // collar
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: ghost, opacity: ghost?0.55:1 })
    );
    collar.position.set(0, 0.8, 0.37);
    g.add(collar);
    // tie
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.4, 0.04),
      new THREE.MeshStandardMaterial({ color: '#c0392b', transparent: ghost, opacity: ghost?0.55:1 })
    );
    tie.position.set(0, 0.55, 0.38);
    g.add(tie);
  } else if (a.shirt === 'armor') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.78),
      new THREE.MeshStandardMaterial({
        color: a.shirtColor, metalness: 0.85, roughness: 0.25,
        transparent: ghost, opacity: ghost?0.55:1
      })
    );
    shirt.position.y = 0.55;
    g.add(shirt);
    // shoulder plates
    for (const sx of [-0.5, 0.5]) {
      const pad = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        shirtMat
      );
      pad.position.set(sx, 0.85, 0);
      g.add(pad);
    }
  } else if (a.shirt === 'stripe') {
    for (let i = 0; i < 3; i++) {
      const c = i % 2 === 0 ? a.shirtColor : '#ffffff';
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.93, 0.18, 0.73),
        new THREE.MeshStandardMaterial({ color: c, transparent: ghost, opacity: ghost?0.55:1 })
      );
      stripe.position.y = 0.45 + i * 0.18;
      g.add(stripe);
    }
  }

  // --- HEAD ---
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.55, 0.55),
    new THREE.MeshStandardMaterial({
      color: a.skinTone, metalness: 0.5, roughness: 0.3,
      transparent: ghost, opacity: ghost ? 0.55 : 1
    })
  );
  head.position.y = 1.15;
  head.castShadow = true;
  g.add(head);
  parts.head = head;

  // --- FACE: visor + eyes (depending on face style) ---
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, metalness: 0.9, roughness: 0.15,
      transparent: ghost, opacity: ghost?0.55:1
    })
  );
  visor.position.set(0, 1.2, 0.28);
  g.add(visor);

  const eyeColor = ghost ? (tint || 0x4faaff) : 0x4faaff;
  parts.eyes = [];

  if (a.face === 'default' || a.face === 'happy') {
    for (const ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: eyeColor, emissiveIntensity: 1
        })
      );
      eye.position.set(ex, 1.2, 0.29);
      g.add(eye);
      parts.eyes.push(eye);
    }
  } else if (a.face === 'cool') {
    // sunglasses
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.13, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.05 })
    );
    glasses.position.set(0, 1.2, 0.30);
    g.add(glasses);
  } else if (a.face === 'wink') {
    const left = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: eyeColor, emissiveIntensity: 1 })
    );
    left.position.set(-0.14, 1.2, 0.29);
    g.add(left); parts.eyes.push(left);
    // ขวาเป็นเส้น (wink)
    const right = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.025, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    );
    right.position.set(0.14, 1.2, 0.295);
    g.add(right);
  } else if (a.face === 'angry') {
    for (const ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff4444, emissiveIntensity: 1 })
      );
      eye.position.set(ex, 1.2, 0.29);
      g.add(eye); parts.eyes.push(eye);
    }
    // brows
    for (const ex of [-0.16, 0.16]) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.03, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
      );
      brow.position.set(ex, 1.32, 0.30);
      brow.rotation.z = ex > 0 ? -0.4 : 0.4;
      g.add(brow);
    }
  } else if (a.face === 'star') {
    for (const ex of [-0.14, 0.14]) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffd43b, emissiveIntensity: 1.2 })
      );
      star.position.set(ex, 1.2, 0.29);
      g.add(star); parts.eyes.push(star);
    }
  }

  // --- HAT ---
  const hatColor = a.hat === 'crown' ? 0xffd43b
                 : a.hat === 'wizard' ? 0x3a2a7c
                 : a.hat === 'beanie' ? 0xc0392b
                 : a.hat === 'top_hat' ? 0x1a1a1a
                 : a.hat === 'cap' ? a.shirtColor
                 : a.hat === 'horn' ? 0x5a3a20
                 : a.hat === 'antenna' ? 0x666666
                 : 0xffffff;
  const hatMat = new THREE.MeshStandardMaterial({
    color: hatColor, metalness: a.hat === 'crown' ? 0.9 : 0.3,
    roughness: a.hat === 'crown' ? 0.2 : 0.7,
    transparent: ghost, opacity: ghost?0.55:1
  });

  if (a.hat === 'cap') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.57), hatMat);
    cap.position.y = 1.52;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.3), hatMat);
    brim.position.set(0, 1.45, 0.4);
    g.add(brim);
  } else if (a.hat === 'beanie') {
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI*2, 0, Math.PI/2), hatMat);
    beanie.position.y = 1.48;
    beanie.scale.set(1, 0.85, 0.95);
    g.add(beanie);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: ghost, opacity: ghost?0.55:1 }));
    ball.position.y = 1.78;
    g.add(ball);
  } else if (a.hat === 'top_hat') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16), hatMat);
    base.position.y = 1.46;
    g.add(base);
    const cylin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16), hatMat);
    cylin.position.y = 1.72;
    g.add(cylin);
  } else if (a.hat === 'crown') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16), hatMat);
    ring.position.y = 1.5;
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), hatMat);
      spike.position.set(Math.cos(angle)*0.32, 1.68, Math.sin(angle)*0.32);
      g.add(spike);
      // gem
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.05, 0),
        new THREE.MeshStandardMaterial({
          color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.8,
          transparent: ghost, opacity: ghost?0.55:1
        })
      );
      gem.position.set(Math.cos(angle)*0.32, 1.55, Math.sin(angle)*0.32);
      g.add(gem);
    }
  } else if (a.hat === 'wizard') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.95, 12), hatMat);
    cone.position.y = 1.85;
    g.add(cone);
    // stars
    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.04, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffd43b, emissive: 0xffd43b, emissiveIntensity: 1,
          transparent: ghost, opacity: ghost?0.55:1
        })
      );
      const a2 = (i / 3) * Math.PI * 2;
      star.position.set(Math.cos(a2)*0.25, 1.75 + i*0.15, Math.sin(a2)*0.25);
      g.add(star);
    }
  } else if (a.hat === 'horn') {
    for (const sx of [-0.18, 0.18]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), hatMat);
      horn.position.set(sx, 1.6, 0);
      horn.rotation.z = sx > 0 ? -0.3 : 0.3;
      g.add(horn);
    }
  } else if (a.hat === 'antenna') {
    for (const sx of [-0.15, 0.15]) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6),
        hatMat
      );
      stem.position.set(sx, 1.62, 0);
      g.add(stem);
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 1,
          transparent: ghost, opacity: ghost?0.55:1
        })
      );
      ball.position.set(sx, 1.83, 0);
      g.add(ball);
    }
  }

  // --- PANTS / legs base ---
  const pantsMat = new THREE.MeshStandardMaterial({
    color: a.pantsColor, roughness: 0.85,
    transparent: ghost, opacity: ghost?0.55:1
  });
  const legHeight = a.pants === 'long' || a.pants === 'jeans' ? 0.35 : 0.18;
  const legGeo = new THREE.BoxGeometry(0.32, legHeight, 0.32);
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.set(lx, 0.15 + legHeight/2 - 0.18, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  // belt
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.93, 0.07, 0.73),
    new THREE.MeshStandardMaterial({ color: 0x111111, transparent: ghost, opacity: ghost?0.55:1 })
  );
  belt.position.y = 0.22;
  g.add(belt);

  // --- WHEELS (เก็บไว้สำหรับ animation) ---
  parts.wheels = [];
  for (const wx of [-0.35, 0.35]) {
    for (const wz of [-0.25, 0.25]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85,
          transparent: ghost, opacity: ghost?0.55:1 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.0, wz);
      wheel.visible = (a.pants !== 'long' && a.pants !== 'jeans');
      wheel.castShadow = true;
      g.add(wheel);
      parts.wheels.push(wheel);
    }
  }

  // --- ACCESSORY ---
  if (a.accessory === 'backpack') {
    const bp = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7,
        transparent: ghost, opacity: ghost?0.55:1 })
    );
    bp.position.set(0, 0.55, -0.45);
    g.add(bp);
  } else if (a.accessory === 'wings') {
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: ghost?0.4:0.85, side: THREE.DoubleSide
    });
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), wingMat);
      wing.position.set(sx * 0.4, 0.7, -0.35);
      wing.rotation.y = sx * 0.4;
      g.add(wing);
    }
  } else if (a.accessory === 'cape') {
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x7b1fa2, side: THREE.DoubleSide,
      transparent: ghost, opacity: ghost?0.55:0.95
    });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.0), capeMat);
    cape.position.set(0, 0.55, -0.4);
    cape.rotation.x = -0.1;
    g.add(cape);
  } else if (a.accessory === 'scarf') {
    const scarfMat = new THREE.MeshStandardMaterial({
      color: 0xff4444, transparent: ghost, opacity: ghost?0.55:1
    });
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 16), scarfMat);
    wrap.position.set(0, 0.95, 0);
    wrap.rotation.x = Math.PI/2;
    g.add(wrap);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.05), scarfMat);
    tail.position.set(0.15, 0.7, 0.2);
    g.add(tail);
  } else if (a.accessory === 'jetpack') {
    const jp = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.6, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3,
        transparent: ghost, opacity: ghost?0.55:1 })
    );
    jp.position.set(0, 0.6, -0.5);
    g.add(jp);
    // flames
    for (const sx of [-0.12, 0.12]) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.25, 6),
        new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 })
      );
      flame.position.set(sx, 0.25, -0.5);
      flame.rotation.x = Math.PI;
      g.add(flame);
    }
  }

  // --- Direction arrow (white cone) ---
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.3, 4),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6,
      transparent: true, opacity: ghost ? 0.4 : 0.85
    })
  );
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.55, 0.55);
  g.add(arrow);
  parts.arrow = arrow;

  // --- Glow ring under ---
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.55, 24),
    new THREE.MeshBasicMaterial({
      color: ghost ? (tint || 0xff79c6) : 0xffd43b,
      transparent: true, opacity: ghost ? 0.4 : 0.2,
      side: THREE.DoubleSide
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  g.add(glow);
  parts.glow = glow;

  return g;
};
