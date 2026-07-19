# Sortmate 개발 진행 상태

갱신: 2026-07-20 (admin 모듈 완료 — 전 모듈 완료)

| 모듈 | 명세 | 백엔드 | 프론트 | QA | 실패 횟수 |
|------|------|--------|--------|-----|-----------|
| auth | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| item | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| home | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| cleanup | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| vault | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| my | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |
| admin | ✅ 완료 | ✅ 완료 | ✅ 완료 | ✅ 통과 | 0 |

- admin 확정(2026-07-20): User에 role(USER/ADMIN)·plan·status 신규 추가, 데모 관리자 admin@sortmate.app / GreenPine!Harbor42. admin API는 전역 집계(다른 모듈과 달리 소유자 필터 없음). AI 지표는 aiClassified 비율만 실집계, 나머지 데모/stub
- 스캐폴딩: backend/(Spring Boot 3.3.4, gradlew build 통과)·frontend/(React18+Vite, npm run build 통과) — 회전 1에서 생성 완료
- vault 확정: vaulted 공유는 볼트 세션 활성 시 조건부 허용(사용자 결정, item ITEM-13 계약 갱신). auth QA-03(403 봉투)도 vault에서 해소
- item QA 보류 해소(2026-07-19): 편집 화면 설계(item_edit_lib_004) 확보 → ITEM-06 편집 화면 구현·연결, ITEM-15(AI 재분석 stub) 신규. QA 통과 30/실패 0/보류 0
- auth 확장 완료(2026-07-20): 카카오/구글 OAuth 실연동(애플 stub 유지, 유료 개발자 계정 필요), AUTH-08 이메일 회원가입 신규, 한글 로그인/가입/약관(/legal, docs/legal 전문) 화면 재구성. QA 통과
- auth QA 잔존 관찰 1건: QA-02 recovery 이메일 입력 UI 미제공 (계약 위반 아님)
- 남은 항목: 카카오/구글 실제 OAuth 키 미발급(발급 전까지 stub 폴백 동작), 애플 로그인 stub, docs/legal 문서 placeholder([YYYY-MM-DD] 등) 미확정, 프론트 회원가입 화면 약관 링크-체크박스 마크업 개선(저우선), Downloads 전체 설계셋(140여 화면) 중 admin 2종 외 미검토 신규 화면 다수(휴지통/카테고리 관리/온보딩 등, 2차 확장 후보)
- 상태 기호: ⬜ 미착수 / 🔄 진행 중 / ✅ 완료 / ❌ 실패
