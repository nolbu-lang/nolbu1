# 심사조서 검색 (nolbu1)

부산광역시 예산 심사조서(경상사업·투자사업) CSV를 **각자 모바일 기기에 직접 저장하고 오프라인으로 검색**하는 PWA(모바일 웹앱)입니다.

## 특징

- **오프라인 동작**: 한 번 설치하면 인터넷 없이 각 기기에서 독립 실행 (아이폰·아이패드·안드로이드폰·안드로이드패드)
- **내 기기에만 저장**: CSV를 브라우저 내부(IndexedDB)에 저장, 서버 전송 없음
- **파일 관리**: CSV 업로드·삭제·목록 확인
- **4개 조건 검색**: 부서명 · 사업명 · 시행기관(사업개요) · 조건검색어 (필드별 독립, 다중 입력 시 AND, 띄어쓰기·영문 대소문자 무시)
- **결과 표 + 상세 보기**: 유형(년도·차수·사업), 부서명, 사업명(통계목), 요구액·조정액(백만원, 국비/시비)

## 개발

```bash
npm install
npm run dev        # 로컬 개발 서버
npm run build      # 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
```

Node.js 20 이상 권장 (`.nvmrc` 참고).

## 배포

빌드 결과를 `gh-pages` 브랜치로 올려 GitHub Pages에 배포합니다.

```bash
npm run deploy
```

- 배포 주소: https://nolbu-lang.github.io/nolbu1/
- 저장소 **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`** 설정 필요 (최초 1회)

## 기술 스택

React + TypeScript + Vite, vite-plugin-pwa(Workbox), idb, papaparse
