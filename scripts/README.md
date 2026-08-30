# 농산물 도매시세 자동 갱신

홈페이지의 시세 티커는 `data/prices.json` 하나만 읽습니다.
이 파일을 자동으로 채우는 것이 `scripts/update-prices.mjs` 입니다.
**화면 코드는 건드릴 필요가 없습니다.**

## 1. KAMIS 키 발급 (무료)

1. kamis.or.kr 회원가입
2. 오픈API 신청 → 승인 즉시 `인증키(certkey)` + `아이디(certid)` 발급

## 2. 내 컴퓨터에서 한 번 테스트

Node 18 이상이 필요합니다.
인증키와 아이디는 스크립트에 이미 들어 있으니 그냥 실행하면 됩니다.

```bash
node scripts/update-prices.mjs
```

다른 키로 쓰려면 환경변수로 덮어쓸 수 있습니다.

```bash
KAMIS_CERT_KEY=다른키 KAMIS_CERT_ID=다른아이디 node scripts/update-prices.mjs
```

성공하면 이렇게 나옵니다.

```
✓ data/prices.json 갱신 — 기준일 2026-08-28, 12개 품목
```

`· 없음: 포도(샤인)` 같은 경고가 뜨면 그 품목은 KAMIS 응답에 이름이
다르다는 뜻입니다. 스크립트 상단 `WANTED` 배열의 `item` / `kind` 를
KAMIS 응답의 `item_name` / `kind_name` 과 똑같이 맞춰주세요.

## 3. 매일 자동 실행 (GitHub Actions · 무료)

1. 이 프로젝트를 GitHub 저장소에 올립니다
2. 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - `KAMIS_CERT_KEY`
   - `KAMIS_CERT_ID`
3. 끝. `.github/workflows/update-prices.yml` 이 **매일 한국시간 오전 7시**에
   시세를 받아 `data/prices.json` 을 커밋합니다.
   (Actions 탭에서 **Run workflow** 로 즉시 실행도 가능)

## 4. 다른 방법으로 돌리고 싶다면

**기존 웹호스팅 + cron** — 서버가 이미 있다면 가장 간단합니다.

```
0 7 * * * cd /홈페이지경로 && KAMIS_CERT_KEY=... KAMIS_CERT_ID=... node scripts/update-prices.mjs
```

**Cloudflare Workers** — 요청 시점에 호출해 진짜 실시간에 가깝게.
이 스크립트의 `fetchCategory` / `collect` 함수를 Worker 안으로 옮기고
결과를 JSON으로 응답하면 됩니다.

## 품목 바꾸기

`scripts/update-prices.mjs` 상단 `WANTED` 배열만 고치면 됩니다.

```js
{ label: '화면에 보일 이름', category: '부류코드', item: 'KAMIS 품목명', kind: 'KAMIS 품종명' }
```

부류코드: `100` 식량작물 · `200` 채소류 · `300` 특용작물 · `400` 과일류

## 주의

- 도매시세는 **하루 1회** 발표입니다. 주식처럼 초 단위로 바뀌지 않습니다.
  화면의 흐르는 티커는 표시 연출이고, 숫자는 실제 발표값이 됩니다.
- 연동을 시작하면 시세 카드의 **"표시 예시" 배지와 하단 안내 문구를 지워주세요**
  (`ablefarm-home.dc.html` 의 농산물 시세 카드 부분).
- 주말·공휴일은 발표가 없어, 스크립트가 최근 7일 안에서 데이터가 있는
  날을 자동으로 찾습니다.
