#!/usr/bin/env node
// Notion → data.json 동기화 스크립트
// GitHub Action에서 NOTION_API_KEY 환경변수로 실행

const { writeFileSync } = require('fs');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const BASE_URL = 'https://api.notion.com/v1';
const HEADERS = {
  'Authorization': `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

// 데이터베이스 ID
const DB = {
  areaResource: '1655249e-7325-814b-a5b1-dab828ecc832',
  project:      '1655249e-7325-8155-8bb4-edfb3c18c9ea',
  note:         '1655249e-7325-8168-acf1-ca00ab11696b',
};

// 데이터베이스 전체 페이지 조회 (페이지네이션 자동 처리)
async function queryAll(databaseId) {
  const results = [];
  let cursor;
  do {
    const body = cursor ? { start_cursor: cursor } : {};
    const res = await fetch(`${BASE_URL}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DB 쿼리 실패 [${databaseId}]: ${res.status} ${err}`);
    }
    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return results;
}

// 헬퍼
function getTitle(page) {
  return (page.properties['이름']?.title || []).map(t => t.plain_text).join('').trim() || '(제목 없음)';
}
function getStatus(page) {
  return page.properties['상태']?.status?.name || null;
}
function getRelIds(page, prop) {
  return (page.properties[prop]?.relation || []).map(r => r.id);
}
function pageUrl(id) {
  return `https://www.notion.so/${id.replace(/-/g, '')}`;
}

async function main() {
  console.log('Notion 데이터 동기화 시작...');

  const [arPages, prPages, ntPages] = await Promise.all([
    queryAll(DB.areaResource),
    queryAll(DB.project),
    queryAll(DB.note),
  ]);

  console.log(`영역·자원 ${arPages.length}개 / 프로젝트 ${prPages.length}개 / 노트 ${ntPages.length}개`);

  const nodes = [];
  const links = [];
  const idToName = new Map(); // pageId → node name

  // ── 영역·자원 ──────────────────────────────
  for (const page of arPages) {
    const status = getStatus(page);
    const archived = status === '아카이브';

    const name = getTitle(page);
    const type = archived ? 'archived' : (status === '영역' ? 'area' : 'resource');
    const noteIds = getRelIds(page, '노트');

    idToName.set(page.id, name);
    nodes.push({
      id: name,
      type,
      noteCount: noteIds.length,
      url: pageUrl(page.id),
      _pageId: page.id,
      _noteIds: noteIds,
    });
  }

  // ── 프로젝트 ───────────────────────────────
  for (const page of prPages) {
    const name = getTitle(page);
    const status = getStatus(page) || '시작 안 함';
    const noteIds = getRelIds(page, '노트');
    const areaIds = getRelIds(page, '영역 · 자원');

    idToName.set(page.id, name);
    nodes.push({
      id: name,
      type: 'project',
      status,
      noteCount: noteIds.length,
      url: pageUrl(page.id),
      _pageId: page.id,
      _noteIds: noteIds,
      _areaIds: areaIds,
    });
  }

  // ── 노트 (전체 포함) ───────────────────────
  for (const page of ntPages) {
    const areaIds    = getRelIds(page, '영역 · 자원');
    const projectIds = getRelIds(page, '프로젝트');

    const name = getTitle(page);
    idToName.set(page.id, name);
    nodes.push({
      id: name,
      type: 'note',
      url: pageUrl(page.id),
      _pageId: page.id,
      _areaIds: areaIds,
      _projectIds: projectIds,
    });
  }

  const nameSet = new Set(nodes.map(n => n.id));

  // ── 링크 생성 ─────────────────────────────
  const linkSet = new Set();
  function addLink(source, target, type) {
    const key = `${source}__${target}__${type}`;
    if (!linkSet.has(key) && nameSet.has(source) && nameSet.has(target)) {
      linkSet.add(key);
      links.push({ source, target, type });
    }
  }

  for (const node of nodes) {
    if (node.type === 'area' || node.type === 'resource' || node.type === 'archived') {
      for (const nid of (node._noteIds || [])) {
        const noteName = idToName.get(nid);
        const linkType = node.type === 'archived' ? 'archived-note' : 'area-note';
        if (noteName) addLink(node.id, noteName, linkType);
      }
    }
    if (node.type === 'project') {
      for (const nid of (node._noteIds || [])) {
        const noteName = idToName.get(nid);
        if (noteName) addLink(node.id, noteName, 'project-note');
      }
      for (const aid of (node._areaIds || [])) {
        const areaName = idToName.get(aid);
        if (areaName) addLink(areaName, node.id, 'area-project');
      }
    }
  }

  // 내부 필드 제거
  const cleanNodes = nodes.map(({ _pageId, _noteIds, _areaIds, _projectIds, ...rest }) => rest);

  const output = { nodes: cleanNodes, links };
  writeFileSync('data.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log(`완료: 노드 ${cleanNodes.length}개, 링크 ${links.length}개 → data.json 저장`);
}

main().catch(err => { console.error(err); process.exit(1); });
