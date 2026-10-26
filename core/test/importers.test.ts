import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSource, mapStatus, parseCsv, parseToolDate, planIssueImport, plainText, storiesToCsv, storyParts } from '../engines/importers.ts';
import type { Entity } from '../schema.ts';

const JIRA = `Summary,Issue key,Issue Type,Status,Custom field (Story Points),Sprint,Sprint,Labels,Labels,Resolved,Description
"As a new joiner, I want my laptop ready on day one so that I can start working",SH-101,Story,Done,5,SH Sprint 11,SH Sprint 12,onboarding,jml,20/Oct/26 3:14 PM,"Acceptance criteria:
Given HR has confirmed the start date
When the joiner record is created
Then a laptop request is raised automatically"
Provision VPN on approval,SH-102,Story,In Progress,3,SH Sprint 12,,network,,,
VPN drops every hour,SH-103,Bug,Open,,,,,,,Users on Wi-Fi lose VPN
Self-service portal,SH-90,Epic,In Progress,,,,,,,
Provision VPN on approval,SH-102,Story,In Progress,3,SH Sprint 12,,network,,,`;

const ADO = `ID,Work Item Type,Title,State,Story Points,Iteration Path,Tags,Description,Acceptance Criteria,Closed Date
4512,User Story,Reset password from the portal,Closed,2,ServiceHub\\Sprint 9,self-service; identity,<div>Users reset without a ticket</div>,<ul><li>Given a locked account</li></ul>,10/14/2026 9:02:00 AM
4513,User Story,Show ticket ETA,Active,3,ServiceHub\\Sprint 10,portal,,,`;

test('CSV parsing keeps quoted commas and newlines', () => {
  const rows = parseCsv('a,b\n"x, y","line 1\nline 2"\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'line 1\nline 2']]);
});

test('source detection, status mapping and tool dates', () => {
  assert.equal(detectSource(parseCsv(JIRA)[0]), 'jira');
  assert.equal(detectSource(parseCsv(ADO)[0]), 'ado');
  assert.equal(mapStatus('Selected for Development'), 'ready');
  assert.equal(mapStatus('In QA'), 'in-review');
  assert.equal(mapStatus('Active'), 'in-progress');
  assert.equal(mapStatus('Closed'), 'done');
  assert.equal(mapStatus('To Do'), 'backlog');
  assert.equal(parseToolDate('20/Oct/26 3:14 PM'), '2026-10-20');
  assert.equal(parseToolDate('10/14/2026 9:02:00 AM'), '2026-10-14');
  assert.equal(parseToolDate('2026-10-01T10:00:00Z'), '2026-10-01');
  assert.equal(parseToolDate('soon'), undefined);
});

test('text helpers pull out the narrative and strip HTML', () => {
  assert.deepEqual(storyParts('As a service desk agent, I want to see the asset owner so that I can route faster.'), { asA: 'service desk agent', iWant: 'see the asset owner', soThat: 'I can route faster' });
  assert.equal(plainText('<div>One</div><ul><li>Two</li></ul>&amp; three'), 'One\n- Two\n& three');
});

test('a Jira export becomes stories and defects, epics and duplicates are skipped', () => {
  const plan = planIssueImport(parseCsv(JIRA), []);
  assert.equal(plan.source, 'jira');
  assert.equal(plan.creates.length, 2);
  assert.equal(plan.defects.length, 1);
  const first = plan.creates[0];
  assert.equal(first.externalKey, 'SH-101');
  assert.equal(first.status, 'done');
  assert.equal(first.doneAt, '2026-10-20');
  assert.equal(first.estimate, 5);
  assert.equal(first.sprint, 'SH Sprint 12', 'the last sprint wins');
  assert.deepEqual(first.tags, ['onboarding', 'jml']);
  assert.equal(first.asA, 'new joiner');
  assert.match(String(first.acceptance), /^Given HR has confirmed/);
  assert.deepEqual(plan.skipped.map((s) => s.reason).sort(), ['duplicate row', 'epics and features (track these as bets)']);
});

test('an Azure DevOps export maps iteration paths, tags and HTML', () => {
  const plan = planIssueImport(parseCsv(ADO), []);
  assert.equal(plan.source, 'ado');
  assert.equal(plan.creates[0].sprint, 'Sprint 9');
  assert.deepEqual(plan.creates[0].tags, ['self-service', 'identity']);
  assert.equal(plan.creates[0].description, 'Users reset without a ticket');
  assert.equal(plan.creates[0].acceptance, '- Given a locked account');
  assert.equal(plan.creates[0].doneAt, '2026-10-14');
  assert.equal(plan.creates[1].status, 'in-progress');
});

test('re-importing updates stories by key and keeps what was written in Throughline', () => {
  const existing = [{ id: 'sto_1', type: 'story', createdAt: '', updatedAt: '', title: 'Provision VPN', status: 'ready', estimate: 3, externalKey: 'SH-102', acceptance: 'Written here', requirementIds: ['req_1'] }] as Entity[];
  const plan = planIssueImport(parseCsv(JIRA), existing);
  assert.equal(plan.creates.length, 1);
  assert.equal(plan.updates.length, 1);
  assert.deepEqual(plan.updates[0], { id: 'sto_1', key: 'SH-102', data: { title: 'Provision VPN on approval', status: 'in-progress', sprint: 'SH Sprint 12' } });
});

test('stories export to a CSV that round-trips', () => {
  const csv = storiesToCsv([{ id: 's', type: 'story', createdAt: '', updatedAt: '', key: 'ST-1', title: 'Reset, fast', asA: 'agent', iWant: 'one click', acceptance: 'Given x\nThen y', estimate: 2, tags: ['identity'] } as Entity]);
  const [head, row] = parseCsv(csv);
  assert.equal(head[0], 'Summary');
  assert.equal(row[0], 'Reset, fast');
  assert.match(row[2], /^As a agent, I want one click\./);
  assert.equal(row[3], 'Given x\nThen y');
  assert.equal(planIssueImport(parseCsv(csv), []).creates[0].estimate, 2);
});

test('re-importing bugs updates the defects already imported, by key', () => {
  const existing = [{ id: 'def_1', type: 'defect', createdAt: '', updatedAt: '', title: 'VPN drops every hour', status: 'new', severity: 's3-minor', externalKey: 'SH-103' }] as Entity[];
  const csv = 'Summary,Issue key,Issue Type,Status,Priority\nVPN drops every hour,SH-103,Bug,Done,High\nPrinter offline,SH-104,Bug,Open,Low';
  const plan = planIssueImport(parseCsv(csv), existing);
  assert.deepEqual(plan.defectUpdates, [{ id: 'def_1', key: 'SH-103', data: { status: 'closed', severity: 's2-major' } }]);
  assert.equal(plan.defects.length, 1);
  assert.equal(plan.defects[0].externalKey, 'SH-104');
});
