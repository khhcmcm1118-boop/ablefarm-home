# 농산물 도매시세 자동 갱신

홈페이지의 시세 칸은 실시간 서버가 3초 안에 답하지 않으면 `data/prices.json` 을 읽습니다.
이 파일을 매일 채우는 것이 `scripts/update-prices.mjs` 입니다.
**화면 코드는 건드릴 필요가 없습니다.**

> 2026-11-21: KAMIS 옛 주소(kamis.or.kr/service/price)가 응답하지 않아
> 공공데이터포털 「한국농수산식품유통공사_일별 도,소매 가격정보 조회」로 옮겼습니다.

## 1. 인증키 (무료)

공공데이터포털(data.go.kr) → 마이페이지 → 활용신청 현황 →
「한국농수산식품유통공사_일별 도,소매 가격정보 조회」 → **일반 인증키**

## 2. 매일 자동 실행 (GitHub Actions)

1. 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - 이름 `DATA_GO_KR_KEY`, 값 = 위 일반 인증키
2. `.github/workflows/update-prices.yml` 이 매일 한국시간 오전 7시에
   시세를 받아 `data/prices.json` 을 커밋합니다.
   (Actions 탭에서 **Run workflow** 로 즉시 실행도 가능)

**인증키를 파일에 적지 마세요.** 이 저장소는 공개되어 있습니다.

## 3. 내 컴퓨터에서 시험 (Node 18 이상)

```bash
DATA_GO_KR_KEY=일반인증키 node scripts/update-prices.mjs
```

성공하면 `✓ data/prices.json 갱신 — 기준일 2026-11-20, 11개 품목` 처럼 나옵니다.

## 품목 바꾸기

`scripts/update-prices.mjs` 상단 `WANTED` 배열만 고치면 됩니다.

```js
{ label: '화면에 보일 이름', ctgry: '부류코드', item: '품목코드', vrty: '품종코드(생략 가능)' }
```

- 부류코드: `100` 식량작물 · `200` 채소류 · `300` 특용작물 · `400` 과일류
- 품목·품종 코드는 공공데이터포털 참고문서(API명세 zip)의 코드표를 봅니다
- 건고추는 이 서비스에 서울 중도매 시세가 없어 빠져 있습니다

## 참고

- 서울 **중도매** 가격, 등급은 「상품」(포도는 L과) 기준입니다
- 도매시세는 하루 1회 발표이고 주말·공휴일은 없습니다. 최근 2주 안에서 가장 최근 값을 씁니다
- 품목이 5개 미만으로 들어오면 기존 파일을 그대로 둡니다
