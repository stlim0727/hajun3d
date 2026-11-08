/**
 * Sky Jet Explorer 3D - Procedural 3D Aircraft Models, Liveries, Airfoils, Fans & Upswept Fuselage
 * Subsystem: aircraft_builder (9 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 5. 프로시저럴 항공사 그래픽 텍스처 & 실기형 공기역학 에어로다이내믹 3D 모델링
  // ----------------------------------------------------------------

  // ★ 실기형 NACA 슈퍼크리티컬 에어포일 곡면 날개 지오메트리 (앞은 둥글고 위는 볼록, 뒤는 날렵한 실기 날개)
  createAirfoilWingGeo(span, rootChord, tipChord, maxThick = 0.52, sweepBack = 3.5, dihedral = 0.8, isLeft = true) {
    try {
      const chordSegs = 20; // 코드 방향 곡선 분할
      const spanSegs = 12;  // 스팬 방향 분할
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      const sign = isLeft ? -1 : 1;

      // 공기역학 NACA 에어포일 단면 2D 포인트 생성 (Leading Edge = 0, Trailing Edge = 1)
      const profilePoints = [];
      for (let i = 0; i <= chordSegs; i++) {
        const u = i / chordSegs;
        // NACA 0012 수식 기반 윗면 양력 캠버 곡선
        const yt = 5 * 0.12 * (0.2969 * Math.sqrt(Math.max(0, u)) - 0.1260 * u - 0.3516 * (u * u) + 0.2843 * (u * u * u) - 0.1015 * (u * u * u * u));
        profilePoints.push({ x: u, y: yt * 1.08 });
      }
      for (let i = chordSegs - 1; i >= 1; i--) {
        const u = i / chordSegs;
        const yt = 5 * 0.12 * (0.2969 * Math.sqrt(Math.max(0, u)) - 0.1260 * u - 0.3516 * (u * u) + 0.2843 * (u * u * u) - 0.1015 * (u * u * u * u));
        profilePoints.push({ x: u, y: -yt * 0.58 }); // 아랫면은 상대적으로 완만하게 처리
      }
      const numProfilePts = profilePoints.length;

      // 스팬을 따라 날개 버텍스 생성 (Root -> Tip 테이퍼, 후퇴각, 상반각)
      for (let s = 0; s <= spanSegs; s++) {
        const sFrac = s / spanSegs; // 0 (root) ~ 1 (tip)
        const currentChord = rootChord + sFrac * (tipChord - rootChord);
        const currentThick = maxThick * (1 - sFrac * 0.42);
        const currentX = sign * sFrac * span;
        const currentZ = sFrac * sweepBack;
        const currentY = sFrac * dihedral;

        for (let p = 0; p < numProfilePts; p++) {
          const pt = profilePoints[p];
          const zPos = currentZ + (pt.x - 0.32) * currentChord;
          const yPos = currentY + pt.y * currentThick;
          const xPos = currentX;

          positions.push(xPos, yPos, zPos);
          uvs.push(pt.x, sFrac);
        }
      }

      // 면(Face) 생성
      for (let s = 0; s < spanSegs; s++) {
        const row1 = s * numProfilePts;
        const row2 = (s + 1) * numProfilePts;
        for (let p = 0; p < numProfilePts; p++) {
          const pNext = (p + 1) % numProfilePts;
          const a = row1 + p;
          const b = row2 + p;
          const c = row2 + pNext;
          const d = row1 + pNext;
          if (isLeft) {
            indices.push(a, b, c);
            indices.push(a, c, d);
          } else {
            indices.push(a, c, b);
            indices.push(a, d, c);
          }
        }
      }

      // 날개 끝(Tip) 캡
      const tipRow = spanSegs * numProfilePts;
      for (let p = 1; p < numProfilePts - 1; p++) {
        if (isLeft) {
          indices.push(tipRow, tipRow + p, tipRow + p + 1);
        } else {
          indices.push(tipRow, tipRow + p + 1, tipRow + p);
        }
      }
      // 날개 뿌리(Root) 캡
      for (let p = 1; p < numProfilePts - 1; p++) {
        if (isLeft) {
          indices.push(0, p + 1, p);
        } else {
          indices.push(0, p, p + 1);
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      geo.computeVertexNormals();
      return geo;
    } catch (e) {
      console.warn('Airfoil geometry fallback:', e);
      return new THREE.BoxGeometry(span, maxThick, rootChord);
    }
  },

  // ★ 실기형 유선형 노즈 콘 지오메트리 (레이돔에서 조종석 캐노피로 이어지는 일체형 곡면)
  createStreamlinedNoseGeo(radius, length, radialSeg = 32, lengthSeg = 16) {
    try {
      const geo = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let l = 0; l <= lengthSeg; l++) {
        const t = l / lengthSeg; // 0 at nose radome, 1 at cabin junction
        const r = radius * Math.pow(Math.max(0, Math.sin(t * Math.PI / 2)), 0.60);
        const z = -length * (1 - t);
        const yDrop = (1 - t) * 0.12 * radius; // 앞쪽으로 갈수록 살짝 드룹되는 실제 여객기 노즈

        for (let rIdx = 0; rIdx <= radialSeg; rIdx++) {
          const theta = (rIdx / radialSeg) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const x = r * sinT * 0.98;
          const y = r * cosT * 0.94 - yDrop;

          positions.push(x, y, z);
          uvs.push(rIdx / radialSeg, t);
        }
      }

      for (let l = 0; l < lengthSeg; l++) {
        const row1 = l * (radialSeg + 1);
        const row2 = (l + 1) * (radialSeg + 1);
        for (let r = 0; r < radialSeg; r++) {
          const a = row1 + r;
          const b = row2 + r;
          const c = row2 + r + 1;
          const d = row1 + r + 1;
          indices.push(a, b, c);
          indices.push(a, c, d);
        }
      }

      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geo.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
      geo.computeVertexNormals();
      return geo;
    } catch (e) {
      console.warn('Nose geometry fallback:', e);
      return new THREE.SphereGeometry(radius, 24, 16);
    }
  },

  // ★ 실기형 고속 회전 티타늄 터보팬 블레이드 시스템 (Titanium Turbofan Fan Blades)
  createTurbofanFan(radius, bladeCount = 20, chromeMat) {
    const fanGroup = new THREE.Group();

    // 1. 중앙 스피너 콘 (중앙 화이트 소용돌이 스파이럴 마킹)
    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.75
    });
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.26, radius * 0.58, 18), spinnerMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.set(0, 0, radius * 0.12);
    fanGroup.add(spinner);

    const spiralRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.13, radius * 0.024, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spiralRing.position.set(0, 0, radius * 0.06);
    fanGroup.add(spiralRing);

    // 2. 20여 장의 정교한 에어로다이내믹 티타늄 팬 블레이드 (각도 비틀림 캠버 적용)
    const bladeGeo = new THREE.BoxGeometry(radius * 0.09, radius * 0.70, radius * 0.038);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      metalness: 0.92,
      roughness: 0.18
    });

    for (let b = 0; b < bladeCount; b++) {
      const angle = (b / bladeCount) * Math.PI * 2;
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = angle;

      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(0, radius * 0.50, 0);
      blade.rotation.x = 0.56; // 32도 공기역학 피치각
      blade.rotation.y = 0.10;
      bladeHolder.add(blade);
      fanGroup.add(bladeHolder);
    }

    return fanGroup;
  },

  createUpsweptAftFuselageGeo(rCabin, rTail, length, radialSeg = 32, heightSeg = 16) {
    const geo = new THREE.CylinderGeometry(rTail, rCabin, length, radialSeg, heightSeg);
    const pos = geo.attributes.position;
    const halfLen = length / 2;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y - (-halfLen)) / length; // 0.0 at cabin, 1.0 at tail
      const rise = t * (rCabin - rTail);
      pos.setZ(i, pos.getZ(i) - rise); // 로컬 Z 감소 -> 월드 Y 회전 시 위로 부드럽게 상승
    }
    geo.computeVertexNormals();
    return geo;
  },

  // ★ AI 생성급 초고해상도 실사 캔버스 그래픽 텍스처 (동체 리버리 & 음영 & 3D 엠보싱)
  updateFuselageTexture(type, isNight) {
    if (!this.fuselageCanvas) {
      this.fuselageCanvas = document.createElement('canvas');
      this.fuselageCanvas.width = 2048;
      this.fuselageCanvas.height = 1024;
      this.fuselageCtx = this.fuselageCanvas.getContext('2d');
      this.fuselageTexture = new THREE.CanvasTexture(this.fuselageCanvas);
      this.fuselageTexture.anisotropy = 8;
    }
    const ctx = this.fuselageCtx;
    const W = 2048;
    const H = 1024;
    ctx.clearRect(0, 0, W, H);

    const drawRoundRect = (c, x, y, w, h, r) => {
      if (c.roundRect) c.roundRect(x, y, w, h, r);
      else c.rect(x, y, w, h);
    };

    // 1. 에어로 펄 화이트 & 알루미늄 배면 3D 셰이딩 베이스 코트
    const baseGrad = ctx.createLinearGradient(0, 0, W, 0);
    baseGrad.addColorStop(0.00, '#94a3b8'); // 배면(Belly) 하단 메탈릭 알루미늄 음영
    baseGrad.addColorStop(0.12, '#cbd5e1');
    baseGrad.addColorStop(0.20, '#f1f5f9');
    baseGrad.addColorStop(0.25, '#ffffff'); // 우현(Starboard) 중심
    baseGrad.addColorStop(0.35, '#f8fafc');
    baseGrad.addColorStop(0.50, '#ffffff'); // 상단 루프(Crown) 하이글로스 펄
    baseGrad.addColorStop(0.65, '#f8fafc');
    baseGrad.addColorStop(0.75, '#ffffff'); // 좌현(Port) 중심
    baseGrad.addColorStop(0.80, '#f1f5f9');
    baseGrad.addColorStop(0.88, '#cbd5e1');
    baseGrad.addColorStop(1.00, '#94a3b8'); // 배면 하단
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 3D 엠보싱 듀랄루민 외피 패널 라인 (Panel Lines) & 리벳 헤드
    // 가로 종방향 패널 라인 (Dark groove + Light highlight)
    for (let y = 35; y < H - 20; y += 54) {
      // 짙은 틈새선
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.40)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();

      // 밝은 하이라이트선 (1px 아래)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, y + 1.2);
      ctx.lineTo(W, y + 1.2);
      ctx.stroke();

      // 입체 리벳 열 (어두운 점 + 흰색 반사)
      for (let x = 8; x < W; x += 14) {
        ctx.fillStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.fillRect(x, y - 0.5, 1.4, 1.4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(x, y + 0.6, 1.0, 1.0);
      }
    }

    // 세로 원주방향 패널 라인
    for (let x = 48; x < W; x += 112) {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + 1.0, 0);
      ctx.lineTo(x + 1.0, H);
      ctx.stroke();
    }

    // 3. 프리미엄 항공사 스우시 리버리 (Dynamic Aero Swoosh Livery)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;

      // 로열 네이비 하부 다이내믹 웨이브
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(cx - 95 * side, 960);
      ctx.bezierCurveTo(cx - 60 * side, 620, cx - 40 * side, 320, cx - 120 * side, 30);
      ctx.lineTo(cx - 90 * side, 30);
      ctx.bezierCurveTo(cx - 18 * side, 320, cx - 32 * side, 620, cx - 68 * side, 960);
      ctx.closePath();
      ctx.fill();

      // 스카이블루 메인 치트라인
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx - 58 * side, 965);
      ctx.bezierCurveTo(cx - 22 * side, 620, cx - 4 * side, 320, cx - 72 * side, 30);
      ctx.lineTo(cx - 42 * side, 30);
      ctx.bezierCurveTo(cx + 22 * side, 320, cx + 6 * side, 620, cx - 30 * side, 965);
      ctx.closePath();
      ctx.fill();

      // 골드 핀스트라이프 하이라이트
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx - 26 * side, 940);
      ctx.bezierCurveTo(cx + 4 * side, 620, cx + 20 * side, 320, cx - 32 * side, 50);
      ctx.lineTo(cx - 16 * side, 50);
      ctx.bezierCurveTo(cx + 34 * side, 320, cx + 16 * side, 620, cx - 10 * side, 940);
      ctx.closePath();
      ctx.fill();
    });

    // 4. 항공사 정식 브랜드 레터링 & 등록 부호 (Airline Titles & Tail Number)
    const regCode = (type === 'b747') ? 'HL7472' : (type === 'dc10' ? 'HL7310' : (type === 'md80' ? 'HL7204' : (type === 'a320' ? 'HL8031' : (type === 'concorde' ? 'F-BTSC' : 'RESCUE-01'))));
    const modelTitle = (type === 'b747') ? 'BOEING 747-400' : (type === 'dc10' ? 'McDONNELL DOUGLAS DC-10' : (type === 'md80' ? 'MD-80 TWIN JET' : (type === 'a320' ? 'AIRBUS A320' : (type === 'concorde' ? 'CONCORDE SST' : 'AMPHIBIAN EXPLORER'))));

    // 좌현(Port, X=1536) 텍스트
    ctx.save();
    ctx.translate(1536 + 72, 620);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('SKY JET AIRWAYS', 0, 0);
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(modelTitle, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(1536 + 60, 210);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(regCode, 0, 0);
    ctx.restore();

    // 우현(Starboard, X=512) 텍스트
    ctx.save();
    ctx.translate(512 - 72, 620);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText('SKY JET AIRWAYS', 0, 0);
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText(modelTitle, 0, 24);
    ctx.restore();

    ctx.save();
    ctx.translate(512 - 60, 210);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(regCode, 0, 0);
    ctx.restore();

    // 5. 정밀 승객 객실 창문 열 (Cabin Windows - 주간: 편광 반사글래스 & 실내 좌석 실루엣 / 야간: 골든 옐로우 조명)
    const winW = 16;
    const winH = 26;
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;
      for (let y = 830; y >= 165; y -= 32) {
        // 크롬 창문 이중 베젤
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        drawRoundRect(ctx, cx - winW / 2 - 3, y - winH / 2 - 3, winW + 6, winH + 6, 7);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        drawRoundRect(ctx, cx - winW / 2 - 1.5, y - winH / 2 - 1.5, winW + 3, winH + 3, 5);
        ctx.fill();

        if (isNight) {
          // 야간: 창문 내부에서 따뜻하게 빛나는 승객실 황금빛 조명 & 창문 앰비언트 글로우
          ctx.fillStyle = 'rgba(253, 224, 71, 0.40)';
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2 - 8, y - winH / 2 - 8, winW + 16, winH + 16, 9);
          ctx.fill();

          const winGrad = ctx.createLinearGradient(0, y - winH / 2, 0, y + winH / 2);
          winGrad.addColorStop(0.0, '#fef08a');
          winGrad.addColorStop(0.5, '#facc15');
          winGrad.addColorStop(1.0, '#f59e0b');
          ctx.fillStyle = winGrad;
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2, y - winH / 2, winW, winH, 4);
          ctx.fill();

          // 승객 좌석 헤드레스트 실루엣
          if ((y % 64) === 0) {
            ctx.fillStyle = 'rgba(180, 83, 9, 0.55)';
            ctx.fillRect(cx - winW / 2 + 2, y - winH / 2 + 2, winW - 4, 7);
          }
        } else {
          // 주간: 깊은 에어로 블루 틴티드 편광 글래스 + 실내 헤드레스트 + 대각선 반사 하이라이트
          const winGrad = ctx.createLinearGradient(cx - winW / 2, y - winH / 2, cx + winW / 2, y + winH / 2);
          winGrad.addColorStop(0.0, '#0c4a6e');
          winGrad.addColorStop(0.5, '#0284c7');
          winGrad.addColorStop(1.0, '#075985');
          ctx.fillStyle = winGrad;
          ctx.beginPath();
          drawRoundRect(ctx, cx - winW / 2, y - winH / 2, winW, winH, 4);
          ctx.fill();

          // 실내 좌석/블라인드 실루엣
          ctx.fillStyle = 'rgba(12, 74, 110, 0.8)';
          ctx.fillRect(cx - winW / 2 + 2, y - winH / 2 + 1, winW - 4, (y % 96 === 0 ? 11 : 6));

          // 대각 하이라이트 글레어
          ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
          ctx.beginPath();
          ctx.moveTo(cx - winW / 2 + 2, y - winH / 2 + 2);
          ctx.lineTo(cx + winW / 2 - 4, y - winH / 2 + 2);
          ctx.lineTo(cx - winW / 2 + 2, y + winH / 2 - 5);
          ctx.closePath();
          ctx.fill();
        }
      }

      // B747 2층 어퍼덱 창문 열
      if (type === 'b747') {
        const uX = cx + (side === -1 ? 62 : -62);
        for (let y = 830; y >= 530; y -= 32) {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          drawRoundRect(ctx, uX - winW / 2 - 2, y - winH / 2 - 2, winW + 4, winH + 4, 6);
          ctx.fill();

          if (isNight) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            drawRoundRect(ctx, uX - winW / 2, y - winH / 2, winW, winH, 4);
            ctx.fill();
          } else {
            ctx.fillStyle = '#0c4a6e';
            ctx.beginPath();
            drawRoundRect(ctx, uX - winW / 2, y - winH / 2, winW, winH, 4);
            ctx.fill();
          }
        }
      }
    });

    // 6. 탑승용 도어 (Boarding Doors) & 비상 탈출구 (Emergency Exits)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 1536 : 512;
      [860, 560, 260].forEach((dy) => {
        const doorW = 36;
        const doorH = 72;

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.6;
        ctx.strokeRect(cx - doorW / 2, dy - doorH / 2, doorW, doorH);

        ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
        ctx.fillRect(cx - doorW / 2 + 1, dy - doorH / 2 + 1, doorW - 2, doorH - 2);

        // 도어 윈도우
        ctx.fillStyle = isNight ? '#fef08a' : '#0369a1';
        ctx.beginPath();
        drawRoundRect(ctx, cx - 6, dy - doorH / 2 + 10, 12, 18, 5);
        ctx.fill();

        // 도어 핸들 레버
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx + (side === -1 ? 6 : -13), dy + 6, 7, 16);

        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.fillStyle = '#dc2626';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', cx, dy - doorH / 2 - 5);
      });

      // 주익 상부 비상 탈출구 (Overwing Exits)
      [460, 420].forEach(ey => {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(cx - 15, ey - 20, 30, 40);
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', cx, ey - 24);
      });
    });

    // 7. 하부 화물칸 도어 (Cargo Doors) & 힌지
    [750, 340].forEach(cy => {
      const cgX = 330;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(cgX - 38, cy - 26, 76, 52);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cgX + 20, cy - 5, 9, 9);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cgX - 35, cy - 5, 8, 8);
    });

    // 8. 노즈 안티글레어 브로우 & 피토관 경고 마킹
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(1024, 940, 58, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 피토관 경고 스텐실
    [960, 1088].forEach(px => {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.fillRect(px - 14, 915, 28, 7);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PITOT', px, 921);
    });

    this.fuselageTexture.needsUpdate = true;
    return this.fuselageTexture;
  },

  // ★ AI 생성급 초고해상도 실사 주익 텍스처 (크롬 슬랫, 알루미늄 패널, 플랩/스포일러, NO STEP 경고)
  updateWingTexture(type, isNight) {
    if (!this.wingCanvas) {
      this.wingCanvas = document.createElement('canvas');
      this.wingCanvas.width = 1024;
      this.wingCanvas.height = 512;
      this.wingCtx = this.wingCanvas.getContext('2d');
      this.wingTexture = new THREE.CanvasTexture(this.wingCanvas);
      this.wingTexture.anisotropy = 8;
    }
    const ctx = this.wingCtx;
    const W = 1024;
    const H = 512;
    ctx.clearRect(0, 0, W, H);

    // 1. 에어로 알루미늄 라이트 그레이 메탈릭 베이스
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, W, H);

    // 2. 전연 고광택 미러 크롬 슬랫 밴드 (Leading Edge Chrome Slat)
    const slatGrad = ctx.createLinearGradient(0, 0, 0, 68);
    slatGrad.addColorStop(0.0, '#ffffff');
    slatGrad.addColorStop(0.35, '#f1f5f9');
    slatGrad.addColorStop(0.65, '#94a3b8');
    slatGrad.addColorStop(1.0, '#64748b');
    ctx.fillStyle = slatGrad;
    ctx.fillRect(0, 0, W, 58);

    // 슬랫 분할선
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.lineWidth = 1.6;
    for (let sx = 65; sx < W; sx += 78) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, 58);
      ctx.stroke();
    }

    // 3. 윙 스킨 알루미늄 패널 라인 & 리벳
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.4;
    for (let x = 60; x < W; x += 85) {
      ctx.beginPath();
      ctx.moveTo(x, 58);
      ctx.lineTo(x, H - 42);
      ctx.stroke();
    }
    for (let y = 105; y < H - 42; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 4. 후연 카본 복합재 플랩 & 스포일러 분할선 (Trailing Edge Flaps & Spoilers)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, H - 42, W, 42);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    for (let fx = 110; fx < W; fx += 145) {
      ctx.beginPath();
      ctx.moveTo(fx, H - 42);
      ctx.lineTo(fx, H);
      ctx.stroke();

      // 플랩 힌지 브라켓
      ctx.fillStyle = '#64748b';
      ctx.fillRect(fx - 4, H - 28, 8, 12);
    }

    // 5. 정밀 "NO STEP" 안전 경계선 & 비상 탈출 가이드
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.0;
    ctx.strokeRect(110, 105, W - 220, H - 190);

    ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.lineWidth = 1.5;
    for (let k = 130; k < W - 130; k += 38) {
      ctx.beginPath();
      ctx.moveTo(k, 105);
      ctx.lineTo(k + 28, H - 85);
      ctx.stroke();
    }

    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    for (let tx = 200; tx < W - 180; tx += 170) {
      ctx.fillText('NO STEP', tx, 128);
      ctx.fillText('NO STEP', tx, H - 100);
    }

    ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('EMERGENCY ESCAPE ROUTE ▶▶', W / 2, H / 2);

    // 6. 타원형 연료 탱크 점검 해치 (Fuel Tank Access Panels)
    for (let px = 160; px < W - 140; px += 130) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(px, 82, 22, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      // 해치 볼트 원형 배치
      ctx.fillStyle = '#334155';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.fillRect(px + Math.cos(a) * 17 - 1, 82 + Math.sin(a) * 9 - 1, 2, 2);
      }
    }

    this.wingTexture.needsUpdate = true;
    return this.wingTexture;
  },

  // ----------------------------------------------------------------
  // 기종 빌드 & 100% 바이너리 GLB 3D 기체 로드
  // ----------------------------------------------------------------
  buildAircraft(type) {
    if (type) this.currentPlaneType = type;
    type = type || this.currentPlaneType || 'a320';
    if (!this.planeGroup) {
      this.planeGroup = new THREE.Group();
      this.scene.add(this.planeGroup);
    }
    this.loadGLBPreset(type);
  },

  // ----------------------------------------------------------------
  // 5. 프로시저럴 3D 제트 여객기 (오프라인/비상 백업 렌더러)
  // ----------------------------------------------------------------
  buildProceduralAircraft(type) {
    if (type) this.currentPlaneType = type;
    type = type || this.currentPlaneType || 'a320';
    let savedPos = null;
    let savedQuat = null;
    if (this.planeGroup) {
      savedPos = this.planeGroup.position.clone();
      savedQuat = this.planeGroup.quaternion.clone();
      this.scene.remove(this.planeGroup);
    }

    this.planeGroup = new THREE.Group();
    if (savedPos) this.planeGroup.position.copy(savedPos);
    if (savedQuat) this.planeGroup.quaternion.copy(savedQuat);
    this.scene.add(this.planeGroup);
    this.landingGears = [];
    this.wheels = [];
    this.turbofans = [];
    this.engineExhaustPoints = [];
    this.debrisPieces = [];
    this.isNoseDented = false;
    this.isGearCollapsed = false;

    // 조종면 초기화
    this.controlSurfaces = {
      leftAileron: null,
      rightAileron: null,
      leftElevator: null,
      rightElevator: null,
      rudder: null,
      noseWheelGroup: null
    };

    const isNight = (this.timeOfDay === 'night');
    const liveryTex = this.updateFuselageTexture(type, isNight);
    const wingTex = this.updateWingTexture(type, isNight);

    // 프리미엄 항공사 PBR 재질 & 프로시저럴 고해상도 그래픽 텍스처 (실제 항공기 하이글로스 반사광)
    const liveryMat = new THREE.MeshStandardMaterial({
      map: liveryTex,
      roughness: 0.18,
      metalness: 0.28
    });
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.20,
      metalness: 0.25
    });
    const cheatlineMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.38
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.75
    });
    const wingMat = new THREE.MeshStandardMaterial({
      map: wingTex,
      roughness: 0.24,
      metalness: 0.32
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.08
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x091428,
      roughness: 0.08,
      metalness: 0.96,
      transparent: true,
      opacity: 0.92
    });
    const cabinWindowMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0xfef08a : 0x38bdf8,
      roughness: 0.2,
      metalness: 0.8,
      emissive: isNight ? 0xf59e0b : 0x0284c7,
      emissiveIntensity: isNight ? 1.35 : 0.4
    });
    this.cabinWindowMat = cabinWindowMat;
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });

    // 랜딩기어 생성 헬퍼 (개폐형 도어 덮개 & 4륜 대차 및 2륜 노즈 기어 지원)
    const makeGear = (x, y, z, isNose = false, is4WheelBogie = false) => {
      const gearAssembly = new THREE.Group();
      gearAssembly.position.set(x, y, z);

      // 1. 기어 베이 웰 박스 (기어 수납 격실 & 도어 프레임)
      const bayW = is4WheelBogie ? 2.8 : (isNose ? 2.0 : 2.2);
      const bayL = is4WheelBogie ? 5.2 : (isNose ? 3.6 : 3.8);
      const bayH = 0.5;

      const bayInteriorGeo = new THREE.BoxGeometry(bayW * 0.94, bayH, bayL * 0.94);
      const bayInteriorMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.9,
        metalness: 0.3
      });
      const bayInterior = new THREE.Mesh(bayInteriorGeo, bayInteriorMat);
      bayInterior.position.set(0, bayH / 2, 0);
      gearAssembly.add(bayInterior);

      // 2. 좌우 개폐형 도어 덮개 (Gear Bay Doors)
      // 좌측 도어 피벗
      const doorLGroup = new THREE.Group();
      doorLGroup.position.set(-bayW / 2, 0.05, 0);
      const doorPanelW = (bayW / 2) * 0.96;
      const doorMeshL = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.12, bayL * 0.95), fuselageMat);
      doorMeshL.position.set(doorPanelW / 2, 0, 0);
      doorMeshL.castShadow = true;
      doorLGroup.add(doorMeshL);

      const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW * 0.85, 0.08, bayL * 0.85), chromeMat);
      doorFrameL.position.set(doorPanelW / 2, 0.06, 0);
      doorLGroup.add(doorFrameL);
      gearAssembly.add(doorLGroup);

      // 우측 도어 피벗
      const doorRGroup = new THREE.Group();
      doorRGroup.position.set(bayW / 2, 0.05, 0);
      const doorMeshR = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW, 0.12, bayL * 0.95), fuselageMat);
      doorMeshR.position.set(-doorPanelW / 2, 0, 0);
      doorMeshR.castShadow = true;
      doorRGroup.add(doorMeshR);

      const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(doorPanelW * 0.85, 0.08, bayL * 0.85), chromeMat);
      doorFrameR.position.set(-doorPanelW / 2, 0.06, 0);
      doorRGroup.add(doorFrameR);
      gearAssembly.add(doorRGroup);

      // 3. 기어 스트럿 회전 피벗 (베이 상부 중앙 회전축)
      const strutPivot = new THREE.Group();
      strutPivot.position.set(0, 0.1, isNose ? -0.2 : 0.2);

      // 충격 흡수 메인 올레오 스트럿 (Main Oleo Strut)
      const strutH = 3.4;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, strutH, 14), chromeMat);
      strut.position.set(0, -strutH / 2, 0);
      strut.castShadow = true;
      strutPivot.add(strut);

      // 측면 브레이스 드래그 스트럿
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), chromeMat);
      brace.position.set(0, -1.0, isNose ? 0.9 : -0.9);
      brace.rotation.x = isNose ? -0.55 : 0.55;
      strutPivot.add(brace);

      // 가위형 토크 링크 (Scissor Torque Links)
      const link1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.18), chromeMat);
      link1.position.set(0, -2.0, isNose ? 0.35 : -0.35);
      link1.rotation.x = isNose ? 0.45 : -0.45;
      strutPivot.add(link1);

      const link2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.18), chromeMat);
      link2.position.set(0, -2.6, isNose ? 0.35 : -0.35);
      link2.rotation.x = isNose ? -0.45 : 0.45;
      strutPivot.add(link2);

      let bogieBeamGroup = null;

      if (is4WheelBogie) {
        // --------------------------------------------------------
        // ★ 4륜 보기 대차 (4-Wheel Bogie: 전후 2축 4바퀴)
        // --------------------------------------------------------
        bogieBeamGroup = new THREE.Group();
        bogieBeamGroup.position.set(0, -3.2, 0);

        // 보기 빔 바 (Bogie Beam)
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 2.8), chromeMat);
        beam.castShadow = true;
        bogieBeamGroup.add(beam);

        // 전방 축(Z=-1.0) & 후방 축(Z=+1.0)
        [-1.0, 1.0].forEach(axleZ => {
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 12), chromeMat);
          axle.rotation.z = Math.PI / 2;
          axle.position.set(0, 0, axleZ);
          bogieBeamGroup.add(axle);

          [-1.05, 1.05].forEach(wheelX => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wheelX, 0, axleZ);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.62, 20), tireMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.64, 16), chromeMat);
            hub.rotation.z = Math.PI / 2;
            wheelGroup.add(hub);

            const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.68, 10), chromeMat);
            hubCap.rotation.z = Math.PI / 2;
            wheelGroup.add(hubCap);

            bogieBeamGroup.add(wheelGroup);
            this.wheels.push(tire);
          });
        });

        strutPivot.add(bogieBeamGroup);

      } else {
        // --------------------------------------------------------
        // 2륜 기어 (노즈 기어 및 일반 2바퀴 기어)
        // --------------------------------------------------------
        const axleGroup = new THREE.Group();
        axleGroup.position.set(0, -3.2, 0);

        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, isNose ? 1.6 : 2.0, 10), chromeMat);
        axle.rotation.z = Math.PI / 2;
        axleGroup.add(axle);

        const wheelOffset = isNose ? 0.65 : 0.85;
        [-wheelOffset, wheelOffset].forEach(wheelX => {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.78 : 0.92, isNose ? 0.78 : 0.92, isNose ? 0.48 : 0.55, 18),
            tireMat
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wheelX, 0, 0);
          wheel.castShadow = true;
          axleGroup.add(wheel);

          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(isNose ? 0.42 : 0.48, isNose ? 0.42 : 0.48, isNose ? 0.5 : 0.58, 14),
            chromeMat
          );
          hub.rotation.z = Math.PI / 2;
          hub.position.set(wheelX, 0, 0);
          axleGroup.add(hub);

          this.wheels.push(wheel);
        });

        strutPivot.add(axleGroup);

        if (isNose) {
          this.controlSurfaces.noseWheelGroup = axleGroup;
        }
      }

      gearAssembly.add(strutPivot);

      // 초기 상태 반영 (DOWN/UP 상태에 따른 초기 회전 각도)
      const isDown = (this.gearPhase === 'DOWN' || (this.gearPhase !== 'UP' && this.gearExtended));
      if (isDown) {
        strutPivot.rotation.x = 0;
        strutPivot.visible = true;
        doorLGroup.rotation.z = 0;
        doorRGroup.rotation.z = 0;
      } else {
        strutPivot.rotation.x = -Math.PI / 2;
        strutPivot.visible = false;
        doorLGroup.rotation.z = 0;
        doorRGroup.rotation.z = 0;
      }

      gearAssembly.userData = {
        strutPivot: strutPivot,
        doorL: doorLGroup,
        doorR: doorRGroup,
        bogieBeam: bogieBeamGroup,
        isNose: isNose,
        is4WheelBogie: is4WheelBogie,
        origPos: new THREE.Vector3(x, y, z)
      };

      this.planeGroup.add(gearAssembly);
      this.landingGears.push(gearAssembly);
    };

    if (type === 'dc10') {
      // ------------------------------------------------------------
      // [DC-10 삼발기] 와이드바디 점보 여객기 (NACA 에어포일 곡면익 & 유선형 노즈 & 회전 터보팬)
      // ------------------------------------------------------------
      // 1. 유선형 고정밀 동체 (Fuselage with Realistic Aft Upsweep & Graphic Livery)
      // 1) 중앙 승객 객실 원통 동체 (Main Cabin Fuselage)
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 17, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // 2) ★ 동체 후방 업스윕 섹션 (Aft Fuselage Upsweep: 상단 수평 유지, 하부 배면이 위로 부드럽게 솟아오름!)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.9, 1.65, 10.5, 32, 16), liveryMat);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.position.set(0, 0, 10.25);
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 3) ★ 테일콘 & APU 배기 노즐 (Tail Cone & APU Exhaust)
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.65, 4.8, 32), fuselageMat);
      tailCone.position.set(0, 1.25, 17.9);
      tailCone.rotation.x = Math.PI / 2 + 0.12;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 10, 20), chromeMat);
      apuNozzle.position.set(0, 1.60, 20.3);
      this.planeGroup.add(apuNozzle);

      // 4) ★ 동체 하부 밸리 페어링 (Wing-Body Belly Fairing: 날개와 동체를 잇는 공기역학 팽창부)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.45, 14.5), fuselageMat);
      bellyFairing.position.set(0, -2.1, 0.0);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 유선형 노즈 콘 (장난감 반구/원뿔이 아닌 매끄러운 에어로다이내믹 노즈)
      const noseGeo = this.createStreamlinedNoseGeo(2.9, 8.2, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -12);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (곡면에 일체화된 실기형 캐노피 프레임)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.12, 2.2), glassMat);
      windshield.position.set(0, 1.78, -11.4);
      windshield.rotation.x = 0.36;
      this.planeGroup.add(windshield);

      // 2. ★ 실기형 NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeWingSection = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ NACA 0012 기반 슈퍼크리티컬 곡면 에어포일 메쉬 (앞은 둥글고 위는 양력 캠버 곡선, 뒤는 날렵)
        const airfoilGeo = this.createAirfoilWingGeo(18.5, 7.2, 2.4, 0.54, 4.0, 0.95, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.38, 0.50), chromeMat);
        slat.position.set(sign * 9.8, 0.28, sign * -1.6 - 2.6);
        slat.rotation.y = -sign * 0.38;
        slat.rotation.z = -sign * 0.07;
        wing.add(slat);

        // ★ 플랩 트랙 카누 페어링 3기 (Flap Track Canoe Fairings)
        [5.4, 9.2, 13.4].forEach((canoeX, cIdx) => {
          const canoeGroup = new THREE.Group();
          const canoeLen = 3.6 - cIdx * 0.4;
          const canoeR = 0.28 - cIdx * 0.02;

          const cBody = new THREE.Mesh(new THREE.CylinderGeometry(canoeR, canoeR * 0.85, canoeLen * 0.6, 12), fuselageMat);
          cBody.rotation.x = Math.PI / 2;
          cBody.castShadow = true;
          canoeGroup.add(cBody);

          const cTail = new THREE.Mesh(new THREE.ConeGeometry(canoeR, canoeLen * 0.4, 12), chromeMat);
          cTail.rotation.x = -Math.PI / 2;
          cTail.position.set(0, 0, canoeLen * 0.5);
          canoeGroup.add(cTail);

          const cNose = new THREE.Mesh(new THREE.SphereGeometry(canoeR, 10, 8), chromeMat);
          cNose.position.set(0, 0, -canoeLen * 0.3);
          canoeGroup.add(cNose);

          const zOffset = (cIdx === 0 ? 3.0 : (cIdx === 1 ? 1.6 : 0.0));
          canoeGroup.position.set(sign * canoeX, -0.42 + cIdx * 0.06, zOffset);
          canoeGroup.rotation.y = -sign * 0.38;
          canoeGroup.rotation.z = -sign * 0.07;
          wing.add(canoeGroup);
        });

        // 윙렛 & 항행등
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.6, 1.8), cheatlineMat);
        winglet.position.set(sign * 18.2, 1.25, sign * -4.8 + 2.0);
        winglet.rotation.y = -sign * 0.38;
        winglet.rotation.z = -sign * 0.12;
        wing.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 18.4, 0.3, sign * -4.5 + 2.0);
        wing.add(navLight);

        // ★ 가동 에일러론 (주익 외측 후연 힌지 피벗)
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 13.5, 0.48, sign * -1.8 + 2.2);

        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 1.25), wingMat);
        aileronMesh.position.set(0, 0, 0.65);
        aileronMesh.rotation.y = -sign * 0.38;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeWingSection(true));
      mainWingsGroup.add(makeWingSection(false));
      mainWingsGroup.position.set(0, -0.6, -1);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. ★ 3개 대형 제트 엔진 (Wing Engines #1, #3 & Fin Engine #2 - 실제 회전 터보팬 블레이드 장착!)
      const makeEngine = (x, y, z, isCenter = false) => {
        const eng = new THREE.Group();
        const r = isCenter ? 1.6 : 1.45;

        // 나셀 카울
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 5.6, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        // 크롬 흡입구 림
        const inletLip = new THREE.Mesh(new THREE.TorusGeometry(r - 0.05, 0.18, 12, 24), chromeMat);
        inletLip.position.set(0, 0, -2.8);
        eng.add(inletLip);

        // 엔진 흡입구 내부 어두운 터널
        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.22, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.55);
        eng.add(intakeDisk);

        // ★ 실제 20여 장의 고속 회전 티타늄 터보팬 블레이드 & 중앙 스파이럴 콘!
        const turbofan = this.createTurbofanFan(r * 0.88, 22, chromeMat);
        turbofan.position.set(0, 0, -2.4);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        // 배기 노즐 콘
        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.2);
        eng.add(exhaust);

        eng.position.set(x, y, z);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, y, z + 3.8));
      };

      makeEngine(-8.8, -2.4, 0);       // #1 Left Wing Engine
      makeEngine(8.8, -2.4, 0);        // #3 Right Wing Engine
      makeEngine(0, 4.8, 13.5, true);  // #2 Tail Fin Engine (DC-10 독점 삼발기 디자인!)

      // 4. 수직 꼬리날개 & 가동 방향타 (Vertical Fin & Movable Rudder)
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.8, 5.2), fuselageMat);
      finMesh.position.set(0, 8.8, 14.5);
      finMesh.rotation.x = -0.32;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      // ★ 가동 방향타 (Movable Rudder)
      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 8.8, 17.0);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.2, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.32;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 수평 안정판 & 가동 승강타 (Horizontal Stabilizer & Movable Elevators - 업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 2.0, 17.0);

      const hStabMesh = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.35, 3.8), wingMat);
      hStabMesh.rotation.y = -0.28;
      hStabMesh.castShadow = true;
      hStabGroup.add(hStabMesh);

      // ★ 가동 승강타 (Movable Elevators)
      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.8);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.24, 1.4), wingMat);
      elevMesh.position.set(0, 0, 0.7);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // 랜딩기어 (활주로 Y=2.12에 바퀴 접지: y=-0.6, DC-10 메인 4륜 보기 대차)
      makeGear(0, -0.6, -11.5, true, false);
      makeGear(-4.9, -0.6, 1.8, false, true);
      makeGear(4.9, -0.6, 1.8, false, true);

    } else if (type === 'md80') {
      // ------------------------------------------------------------
      // [MD-80 후방 쌍발기] 날렵한 롱바디 협동체 & T-Tail (실기형 Aft Upsweep & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 유선형 롱바디 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 22, 30), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -4.0);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ MD-80 후방 업스윕 동체 (Aft Upsweep: 상단 수평 유지, 하부 솟아오름)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.1, 1.15, 10.5, 30, 16), liveryMat);
      aftFuselage.position.set(0, 0, 12.25);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // ★ MD-80 스크루드라이버 테일콘
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.15, 4.5, 30), fuselageMat);
      tailCone.position.set(0, 0.95, 19.5);
      tailCone.rotation.x = Math.PI / 2 + 0.12;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      // 동체 하부 밸리 페어링
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 10.5), fuselageMat);
      bellyFairing.position.set(0, -1.6, 0.0);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 날렵한 롱노즈 (에어로다이내믹 펜슬 노즈)
      const noseGeo = this.createStreamlinedNoseGeo(2.1, 9.0, 30, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, -0.05, -15.0);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.90, 1.8), glassMat);
      windshield.position.set(0, 1.28, -14.2);
      windshield.rotation.x = 0.40;
      this.planeGroup.add(windshield);

      // 2. ★ NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 에일러론
      const mainWingsGroup = new THREE.Group();
      [-1, 1].forEach(sign => {
        // ★ 공기역학 에어포일 날개
        const isLeft = (sign < 0);
        const airfoilGeo = this.createAirfoilWingGeo(16.5, 5.8, 1.9, 0.44, 3.4, 0.82, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        mainWingsGroup.add(mainAirfoil);

        // 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.35, 0.45), chromeMat);
        slat.position.set(sign * 8.2, 0.20, sign * -1.2 - 2.0);
        slat.rotation.y = -sign * 0.34;
        slat.rotation.z = -sign * 0.06;
        mainWingsGroup.add(slat);

        // 플랩 트랙 카누 페어링 2기
        [5.2, 9.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 2.8, 10), fuselageMat);
          canoe.rotation.x = Math.PI / 2;
          canoe.position.set(sign * canoeX, -0.32, (cIdx === 0 ? 2.2 : 0.8));
          canoe.rotation.y = -sign * 0.34;
          mainWingsGroup.add(canoe);
        });

        // 윙렛 & 항행등
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 1.4), cheatlineMat);
        winglet.position.set(sign * 16.2, 0.9, sign * -3.6 + 1.8);
        winglet.rotation.y = -sign * 0.34;
        mainWingsGroup.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 16.4, 0.25, sign * -3.3 + 1.8);
        mainWingsGroup.add(navLight);

        // 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 11.8, 0.35, sign * -1.5 + 2.0);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.20, 1.05), wingMat);
        aileronMesh.position.set(0, 0, 0.55);
        aileronMesh.rotation.y = -sign * 0.34;
        aileronPivot.add(aileronMesh);
        mainWingsGroup.add(aileronPivot);

        if (sign < 0) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;
      });
      mainWingsGroup.position.set(0, -0.4, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // ★ 후방 동체 좌우 2기 제트 엔진 (실제 티타늄 터보팬 블레이드 회전!)
      [-3.3, 3.3].forEach(x => {
        const eng = new THREE.Group();
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.98, 5.8, 20), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.15, 10, 20), chromeMat);
        lip.position.set(0, 0, -2.9);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.96, 0.96, 0.2, 20),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.7);
        eng.add(intakeDisk);

        // 실제 고속 회전 터보팬
        const turbofan = this.createTurbofanFan(1.02, 20, chromeMat);
        turbofan.position.set(0, 0, -2.55);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        eng.position.set(x, 0.5, 12.0);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, 0.5, 15.2));
      });

      // T-Tail 수직 꼬리날개 & 러더
      const finGroup = new THREE.Group();
      const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 8.4, 4.4), fuselageMat);
      vFin.position.set(0, 5.2, 17.0);
      vFin.rotation.x = -0.34;
      finGroup.add(vFin);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.2, 19.2);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.8, 1.6), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.8);
      rudderMesh.rotation.x = -0.34;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // T-Tail 상단 수평 안정판 & 승강타
      const tTailGroup = new THREE.Group();
      tTailGroup.position.set(0, 9.2, 18.2);
      const tTail = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.36, 3.2), wingMat);
      tTailGroup.add(tTail);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.6);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.25, 1.2), wingMat);
      elevMesh.position.set(0, 0, 0.6);
      elevatorPivot.add(elevMesh);
      tTailGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(tTailGroup);

      // 랜딩기어 (활주로 Y=2.12에 바퀴 접지: y=-0.6)
      makeGear(0, -0.6, -14.2, true, false);
      makeGear(-4.1, -0.6, 1.5, false, false);
      makeGear(4.1, -0.6, 1.5, false, false);

    } else if (type === 'a320') {
      // ------------------------------------------------------------
      // [A320 최신 여객기] 에어버스 협동체 베스트셀러 트윈 제트 (실기형 Aft Upsweep & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 유선형 고정밀 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 16, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ A320 후방 업스윕 동체 (Aft Upsweep: 상단 수평 유지, 하부 배면이 위로 부드럽게 솟아오름)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(2.35, 1.25, 9.5, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 9.25);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // ★ 테일콘 & APU 배기 노즐
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.25, 4.2, 32), fuselageMat);
      tailCone.position.set(0, 1.15, 16.1);
      tailCone.rotation.x = Math.PI / 2 + 0.14;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16), chromeMat);
      apuNozzle.position.set(0, 1.48, 18.2);
      this.planeGroup.add(apuNozzle);

      // ★ 동체 하부 밸리 페어링 (Wing-Body Belly Fairing)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.25, 11.5), fuselageMat);
      bellyFairing.position.set(0, -1.70, 0.2);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(2.35, 7.5, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -11.5);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (Airbus A320 특유의 4면 곡면 글래스)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.02, 2.0), glassMat);
      windshield.position.set(0, 1.40, -10.9);
      windshield.rotation.x = 0.38;
      this.planeGroup.add(windshield);

      // 2. ★ NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 & 샤클렛(Sharklet) & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeA320Wing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ 유선형 에어포일 날개
        const airfoilGeo = this.createAirfoilWingGeo(17.2, 6.4, 2.2, 0.48, 3.6, 0.88, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.38, 0.48), chromeMat);
        slat.position.set(sign * 8.8, 0.22, sign * -1.4 - 2.3);
        slat.rotation.y = -sign * 0.38;
        slat.rotation.z = -sign * 0.07;
        wing.add(slat);

        // ★ 플랩 트랙 카누 페어링 2기 (Flap Track Canoes)
        [5.6, 9.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 3.0, 10), fuselageMat);
          canoe.rotation.x = Math.PI / 2;
          canoe.position.set(sign * canoeX, -0.34, (cIdx === 0 ? 2.5 : 1.1));
          canoe.rotation.y = -sign * 0.38;
          canoe.rotation.z = -sign * 0.07;
          wing.add(canoe);
        });

        // ★ A320 시그니처: 수직으로 솟구친 샤클렛 (Sharklet 윙팁 펜스)
        const sharkletGroup = new THREE.Group();
        sharkletGroup.position.set(sign * 17.2, 0.95, sign * -4.2 + 2.0);

        const finUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.8, 1.6), cheatlineMat);
        finUpper.position.set(0, 1.25, 0);
        finUpper.rotation.x = -0.22;
        finUpper.rotation.z = sign * 0.12;
        sharkletGroup.add(finUpper);

        const finLower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.9), cheatlineMat);
        finLower.position.set(0, -0.35, 0.1);
        sharkletGroup.add(finLower);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 0.15, 0.1, -0.6);
        sharkletGroup.add(navLight);
        wing.add(sharkletGroup);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 12.6, 0.42, sign * -1.6 + 2.0);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.20, 1.15), wingMat);
        aileronMesh.position.set(0, 0, 0.6);
        aileronMesh.rotation.y = -sign * 0.38;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeA320Wing(true));
      mainWingsGroup.add(makeA320Wing(false));
      mainWingsGroup.position.set(0, -0.5, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. ★ 트윈 고바이패스 터보팬 엔진 (CFM56 - 실제 티타늄 팬 블레이드 회전 장착!)
      [-6.8, 6.8].forEach(x => {
        const eng = new THREE.Group();
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 3.6), fuselageMat);
        pylon.position.set(0, 1.1, 0.3);
        pylon.castShadow = true;
        eng.add(pylon);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.25, 5.4, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.14, 12, 24), chromeMat);
        lip.position.set(0, 0, -2.7);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(1.15, 1.15, 0.22, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.5);
        eng.add(intakeDisk);

        // 실제 회전 터보팬 블레이드
        const turbofan = this.createTurbofanFan(1.20, 22, chromeMat);
        turbofan.position.set(0, 0, -2.35);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.2, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.0);
        eng.add(exhaust);

        eng.position.set(x, -2.0, 1.2);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, -2.0, 4.6));
      });

      // 4. 수직 꼬리날개 & 가동 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.2, 5.4), fuselageMat);
      finMesh.position.set(0, 5.6, 12.8);
      finMesh.rotation.x = -0.34;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.6, 15.4);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 7.6, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.34;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 수평 꼬리날개 & 가동 승강타 (업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 1.9, 15.0);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.35, 3.6), wingMat);
      hStab.rotation.y = -0.28;
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.7);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.25, 1.3), wingMat);
      elevMesh.position.set(0, 0, 0.65);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // 랜딩기어
      makeGear(0, -0.6, -12.5, true, false);
      makeGear(-4.8, -0.6, 2.0, false, false);
      makeGear(4.8, -0.6, 2.0, false, false);

    } else if (type === 'b747') {
      // ------------------------------------------------------------
      // [B747-400 점보기] 하늘의 여왕 퀸 오브 더 스카이 (실기형 거대 Aft Upsweep & 18륜 대차 & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 거대한 와이드바디 동체
      // 1) 1층 메인 승객 객실 원통 동체
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 20, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -3.5);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // 2) ★ B747 동체 후방 업스윕 섹션 (Aft Fuselage Upsweep: 상단 수평 유지, 거대한 배면이 위로 솟아오름!)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(3.4, 1.95, 12.0, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 12.5);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 3) ★ 테일콘 & APU 배기 노즐
      const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.95, 5.2, 32), fuselageMat);
      tailCone.position.set(0, 1.50, 21.1);
      tailCone.rotation.x = Math.PI / 2 + 0.14;
      tailCone.castShadow = true;
      this.planeGroup.add(tailCone);

      const apuNozzle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.10, 10, 20), chromeMat);
      apuNozzle.position.set(0, 1.90, 23.7);
      this.planeGroup.add(apuNozzle);

      // 4) ★ B747 거대 날개-동체 밸리 페어링 (Giant Wing-Body Belly Fairing)
      const bellyFairing = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.85, 16.5), fuselageMat);
      bellyFairing.position.set(0, -2.45, 0.5);
      bellyFairing.castShadow = true;
      this.planeGroup.add(bellyFairing);

      // ★ B747 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(3.4, 9.2, 32, 16);
      const nose = new THREE.Mesh(noseGeo, fuselageMat);
      nose.position.set(0, 0, -15.2);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // ★ B747 시그니처: 2층 어퍼덱 험프 (Upper Deck Hump)
      const hump = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 16, 24, 1, false, 0, Math.PI), liveryMat);
      hump.rotation.x = Math.PI / 2;
      hump.rotation.z = Math.PI;
      hump.position.set(0, 1.35, -9.5);
      hump.scale.set(0.95, 1.0, 1.0);
      hump.castShadow = true;
      this.planeGroup.add(hump);

      // 2층 콕핏 윈드실드 (실기형 6면 캐노피)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.20, 2.2), glassMat);
      windshield.position.set(0, 3.35, -16.0);
      windshield.rotation.x = 0.40;
      this.planeGroup.add(windshield);

      // 2. ★ 거대한 B747 실기형 NACA 슈퍼크리티컬 에어포일 주익 & 플랩 트랙 카누 페어링 4기 & 대형 윙렛 & 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeB747Wing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // ★ 거대한 전폭(23.5m per wing) 공기역학 에어포일 메쉬
        const airfoilGeo = this.createAirfoilWingGeo(23.5, 9.8, 2.8, 0.72, 6.0, 1.15, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 크롬 전연 슬랫
        const slat = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.50, 0.65), chromeMat);
        slat.position.set(sign * 12.0, 0.45, sign * -2.4 - 3.0);
        slat.rotation.y = -sign * 0.48;
        slat.rotation.z = -sign * 0.08;
        wing.add(slat);

        // ★ B747 날개 하부 플랩 트랙 카누 페어링 4기 (Flap Track Canoes)
        [6.8, 10.5, 14.2, 17.8].forEach((canoeX, cIdx) => {
          const canoe = new THREE.Group();
          const canoeLen = 4.4 - cIdx * 0.4;
          const canoeR = 0.32 - cIdx * 0.02;

          const cBody = new THREE.Mesh(new THREE.CylinderGeometry(canoeR, canoeR * 0.85, canoeLen * 0.6, 12), fuselageMat);
          cBody.rotation.x = Math.PI / 2;
          cBody.castShadow = true;
          canoe.add(cBody);

          const cTail = new THREE.Mesh(new THREE.ConeGeometry(canoeR, canoeLen * 0.4, 12), chromeMat);
          cTail.rotation.x = -Math.PI / 2;
          cTail.position.set(0, 0, canoeLen * 0.5);
          canoe.add(cTail);

          const cNose = new THREE.Mesh(new THREE.SphereGeometry(canoeR, 10, 8), chromeMat);
          cNose.position.set(0, 0, -canoeLen * 0.3);
          canoe.add(cNose);

          const zPos = (cIdx === 0 ? 3.8 : (cIdx === 1 ? 2.2 : (cIdx === 2 ? 0.6 : -1.0)));
          canoe.position.set(sign * canoeX, -0.48 + cIdx * 0.06, zPos);
          canoe.rotation.y = -sign * 0.48;
          canoe.rotation.z = -sign * 0.08;
          wing.add(canoe);
        });

        // 대형 윙렛 (B747-400 Tall Winglet)
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 2.4), cheatlineMat);
        winglet.position.set(sign * 23.2, 2.2, sign * -7.5 + 2.8);
        winglet.rotation.y = -sign * 0.48;
        winglet.rotation.z = -sign * 0.15;
        wing.add(winglet);

        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 23.4, 0.5, sign * -7.2 + 2.8);
        wing.add(navLight);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 16.8, 0.68, sign * -2.6 + 2.6);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.28, 1.5), wingMat);
        aileronMesh.position.set(0, 0, 0.8);
        aileronMesh.rotation.y = -sign * 0.48;
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeB747Wing(true));
      mainWingsGroup.add(makeB747Wing(false));
      mainWingsGroup.position.set(0, -0.6, 0);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. ★ 4발 대형 제트 터보팬 엔진 (CF6-80: 4기 모두 실제 티타늄 팬 블레이드 회전 장착!)
      [-14.5, -8.2, 8.2, 14.5].forEach((x, idx) => {
        const eng = new THREE.Group();
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 4.2), fuselageMat);
        pylon.position.set(0, 1.3, 0.4);
        pylon.castShadow = true;
        eng.add(pylon);

        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.38, 6.0, 24), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.16, 12, 24), chromeMat);
        lip.position.set(0, 0, -3.0);
        eng.add(lip);

        const intakeDisk = new THREE.Mesh(
          new THREE.CylinderGeometry(1.28, 1.28, 0.25, 24),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95, metalness: 0.2 })
        );
        intakeDisk.rotation.x = Math.PI / 2;
        intakeDisk.position.set(0, 0, -2.75);
        eng.add(intakeDisk);

        // 실제 24장의 대형 CF6 회전 터보팬 블레이드
        const turbofan = this.createTurbofanFan(1.35, 24, chromeMat);
        turbofan.position.set(0, 0, -2.55);
        eng.add(turbofan);
        this.turbofans.push(turbofan);

        const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.5, 14), chromeMat);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(0, 0, 3.4);
        eng.add(exhaust);

        const zOff = (Math.abs(x) > 10 ? -2.2 : 0.8);
        const yOff = (Math.abs(x) > 10 ? -1.8 : -2.4);
        eng.position.set(x, yOff, zOff);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, yOff, zOff + 4.2));
      });

      // 4. 웅장한 수직 꼬리날개 & 가동 방향타 (업스윕 테일 상단 배치)
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10.5, 6.8), fuselageMat);
      finMesh.position.set(0, 9.2, 17.5);
      finMesh.rotation.x = -0.38;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 9.2, 20.8);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 9.8, 2.2), cheatlineMat);
      rudderMesh.position.set(0, 0, 1.1);
      rudderMesh.rotation.x = -0.38;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 5. 거대한 수평미익 & 가동 승강타 (업스윕 테일콘 상단 배치)
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 2.8, 19.5);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.42, 4.8), wingMat);
      hStab.rotation.y = -0.32;
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 2.2);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.3, 1.6), wingMat);
      elevMesh.position.set(0, 0, 0.8);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;

      this.planeGroup.add(hStabGroup);

      // ★ 보잉 747-400 초대형 18륜 메인 랜딩기어 시스템 (노즈 2륜 + 메인 4개 대차 16륜 = 총 18개 바퀴 완비!)
      makeGear(0, -0.6, -15.5, true, false);      // 전방 조향 노즈 기어 (2륜)
      makeGear(-6.2, -0.6, 1.8, false, true);     // 좌측 윙 메인 기어 (4륜 대차)
      makeGear(6.2, -0.6, 1.8, false, true);      // 우측 윙 메인 기어 (4륜 대차)
      makeGear(-2.2, -0.6, 3.8, false, true);     // 좌측 바디 메인 기어 (4륜 대차)
      makeGear(2.2, -0.6, 3.8, false, true);      // 우측 바디 메인 기어 (4륜 대차)

    } else if (type === 'concorde') {
      // ------------------------------------------------------------
      // [콩코드] 마하 2.0 초음속 여객기 (Supersonic Airliner & 그래픽 리버리)
      // ------------------------------------------------------------
      // 1. 슬림하고 긴 초음속 원통 동체 & 실기형 업스윕 테일
      const cabinFuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 24, 32), liveryMat);
      cabinFuselage.rotation.x = Math.PI / 2;
      cabinFuselage.position.set(0, 0, -2.0);
      cabinFuselage.castShadow = true;
      this.planeGroup.add(cabinFuselage);
      this.fuselageMesh = cabinFuselage;

      // ★ 콩코드 초음속 업스윕 테일 (Supersonic Upswept Tail Cone)
      const aftFuselage = new THREE.Mesh(this.createUpsweptAftFuselageGeo(1.8, 0.65, 14, 32, 16), liveryMat);
      aftFuselage.position.set(0, 0, 17.0);
      aftFuselage.rotation.x = Math.PI / 2;
      aftFuselage.castShadow = true;
      this.planeGroup.add(aftFuselage);

      // 초음속 테일 범퍼 휠
      const tailBumper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), chromeMat);
      tailBumper.rotation.z = Math.PI / 2;
      tailBumper.position.set(0, 0.35, 23.5);
      this.planeGroup.add(tailBumper);

      // ★ 콩코드 시그니처: 드룹 노즈 (Drooping Supersonic Needle Nose)
      const droopNoseGroup = new THREE.Group();
      droopNoseGroup.position.set(0, 0, -14);
      const needleNose = new THREE.Mesh(new THREE.ConeGeometry(1.8, 9.5, 24), fuselageMat);
      needleNose.rotation.x = -Math.PI / 2 + 0.12; // 드룹 노즈 꺾임 각도
      needleNose.position.set(0, -0.5, -4.5);
      needleNose.castShadow = true;
      droopNoseGroup.add(needleNose);

      // 초음속 바이저 윈드실드
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 2.4), glassMat);
      visor.position.set(0, 0.45, -2.5);
      visor.rotation.x = 0.55;
      droopNoseGroup.add(visor);

      this.planeGroup.add(droopNoseGroup);
      this.noseMesh = needleNose;

      // 2. 전설적인 오기브 델타익 (Ogive Slender Delta Wing) & 가동 엘레본 (Elevons)
      const deltaWingGroup = new THREE.Group();

      [-1, 1].forEach(sign => {
        // 복합 델타익 형상 (3단계 슬렌더 델타 메쉬)
        const d1 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.38, 22), wingMat);
        d1.position.set(sign * 4.2, -0.3, 3);
        d1.rotation.y = -sign * 0.52;
        d1.castShadow = true;
        deltaWingGroup.add(d1);

        const d2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.28, 14), wingMat);
        d2.position.set(sign * 8.6, -0.25, 7.5);
        d2.rotation.y = -sign * 0.65;
        d2.castShadow = true;
        deltaWingGroup.add(d2);

        // 항행등
        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: sign < 0 ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 12.8, -0.1, 12.5);
        deltaWingGroup.add(navLight);

        // ★ 가동 엘레본 (Elevons: 에일러론 + 승강타 통합 조종면)
        const elevonPivot = new THREE.Group();
        elevonPivot.position.set(sign * 7.5, -0.25, 14.5);
        const elevonMesh = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.22, 1.8), wingMat);
        elevonMesh.position.set(0, 0, 0.9);
        elevonPivot.add(elevonMesh);
        deltaWingGroup.add(elevonPivot);

        if (sign < 0) this.controlSurfaces.leftAileron = elevonPivot;
        else this.controlSurfaces.rightAileron = elevonPivot;
      });

      this.planeGroup.add(deltaWingGroup);
      this.wingsMesh = deltaWingGroup;

      // 3. 듀얼 사각 램젯 엔진 박스 2기 (날개 하부 올림푸스 4발 엔진 & 애프터버너)
      [-4.2, 4.2].forEach(sideX => {
        const engBox = new THREE.Group();
        // 사각형 초음속 흡입구 나셀 박스
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 9.5), fuselageMat);
        box.position.set(0, -0.9, 0);
        box.castShadow = true;
        engBox.add(box);

        // 2개 트윈 애프터버너 배기 노즐
        [-0.9, 0.9].forEach(ex => {
          const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 1.4, 16), chromeMat);
          nozzle.rotation.x = Math.PI / 2;
          nozzle.position.set(ex, -0.9, 5.2);
          engBox.add(nozzle);

          // 애프터버너 불꽃 코어 링
          const flameRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.65, 0.08, 8, 16),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
          );
          flameRing.position.set(ex, -0.9, 5.8);
          engBox.add(flameRing);

          this.engineExhaustPoints.push(new THREE.Vector3(sideX + ex, -1.8, 14.5));
        });

        engBox.position.set(sideX, -0.5, 9.0);
        this.planeGroup.add(engBox);
      });

      // 4. 초음속 수직 델타핀 & 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.8, 7.5), fuselageMat);
      finMesh.position.set(0, 5.5, 14.5);
      finMesh.rotation.x = -0.55;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 5.5, 18.2);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8.2, 1.8), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.9);
      rudderMesh.rotation.x = -0.55;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 랜딩기어 (콩코드 4륜 대차)
      makeGear(0, -0.6, -13.5, true, false);
      makeGear(-4.2, -0.6, 4.5, false, true);
      makeGear(4.2, -0.6, 4.5, false, true);

    } else if (type === 'amphibian') {
      // ------------------------------------------------------------
      // [수륙양용기] 듀얼 플로트 수상비행기 & 터보프롭 수륙양용정 (그래픽 리버리)
      // ------------------------------------------------------------
      const rescueMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.1 });

      // 1. 유선형 박스-라운드 동체 (전장 25m, 직경 2.4m)
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.0, 25, 24), liveryMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      this.planeGroup.add(fuselage);
      this.fuselageMesh = fuselage;

      // ★ 실기형 유선형 노즈 콘
      const noseGeo = this.createStreamlinedNoseGeo(2.1, 7.2, 24, 16);
      const nose = new THREE.Mesh(noseGeo, rescueMat);
      nose.position.set(0, -0.05, -12.5);
      nose.castShadow = true;
      this.planeGroup.add(nose);
      this.noseMesh = nose;

      // 조종석 윈드실드 (파노라마 해양 조종석 글래스)
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.05, 2.2), glassMat);
      windshield.position.set(0, 1.15, -11.8);
      windshield.rotation.x = 0.38;
      this.planeGroup.add(windshield);

      // 2. ★ 고익기 실기형 에어포일 주익 (High-Mounted Airfoil Wings) & 가동 에일러론
      const mainWingsGroup = new THREE.Group();

      const makeAmphibianWing = (isLeft) => {
        const wing = new THREE.Group();
        const sign = isLeft ? -1 : 1;

        // 에어포일 곡면 날개
        const airfoilGeo = this.createAirfoilWingGeo(14.5, 4.8, 3.6, 0.44, 0.3, 0.15, isLeft);
        const mainAirfoil = new THREE.Mesh(airfoilGeo, wingMat);
        mainAirfoil.castShadow = true;
        wing.add(mainAirfoil);

        // 레스큐 오렌지 윙팁
        const tipW = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 3.8), rescueMat);
        tipW.position.set(sign * 14.8, 0.2, 0);
        wing.add(tipW);

        // 윙팁 전복 방지 보조 플로트 (Wingtip Stabilizer Float)
        const tipFloatPylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.5), chromeMat);
        tipFloatPylon.position.set(sign * 14.5, -0.9, 0);
        wing.add(tipFloatPylon);

        const tipFloat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 4.0, 12), rescueMat);
        tipFloat.rotation.x = Math.PI / 2;
        tipFloat.position.set(sign * 14.5, -1.8, 0);
        wing.add(tipFloat);

        // 주익 지지 V-스트럿 (Wing Strut to Fuselage)
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5, 8), chromeMat);
        strut.position.set(sign * 5.2, -1.8, 0);
        strut.rotation.z = sign * 0.45;
        wing.add(strut);

        // 항행등
        const navLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshBasicMaterial({ color: isLeft ? 0xef4444 : 0x10b981 })
        );
        navLight.position.set(sign * 15.6, 0.1, -2.0);
        wing.add(navLight);

        // 가동 에일러론
        const aileronPivot = new THREE.Group();
        aileronPivot.position.set(sign * 10.5, 0, 1.8);
        const aileronMesh = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.22, 1.2), wingMat);
        aileronMesh.position.set(0, 0, 0.6);
        aileronPivot.add(aileronMesh);
        wing.add(aileronPivot);

        if (isLeft) this.controlSurfaces.leftAileron = aileronPivot;
        else this.controlSurfaces.rightAileron = aileronPivot;

        return wing;
      };

      mainWingsGroup.add(makeAmphibianWing(true));
      mainWingsGroup.add(makeAmphibianWing(false));
      mainWingsGroup.position.set(0, 2.0, -1.5);
      this.planeGroup.add(mainWingsGroup);
      this.wingsMesh = mainWingsGroup;

      // 3. 트윈 터보프롭 엔진 2기 & 회전 프로펠러
      [-5.5, 5.5].forEach(x => {
        const eng = new THREE.Group();
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.82, 5.2, 16), fuselageMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.castShadow = true;
        eng.add(nacelle);

        const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 16), chromeMat);
        spinner.rotation.x = -Math.PI / 2;
        spinner.position.set(0, 0, -3.2);
        eng.add(spinner);

        const propDisk = new THREE.Mesh(
          new THREE.CircleGeometry(2.4, 24),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        propDisk.position.set(0, 0, -2.8);
        eng.add(propDisk);

        const exPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 10), chromeMat);
        exPipe.rotation.z = Math.PI / 3;
        exPipe.position.set(0.7, 0.4, 1.5);
        eng.add(exPipe);

        eng.position.set(x, 2.0, -1.8);
        this.planeGroup.add(eng);
        this.engineExhaustPoints.push(new THREE.Vector3(x, 2.0, 1.2));
      });

      // 4. 대형 듀얼 수상 플로트 (Dual Pontoon Floats)
      [-4.0, 4.0].forEach(sideX => {
        const floatGroup = new THREE.Group();

        const pontoon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 17), fuselageMat);
        pontoon.position.set(0, 0, 0);
        pontoon.castShadow = true;
        floatGroup.add(pontoon);

        const pontoonNose = new THREE.Mesh(new THREE.ConeGeometry(1.0, 3.8, 14), rescueMat);
        pontoonNose.rotation.x = -Math.PI / 2 + 0.18;
        pontoonNose.position.set(0, 0.3, -9.5);
        floatGroup.add(pontoonNose);

        const pontoonTail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 3.2), wingMat);
        pontoonTail.position.set(0, 0.2, 9.2);
        floatGroup.add(pontoonTail);

        [-4.5, 2.5].forEach(zPos => {
          const pylon1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), chromeMat);
          pylon1.position.set(sideX > 0 ? -1.2 : 1.2, 1.4, zPos);
          pylon1.rotation.z = (sideX > 0 ? 1 : -1) * 0.42;
          floatGroup.add(pylon1);

          const pylon2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), chromeMat);
          pylon2.position.set(0, 1.3, zPos);
          floatGroup.add(pylon2);
        });

        floatGroup.position.set(sideX, -2.4, -0.5);
        this.planeGroup.add(floatGroup);
      });

      // 5. 수직 꼬리날개 & 가동 방향타
      const finGroup = new THREE.Group();
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 7.5, 4.8), rescueMat);
      finMesh.position.set(0, 4.8, 12.0);
      finMesh.rotation.x = -0.32;
      finMesh.castShadow = true;
      finGroup.add(finMesh);

      const rudderPivot = new THREE.Group();
      rudderPivot.position.set(0, 4.8, 14.4);
      const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.8, 1.6), cheatlineMat);
      rudderMesh.position.set(0, 0, 0.8);
      rudderMesh.rotation.x = -0.32;
      rudderPivot.add(rudderMesh);
      finGroup.add(rudderPivot);
      this.controlSurfaces.rudder = rudderPivot;
      this.planeGroup.add(finGroup);

      // 6. 수평 꼬리날개 & 가동 승강타
      const hStabGroup = new THREE.Group();
      hStabGroup.position.set(0, 4.2, 12.8);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.32, 3.2), wingMat);
      hStab.castShadow = true;
      hStabGroup.add(hStab);

      const elevatorPivot = new THREE.Group();
      elevatorPivot.position.set(0, 0, 1.5);
      const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.22, 1.2), wingMat);
      elevMesh.position.set(0, 0, 0.6);
      elevatorPivot.add(elevMesh);
      hStabGroup.add(elevatorPivot);
      this.controlSurfaces.leftElevator = elevatorPivot;
      this.controlSurfaces.rightElevator = elevatorPivot;
      this.planeGroup.add(hStabGroup);

      // 7. 수륙양용 바퀴
      makeGear(0, -0.6, -11.5, true, false);
      makeGear(-4.0, -0.6, 1.5, false, false);
      makeGear(4.0, -0.6, 1.5, false, false);
    } else if (type === 'ancestor') {
      // ★ 1903 라이트 클래식 "조상 비행기" (Pioneer Ancestor Biplane)
      // 인류 최초의 비행기 형태를 재현한 복엽 구조, 목재 트러스, 회전 프로펠러 2기
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75, metalness: 0.1 });
      const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
      const canvasMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88, side: THREE.DoubleSide });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
      const propMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4, metalness: 0.2 });

      // 1. 복엽 주익 (상부 날개 & 하부 날개)
      const wingSpan = 15.0;
      const wingChord = 2.8;
      const wingThickness = 0.12;

      // 하부 날개 (Lower Wing)
      const lowerWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, wingThickness, wingChord), canvasMat);
      lowerWing.position.set(0, 0.5, 0);
      lowerWing.castShadow = true;
      this.planeGroup.add(lowerWing);

      // 상부 날개 (Upper Wing)
      const upperWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, wingThickness, wingChord), canvasMat);
      upperWing.position.set(0, 3.2, 0);
      upperWing.castShadow = true;
      this.planeGroup.add(upperWing);

      // 날개 사이 12개 목재 스트럿 (Interplane Struts) & 크로스 와이어
      const strutXPositions = [-6.8, -4.2, -1.6, 1.6, 4.2, 6.8];
      strutXPositions.forEach(sx => {
        [-0.9, 0.9].forEach(sz => {
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6), woodMat);
          strut.position.set(sx, 1.85, sz);
          strut.castShadow = true;
          this.planeGroup.add(strut);
        });

        // X자 크로스 브레이싱 와이어
        const wire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 4), ironMat);
        wire1.position.set(sx, 1.85, 0);
        wire1.rotation.x = 0.55;
        this.planeGroup.add(wire1);
        const wire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.9, 4), ironMat);
        wire2.position.set(sx, 1.85, 0);
        wire2.rotation.x = -0.55;
        this.planeGroup.add(wire2);
      });

      // 2. 전방 복엽 승강타 (Front Elevator / Canard)
      const canardBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), woodMat);
      canardBeamL.position.set(-1.8, 1.2, -2.1);
      canardBeamL.rotation.x = 0.18;
      this.planeGroup.add(canardBeamL);

      const canardBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), woodMat);
      canardBeamR.position.set(1.8, 1.2, -2.1);
      canardBeamR.rotation.x = 0.18;
      this.planeGroup.add(canardBeamR);

      const canardGroup = new THREE.Group();
      canardGroup.position.set(0, 1.6, -4.2);
      const canardUpper = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.2), canvasMat);
      canardUpper.position.set(0, 0.55, 0);
      canardGroup.add(canardUpper);
      const canardLower = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.2), canvasMat);
      canardLower.position.set(0, -0.55, 0);
      canardGroup.add(canardLower);

      [-2.1, -0.7, 0.7, 2.1].forEach(cx => {
        const cStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), woodMat);
        cStrut.position.set(cx, 0, 0);
        canardGroup.add(cStrut);
      });
      this.controlSurfaces.leftElevator = canardGroup;
      this.controlSurfaces.rightElevator = canardGroup;
      this.planeGroup.add(canardGroup);

      // 3. 후방 트윈 러더 (Twin Vertical Rudders)
      const rudderBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), woodMat);
      rudderBeamL.position.set(-1.4, 1.6, 2.4);
      this.planeGroup.add(rudderBeamL);
      const rudderBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), woodMat);
      rudderBeamR.position.set(1.4, 1.6, 2.4);
      this.planeGroup.add(rudderBeamR);

      const rudderGroup = new THREE.Group();
      rudderGroup.position.set(0, 1.8, 4.8);
      [-0.9, 0.9].forEach(rx => {
        const rBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.3), canvasMat);
        rBlade.position.set(rx, 0, 0);
        rudderGroup.add(rBlade);
      });
      this.controlSurfaces.rudder = rudderGroup;
      this.planeGroup.add(rudderGroup);

      // 4. 중앙 4기통 피스톤 엔진 블록 & 구동 체인
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.2), ironMat);
      engineBlock.position.set(0.6, 0.9, 0.2);
      this.planeGroup.add(engineBlock);

      // 배기 파이프
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), darkWoodMat);
      exhaust.position.set(0.8, 1.4, 0.2);
      this.planeGroup.add(exhaust);
      this.engineExhaustPoints.push(new THREE.Vector3(0.8, 1.4, 0.6));

      // 5. ★ 회전하는 트윈 목재 푸셔 프로펠러 (Twin Counter-Rotating Pusher Props)
      [-1.9, 1.9].forEach((px) => {
        const propAssembly = new THREE.Group();
        propAssembly.position.set(px, 1.8, 1.5); // 후방 추진 배치

        const pHub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12), ironMat);
        pHub.rotation.x = Math.PI / 2;
        propAssembly.add(pHub);

        // 2엽 목재 프로펠러 블레이드 (지름 2.4m)
        const bladeGeo = new THREE.BoxGeometry(0.18, 2.4, 0.05);
        const bladeMesh = new THREE.Mesh(bladeGeo, propMat);
        propAssembly.add(bladeMesh);

        this.turbofans.push(propAssembly); // 엔진 스로틀/속도에 따라 고속 회전!
        this.planeGroup.add(propAssembly);
      });

      // 6. 오픈 조종석 & 조상 파일럿 (Pioneer Pilot Figure)
      const pilotGroup = new THREE.Group();
      pilotGroup.position.set(-0.5, 0.75, 0); // 엔진 좌측에 엎드린 자세

      // 몸통 (갈색 가죽 재킷)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 1.1), new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.9 }));
      pilotGroup.add(torso);

      // 머리 & 가죽 비행모 & 고글
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), new THREE.MeshStandardMaterial({ color: 0x7c4a2d }));
      head.position.set(0, 0.18, -0.65);
      pilotGroup.add(head);

      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.12), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9 }));
      goggles.position.set(0, 0.22, -0.80);
      pilotGroup.add(goggles);

      // 조종간 레버
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), ironMat);
      lever.position.set(0.15, 0.3, -0.4);
      pilotGroup.add(lever);

      this.planeGroup.add(pilotGroup);

      // 7. 착륙 기구: 2개의 목재 스키드 (Skids) & 경량 바퀴
      [-1.4, 1.4].forEach(kx => {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.8), darkWoodMat);
        skid.position.set(kx, -0.35, -0.5);
        this.planeGroup.add(skid);

        const skidCurv = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), darkWoodMat);
        skidCurv.position.set(kx, 0.15, -2.8);
        skidCurv.rotation.x = 0.75;
        this.planeGroup.add(skidCurv);

        // 경량 와이어 휠
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 14), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(kx, -0.35, 0.6);
        this.wheels.push(wheel);
        this.planeGroup.add(wheel);
      });
    }

    if (savedPos && savedQuat) {
      this.planeGroup.position.copy(savedPos);
      this.planeGroup.quaternion.copy(savedQuat);
    } else {
      // 기본 위치 (초기엔 활주로 36L 정렬)
      this.planeGroup.position.set(120, this.groundY, 800);
      this.planeGroup.rotation.set(0, 0, 0);
    }

    // 항공기 정밀 항법등 (좌현 적색, 우현 녹색, 꼬리 백색, 상하부 적색 비콘 스트로브)
    this.attachAircraftNavLights(type);

    this.scene.add(this.planeGroup);
  },

  // ----------------------------------------------------------------
  // 기체 항법등 (Navigation & Anti-Collision Strobe Lights)
  // ----------------------------------------------------------------
  attachAircraftNavLights(type) {
    this.aircraftNavLights = [];
    this.beaconStrobes = [];

    const navLightDefs = {
      dc10: { span: 22.0, wingY: -0.2, wingZ: 0.5, tailY: 7.5, tailZ: 16.5, topY: 3.2, topZ: -2, btmY: -3.1, btmZ: -1 },
      md80: { span: 16.5, wingY: -0.2, wingZ: 0.2, tailY: 6.8, tailZ: 18.5, topY: 2.4, topZ: -2, btmY: -2.4, btmZ: -1 },
      a320: { span: 17.8, wingY: 0.2, wingZ: 0.2, tailY: 6.5, tailZ: 15.5, topY: 2.6, topZ: -2, btmY: -2.6, btmZ: -1 },
      b747: { span: 32.0, wingY: -0.2, wingZ: 1.0, tailY: 10.5, tailZ: 29.5, topY: 5.2, topZ: -5, btmY: -4.5, btmZ: -2 },
      concorde: { span: 13.5, wingY: -0.2, wingZ: 8.5, tailY: 6.2, tailZ: 26.5, topY: 2.4, topZ: -4, btmY: -2.4, btmZ: -2 },
      amphibian: { span: 16.5, wingY: 3.2, wingZ: 0.5, tailY: 5.8, tailZ: 12.5, topY: 4.2, topZ: -1, btmY: -1.8, btmZ: -1 },
      ancestor: { span: 7.5, wingY: 1.8, wingZ: 0.2, tailY: 1.8, tailZ: 4.8, topY: 3.4, topZ: 0, btmY: -0.4, btmZ: 0 }
    };

    const d = navLightDefs[type] || navLightDefs.dc10;
    const isNight = (this.timeOfDay === 'night');

    // 1. 좌현 적색 항법등 (Port Red Nav Light)
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), redMat);
    redLight.position.set(-d.span, d.wingY, d.wingZ);
    this.planeGroup.add(redLight);
    this.aircraftNavLights.push(redLight);

    // 2. 우현 녹색 항법등 (Starboard Green Nav Light)
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const greenLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), greenMat);
    greenLight.position.set(d.span, d.wingY, d.wingZ);
    this.planeGroup.add(greenLight);
    this.aircraftNavLights.push(greenLight);

    // 3. 후방 꼬리 백색 항법등 (Tail White Nav Light)
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), whiteMat);
    tailLight.position.set(0, d.tailY, d.tailZ);
    this.planeGroup.add(tailLight);
    this.aircraftNavLights.push(tailLight);

    // 4. 상부 & 하부 적색 충돌 방지 회전 점멸등 (Anti-Collision Beacon Strobes)
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), beaconMat);
    topBeacon.position.set(0, d.topY, d.topZ);
    this.planeGroup.add(topBeacon);
    this.aircraftNavLights.push(topBeacon);
    this.beaconStrobes.push(topBeacon);

    const btmBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), beaconMat);
    btmBeacon.position.set(0, d.btmY, d.btmZ);
    this.planeGroup.add(btmBeacon);
    this.aircraftNavLights.push(btmBeacon);
    this.beaconStrobes.push(btmBeacon);

    // 초기 표시 여부 (야간에만 켜짐)
    this.aircraftNavLights.forEach(l => l.visible = isNight);
  }

  });
})();

