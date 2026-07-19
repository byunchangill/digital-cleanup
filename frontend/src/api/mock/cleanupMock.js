/**
 * cleanup 모듈 mock 응답 (CLEAN-01,02,03,04,05,07,08,09,10).
 * 반환 형태는 client.js 인터셉터가 봉투를 해제한 뒤의 `data`(contracts/cleanup.md 스키마)와 동일.
 * 활성화: VITE_USE_MOCK=true. 삭제(CLEAN-06)는 itemMock(ITEM-09)을 재사용하므로 여기 없음.
 * 용량은 계약대로 bytes(number).
 */
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const GB = 1073741824;
const MB = 1048576;

const IMG = {
  dupA: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJL2kgfnEcM-Tq_LSFtbR6RHmYvezm-6nGfZLqoIsGMReviu1u7LJFXAXErwpkJ3N8NzNG-9h5ADhza2aGaiEPeqb8IWBB02iQC2C6xT2y3NPW21Z0q1lQjRTfwrjwqU3Vc4VeZB9aolGcReQh2ALmjbXkvhupo7kxDdwg-xxoSPq3alP2EkXsd6OrpQuFf16kbGTNDIs6IRvfosc9_2Kv-21D7bSY01L3S7xeEsOADh7DlPrZgmYskRwkc5L4isQT-PrW0TKEOvY',
  dupB: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeIvPQw_PTLXoTsLeKamkZtwbVTgQv3jqSjE9co-Rb5WB9GpeBPeBTsVVTrIyakvx0Zb0NiOM-3qfwgNaKxab1EvWxWEOFifieDFYShbiRoE3LdW2lr_uaBBNDtYnDGbfpTFgtKcc_81hpbXTTz-8KWhNNHnhbQJ1K27nphzkDaj0eDWv9VWqjHdAOoYOwLdw340EVfGbciHvYo7O9AK_pOx4zysfQFwaj8r2OnYE5EvNq7dh9JopO16pJDKhLEg8yyB2yZ-xmd9M',
  dupC: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7fSk1CLLf1dWryookpqvTg6VxFht1FLCg8-J2b6L-kuDOCm863ryFE2K6TH0CNOiDv1d_XvBUqSGnPXf2i4PZDvNCwzJYKX7uVbJcFvYWG4zz-zbKIRyN9StgzuFoawjMxAGB9KmLebVspSt0OmMJiDISy4zrz78603sULeqB47RGkt3FIZgE5rNBZ607zwrHwsglSSAOL-glMpT_zixhhyQ3JrrMfN1OZ8Zs3nAWQua9QA4PABkKnp9jfC4Cc9XOEp8ja54N6yU',
  qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKzzQhMwW0jW9_ZB6LgHOASEQK4HEetMhdXvbYt4IxtdNOxNlPmS2u7d6eBN-sOce7kEc-N3P899yiyHqB_hAsYkgxAR0hJh4j5Pd4LK1ciUHRMnEHC8IQGmlphsQJA3ozIzKdiEqzwTKKP-EQXMQOY1bkKrlraC2tcBVQ_-bKWgM6qQVn6xE5zYzTWobDCqMcjTeMdGmm49U-BSjSDGCD7MHQXt2_v225MgBhjxUUqGA43Utjfeeyq0sq31Ax7cSxj5RFr4RKfJU',
  blur: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBOWOmtksSEjYHgvuazEsLk-F8uYME76-mk_5VLsJmDLyzkVZeP0-88UnE57LmIGY9K_kQvjZVIJlTHOMufF3iq7zaDmJWXWXTL8a1o9LDVtTMlQgpAVe69tdQcjfmBvb6C9UphL5kcB20OipqHX3mkKeuBhG1LCGzxMYyV9J-LW5MhXSGOL0dMg1FN2T5bNNkUoSI7HEM9j5ARqVw-nxheHkAxEzdsuC3lDk2ME_h9mEl-uYUZxMWed4Q3cYZykWKweBZdKnen1U',
  wifi: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4fRClcFxvGK7df9KlhcOY42SqSBJBzrlmQfeEAovEdISaxeQWutNtxB-8dHOFEG8AxP5CJuYI1P74sX2W40b9Clz2zNb_TFD-C26Ec7kyfchSsUozTQ85PH5vOULBPo4ZMl8A9_JVdCnNNwKkOF3JzChdwUihFpbcTQP3Ocg-xam29GDoVeMsEabPWgXheMblknup64X7J49cT4giYEutxWhqczje7GeGfnRHRDlOHBj0nsvqK9YXBNVT-aUug2ESvRkenKSWMDo',
  receipt: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrPXDis6fxieec8c2SFzk91P_d03nAfU6hKpHXBsU4QK6XwTgHOUuf10iIuay3Nf35baRr-0aFKz8j3tSiJqgAqfZstD944ck1i0DxwtnbfdQx7R_Z3K3gd9LF7zu6BptIY1BwsSxDnR-qPBMn6Xkua2Hd3htDQuQmSPWdp1NdKVuAjpwKskE5ecAdZoPiMAz8iRvKxgXbjQn7sjDZS-_019QH_ycwxb7qZKspHidvMDwck0ev151R3HkEQaCjUORhSWDNKGRXNjE',
  parking: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1urcok9mAE-xT54glMA8CRYU60VWHBRYaOnaWvPtQlOJTR-DtnAKLmVyeXOCNYKn0dG4bxAv8WmoBChqDiqEVis3OAfEGjQ8QxDa5fFq5GLs_ZApe1KNyHHdBxbZoo488jKw-fNzDwXHTsopoIVIrjIUbQ4cMNwt4I_TW1I-2WYXtn51cNURyRImPZZq9bkbUY88W0byKfMCPY73iMOy2-avWUPBKgz9N0HqUtks8nPqAAsoEyfqIUIP-GtlAfz89VDSYwLvaBiM',
};

// CLEAN-01: 정리 대시보드
export async function mockGetDashboard() {
  await delay();
  return {
    storage: {
      usedPercent: 72,
      unusedPercent: 28,
      reclaimableBytes: Math.round(1.2 * GB),
    },
    categories: [
      { type: 'DUPLICATE', title: '중복 자료', description: '비슷한 사진이 묶여 있어요', count: 12, scanStatus: 'READY', actionRoute: '/cleanup/duplicates' },
      { type: 'EXPIRING_COUPON', title: '만료 쿠폰', description: '기한이 지난 쿠폰을 정리할까요?', count: 5, scanStatus: 'READY', actionRoute: '/library?expiringSoon=true' },
      { type: 'UNNECESSARY_SCREENSHOT', title: '불필요 스샷', description: '흐릿하거나 일회성인 자료예요', count: 24, scanStatus: 'SCANNING', actionRoute: '/cleanup/screenshots' },
    ],
    optimizationInsight: {
      title: '최적화 제안',
      message: '사용하지 않는 태그 3개를 삭제하여 로딩 속도를 개선할 수 있습니다.',
    },
  };
}

// CLEAN-02: 중복 그룹 목록
export async function mockListDuplicates({ page = 0, size = 20 } = {}) {
  await delay();
  const groups = [
    {
      groupId: 1,
      type: 'DUPLICATE',
      summary: '3개의 유사한 스크린샷을 찾았습니다.',
      estimatedSaveBytes: Math.round(12.4 * MB),
      candidates: [
        { itemId: 501, thumbnailUrl: IMG.dupA, width: 2400, height: 1080, fileSize: Math.round(4.2 * MB), capturedAt: '2023-10-24T10:24:00Z', recommendedKeep: true },
        { itemId: 502, thumbnailUrl: IMG.dupB, width: 1920, height: 864, fileSize: Math.round(3.1 * MB), capturedAt: '2023-10-24T10:25:00Z', recommendedKeep: false },
        { itemId: 503, thumbnailUrl: IMG.dupC, width: 1280, height: 576, fileSize: Math.round(1.2 * MB), capturedAt: '2023-10-25T09:00:00Z', recommendedKeep: false },
      ],
    },
  ];
  return { groups, page, size, totalElements: groups.length, totalPages: 1, hasNext: false };
}

// CLEAN-03: 중복 그룹 정리 실행
export async function mockResolveDuplicate(groupId, keepItemId) {
  await delay();
  const { groups } = await mockListDuplicates();
  const group = groups.find((g) => g.groupId === Number(groupId));
  const deletedItemIds = group ? group.candidates.filter((c) => c.itemId !== keepItemId).map((c) => c.itemId) : [];
  const savedBytes = group ? group.candidates.filter((c) => c.itemId !== keepItemId).reduce((s, c) => s + c.fileSize, 0) : 0;
  return { groupId: Number(groupId), status: 'RESOLVED', keptItemId: keepItemId, deletedItemIds, savedBytes, failedIds: [] };
}

// CLEAN-04: 중복 그룹 해제
export async function mockDismissDuplicate(groupId) {
  await delay();
  return { groupId: Number(groupId), status: 'DISMISSED' };
}

// CLEAN-05: 불필요 스크린샷 후보 목록
export async function mockListScreenshots({ reason, page = 0, size = 20 } = {}) {
  await delay();
  const all = [
    { id: 1, itemId: 601, thumbnailUrl: IMG.qr, title: '탑승권 QR 코드', reason: 'ONE_TIME', reasonLabel: '일회성', recommendationText: '만료된 이벤트 또는 여행 티켓일 가능성이 큼.', capturedAt: '2026-03-12T10:24:00Z', defaultSelected: true },
    { id: 2, itemId: 602, thumbnailUrl: IMG.blur, title: '실수로 찍힌 사진', reason: 'BLURRY', reasonLabel: '흐릿함', recommendationText: '낮은 선명도가 감지됨.', capturedAt: '2026-07-18T09:00:00Z', defaultSelected: true },
    { id: 3, itemId: 603, thumbnailUrl: IMG.wifi, title: 'Wi-Fi 접속 정보', reason: 'INFO', reasonLabel: '정보 스크린샷', recommendationText: '오래된 정보일 수 있음.', capturedAt: '2026-03-10T20:15:00Z', defaultSelected: false },
    { id: 4, itemId: 604, thumbnailUrl: IMG.receipt, title: 'Uber 영수증 #4829', reason: 'ONE_TIME', reasonLabel: '일회성', recommendationText: '일회성 거래 기록.', capturedAt: '2026-07-14T09:00:00Z', defaultSelected: true },
    { id: 5, itemId: 605, thumbnailUrl: IMG.parking, title: '주차 기둥 P4', reason: 'ONE_TIME', reasonLabel: '일회성', recommendationText: '일시적인 메모용 사진 감지됨.', capturedAt: '2026-07-17T09:00:00Z', defaultSelected: true },
  ];
  const candidates = reason ? all.filter((c) => c.reason === reason) : all;
  const reasonCounts = [
    { reason: 'ONE_TIME', label: '일회성', count: all.filter((c) => c.reason === 'ONE_TIME').length },
    { reason: 'BLURRY', label: '흐릿함', count: all.filter((c) => c.reason === 'BLURRY').length },
  ];
  return { candidates, reasonCounts, page, size, totalElements: candidates.length, totalPages: 1, hasNext: false };
}

// CLEAN-07: 한꺼번에 정리하기
export async function mockRunCleanup(types) {
  await delay(700);
  return {
    deletedCount: 18,
    savedBytes: Math.round(1.2 * GB),
    resolvedGroupIds: [1],
    byType: [
      { type: 'DUPLICATE', deletedCount: 8, savedBytes: Math.round(12.4 * MB) },
      { type: 'UNNECESSARY_SCREENSHOT', deletedCount: 10, savedBytes: Math.round(4.2 * MB) },
    ],
    failedIds: [],
  };
}

// CLEAN-08: 정리 리포트
export async function mockGetReport() {
  await delay();
  return {
    weekly: { savedBytes: Math.round(5.4 * GB), message: '잘하고 있어요, Alex님!' },
    cumulative: { savedBytes: Math.round(12.8 * GB), savedBytesChangePercent: 15, duplicatesRemoved: 2481 },
    hygiene: {
      score: 88,
      grade: '훌륭함',
      breakdown: [
        { key: 'tagAccuracy', label: '태그 정확도', percent: 94 },
        { key: 'vaultOrganization', label: '보관함 정리', percent: 72 },
        { key: 'cleanupFrequency', label: '정리 빈도', percent: 85 },
      ],
    },
    suggestions: [
      { type: 'OLD_SCREENSHOTS', title: '오래된 스크린샷', description: '6개월 동안 열어보지 않은 항목 42개', count: 42, actionRoute: '/cleanup/screenshots' },
      { type: 'LARGE_MEDIA', title: '대용량 미디어', description: '3개의 동영상이 1.2GB를 차지하고 있습니다', count: 3, actionRoute: null },
    ],
  };
}

let SETTINGS = { autoTrashExpired: true, smartScreenshotDetection: false, unusedThresholdDays: 90, monthlySavedBytes: Math.round(1.2 * GB) };

// CLEAN-09: 정리 설정 조회
export async function mockGetSettings() {
  await delay();
  return { ...SETTINGS };
}

// CLEAN-10: 정리 설정 저장
export async function mockUpdateSettings(patch) {
  await delay();
  SETTINGS = { ...SETTINGS, ...patch };
  return { ...SETTINGS };
}
