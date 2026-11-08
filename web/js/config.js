/**
 * Sky Jet Explorer 3D - Aircraft Specifications and Flight Config Constants
 * Subsystem: config (1 methods)
 */

(function() {
  'use strict';

  Object.assign(AirplaneGame.prototype, {
  // ----------------------------------------------------------------
  // 공기역학 및 기체 제원 데이터베이스 (Airliner Aerodynamics DB)
  // ----------------------------------------------------------------
  getAircraftSpecs(type) {
    const specs = {
      a320: {
        name: 'Airbus A320',
        mass: 68000,          // kg (자중 42t + 승객/연료 탑재 = 68,000kg)
        wingArea: 122.6,      // m²
        wingSpan: 34.1,       // m
        aspectRatio: 9.5,     // 종횡비 AR
        oswaldEff: 0.82,      // 오스왈드 효율 계수 e
        cd0: 0.020,           // 영양력 유해 항력 계수 C_D0
        cl0: 0.24,            // 받음각 0도 기본 양력 계수 C_L0
        clAlpha: 5.2,         // 양력선 기울기 C_L_alpha (per rad)
        clMaxClean: 1.55,     // 클린 상태 최대 양력 계수
        stallAlphaClean: 0.25,// 클린 실속 받음각 (약 14.3도)
        maxThrust: 240000,    // N (CFM56-5B 트윈 터보팬 ~240 kN)
        vRotateKmh: 260,      // 이륙 로테이션 속도 (~140 kt)
        vStallCleanKmh: 215,  // 클린 실속 속도 (~116 kt)
        pitchAuthority: 0.55,
        rollAuthority: 0.70,
        pitchDamping: 1.8,
        rollDamping: 2.2
      },
      b747: {
        name: 'Boeing 747-400 Jumbo',
        mass: 285000,         // kg (점보 제트기 육중한 관성 질량)
        wingArea: 525.0,      // m²
        wingSpan: 64.4,       // m
        aspectRatio: 7.9,
        oswaldEff: 0.80,
        cd0: 0.022,
        cl0: 0.26,
        clAlpha: 5.0,
        clMaxClean: 1.50,
        stallAlphaClean: 0.26,
        maxThrust: 1120000,   // N (4발 GE CF6-80C2 ~1120 kN)
        vRotateKmh: 295,
        vStallCleanKmh: 245,
        pitchAuthority: 0.38,
        rollAuthority: 0.45,
        pitchDamping: 2.5,
        rollDamping: 2.8
      },
      dc10: {
        name: 'McDonnell Douglas DC-10',
        mass: 165000,         // kg
        wingArea: 367.0,      // m²
        wingSpan: 50.4,       // m
        aspectRatio: 6.9,
        oswaldEff: 0.78,
        cd0: 0.023,
        cl0: 0.25,
        clAlpha: 4.9,
        clMaxClean: 1.52,
        stallAlphaClean: 0.25,
        maxThrust: 690000,    // N (삼발 GE CF6-50 ~690 kN)
        vRotateKmh: 280,
        vStallCleanKmh: 230,
        pitchAuthority: 0.44,
        rollAuthority: 0.52,
        pitchDamping: 2.1,
        rollDamping: 2.4
      },
      md80: {
        name: 'McDonnell Douglas MD-80',
        mass: 64000,          // kg
        wingArea: 112.0,      // m²
        wingSpan: 32.8,       // m
        aspectRatio: 9.6,
        oswaldEff: 0.81,
        cd0: 0.021,
        cl0: 0.23,
        clAlpha: 5.1,
        clMaxClean: 1.54,
        stallAlphaClean: 0.24,
        maxThrust: 192000,    // N (JT8D 후방 쌍발 ~192 kN)
        vRotateKmh: 255,
        vStallCleanKmh: 210,
        pitchAuthority: 0.58,
        rollAuthority: 0.65,
        pitchDamping: 1.9,
        rollDamping: 2.1
      },
      concorde: {
        name: 'Aérospatiale/BAC Concorde',
        mass: 110000,         // kg
        wingArea: 358.0,      // m² (오지브 델타익)
        wingSpan: 25.6,       // m
        aspectRatio: 1.83,
        oswaldEff: 0.65,
        cd0: 0.018,
        cl0: 0.12,
        clAlpha: 3.2,
        clMaxClean: 1.30,
        stallAlphaClean: 0.35,// 와류 양력(Vortex Lift)으로 고받음각 비행
        maxThrust: 680000,    // N (4발 Olympus 593 롤스로이스 터보제트)
        vRotateKmh: 350,
        vStallCleanKmh: 275,
        pitchAuthority: 0.62,
        rollAuthority: 0.75,
        pitchDamping: 1.7,
        rollDamping: 1.8
      },
      amphibian: {
        name: 'Canadair CL-415 Amphibian',
        mass: 19800,          // kg
        wingArea: 100.0,      // m²
        wingSpan: 28.6,       // m
        aspectRatio: 8.2,
        oswaldEff: 0.76,
        cd0: 0.032,
        cl0: 0.32,
        clAlpha: 5.0,
        clMaxClean: 1.70,
        stallAlphaClean: 0.26,
        maxThrust: 70000,     // N (PW123 터보프롭)
        vRotateKmh: 155,
        vStallCleanKmh: 125,
        pitchAuthority: 0.65,
        rollAuthority: 0.68,
        pitchDamping: 1.6,
        rollDamping: 1.8
      },
      ancestor: {
        name: '1903 Wright Flyer',
        mass: 340,            // kg
        wingArea: 47.4,       // m²
        wingSpan: 12.3,       // m
        aspectRatio: 6.4,
        oswaldEff: 0.70,
        cd0: 0.055,
        cl0: 0.40,
        clAlpha: 4.8,
        clMaxClean: 1.45,
        stallAlphaClean: 0.22,
        maxThrust: 800,       // N
        vRotateKmh: 50,
        vStallCleanKmh: 42,
        pitchAuthority: 0.70,
        rollAuthority: 0.50,
        pitchDamping: 1.5,
        rollDamping: 1.4
      }
    };
    return specs[type] || specs.a320;
  }

  });
})();

