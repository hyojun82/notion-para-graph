# notion-para-graph

Notion PARA 노트를 Obsidian 스타일의 인터랙티브 그래프로 시각화하는 도구입니다.

---

## 개요

Notion에 구축된 PARA(Projects, Areas, Resources, Actions) 체계의 데이터를 D3.js 기반 force-directed 그래프로 시각화합니다. GitHub Actions가 30분마다 Notion API를 호출해 `data.json`을 자동 갱신하고, 브라우저에서는 30초마다 최신 데이터를 불러옵니다.

```
Notion DB ──(30분마다)──▶ sync-notion.js ──▶ data.json ──▶ index.html (그래프)
```

---

## 파일 구조

```
notion-para-graph/
├── index.html                    # 그래프 시각화 (D3.js)
├── data.json                     # 동기화된 그래프 데이터 (자동 생성)
├── scripts/
│   └── sync-notion.js            # Notion API → data.json 동기화 스크립트
└── .github/
    └── workflows/
        └── sync-notion.yml       # GitHub Actions 워크플로우 (30분 주기)
```

---

## 노드 타입

| 타입 | 모양 | 색상 | 설명 |
|------|------|------|------|
| 영역 (Area) | 원 | 파랑 `#4a9eff` | Notion 영역·자원 DB에서 상태가 `영역`인 항목 |
| 자원 (Resource) | 원 | 보라 `#b06fff` | Notion 영역·자원 DB에서 상태가 `자원`인 항목 |
| 프로젝트 (Project) | 사각형 | 주황 `#ff8c42` (진행 중) / 노랑 (시작 안 함) / 회색 (완료) | Notion 프로젝트 DB 항목 |
| 노트 (Note) | 원 | 청록 `#4ecdc4` | Notion 노트 DB 항목 |
| 아카이브 (Archived) | 원 | 회색 `#555` | 상태가 `아카이브`인 영역·자원 항목 |

- 노드 **크기**는 연결된 노트 수에 비례합니다.
- **고아 노트**: 영역·자원 또는 프로젝트와 연결이 없는 노트 (그래프에 표시되나 링크 없음)

---

## 링크 타입

| 타입 | 색상 | 설명 |
|------|------|------|
| `area-note` | 회색 실선 | 영역·자원 → 노트 |
| `project-note` | 주황 실선 | 프로젝트 → 노트 |
| `area-project` | 초록 점선 | 영역 → 프로젝트 |
| `archived-note` | 어두운 점선 | 아카이브 → 노트 |

---

## 주요 기능

### 인터랙션
- **드래그**: 노드를 마우스로 이동
- **줌**: 스크롤 또는 우측 하단 `+` / `−` 버튼
- **클릭**: 해당 Notion 페이지로 이동
- **호버**: 노드 정보 툴팁 + 연결된 링크 하이라이트

### 레전드 토글
좌측 상단 레전드에서 각 항목 클릭 시 해당 타입 숨김/표시 전환:
- 영역 / 자원 / 프로젝트 / 노트
- **아카이브** (아카이브된 영역·자원 표시 여부)
- **고아 노트** (연결 없는 노트 표시 여부)

### 검색
우측 상단 검색창에서 노드 이름으로 검색 시 해당 노드와 연결 링크를 강조 표시합니다.

### 자동 갱신
- 브라우저에서 30초마다 `data.json`을 자동으로 다시 불러옵니다.
- 좌측 상단 녹색 점(●)이 실시간 상태를 나타냅니다.
- 우측 하단 `↺` 버튼으로 즉시 갱신할 수 있습니다.

---

## 시작하기 전에 — Notion 템플릿

이 도구는 **닥터가드너님의 PARA 정리법 메모앱**의 PARA 구조를 기반으로 동작합니다. 아래 Notion 템플릿을 본인 워크스페이스에 복제한 후 진행하세요.

> **Notion 템플릿**: [PARA 611 — Notion 마켓플레이스](https://www.notion.com/ko/templates/para-611)

템플릿에는 아래 3개 DB와 속성이 포함되어 있어야 합니다:

| DB | 필수 속성 |
|----|----------|
| 영역·자원 | `이름` (제목), `상태` (영역 / 자원 / 아카이브), `노트` (관계) |
| 프로젝트 | `이름` (제목), `상태`, `노트` (관계), `영역 · 자원` (관계) |
| 노트 | `이름` (제목), `영역 · 자원` (관계), `프로젝트` (관계) |

---

## 설정 방법

### 1. 이 레포 Fork

우측 상단 **Fork** 버튼으로 본인 GitHub 계정에 복제합니다.

### 2. Notion Integration 생성

[https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) 에서 Internal Integration을 생성하고 API Key(`ntn_...`)를 복사합니다.

### 3. Notion DB 연결

위 3개 데이터베이스 각각에서 `···` → **연결(Connections)** → Integration 추가.

### 4. DB ID 설정

`config.json`의 값을 본인 Notion DB ID로 교체합니다.

```json
{
  "databases": {
    "areaResource": "여기에_영역자원_DB_ID",
    "project":      "여기에_프로젝트_DB_ID",
    "note":         "여기에_노트_DB_ID"
  }
}
```

> DB ID 확인: Notion DB 페이지 URL에서 `notion.so/workspace/`**`32자리`**`?v=...` 부분

### 5. GitHub Secret 설정

GitHub 레포 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- Name: `NOTION_API_KEY`
- Value: Notion Integration API Key

### 6. GitHub Pages 활성화

GitHub 레포 → **Settings** → **Pages** → Source: `main` 브랜치 `/root` → **Save**

활성화 후 `https://{username}.github.io/notion-para-graph/` 에서 그래프를 확인할 수 있습니다.

---

## GitHub Actions 워크플로우

`.github/workflows/sync-notion.yml`

- **트리거**: 30분마다 자동 실행 (`cron: '*/30 * * * *'`) + 수동 실행 가능
- **동작**:
  1. `node scripts/sync-notion.js` 실행 → Notion API 호출 → `data.json` 생성
  2. 변경이 있을 경우 `data.json`을 자동 커밋 & 푸시
