import type { ReactNode } from 'react';
import { EntityListPage, EntityPage } from './entity/views.tsx';
import { useEntity } from './store.ts';
import { InboxPage, TodayPage } from './pages/today/Today.tsx';
import { StakeholderProfilePage, StakeholdersPage } from './pages/stakeholders/Overview.tsx';
import { StakeholderMapsPage } from './pages/stakeholders/Maps.tsx';
import { CommitmentsPage, EngagementPage, RequestsPage } from './pages/stakeholders/Engagement.tsx';
import { ApprovalsPage, ConflictsPage, RaciListPage, RaciPage } from './pages/stakeholders/Governance.tsx';
import { BusinessCasePage, BusinessCasesPage, CapacityPage, MarketPage, MetricsPage, VisionPage } from './pages/strategy/Strategy.tsx';
import { SpecPage, SpecsPage } from './pages/define/SpecStudio.tsx';
import { BaselinePage, ChangeRequestPanel, DecisionPage, DecisionsPage, RequirementPage, RequirementsPage } from './pages/define/Requirements.tsx';
import { DecisionTablePage, DecisionTablesPage, StateModelPage } from './pages/define/Rules.tsx';
import { ProcessListPage, ProcessPage } from './pages/define/Process.tsx';
import { StoryMapPage, StoryMapsPage, StoryPage } from './pages/define/StoryMap.tsx';
import { DataEntityPage, ElicitationPage, GlossaryPage, RootCausePage, ToolkitPage } from './pages/define/Toolkit.tsx';
import { BacklogPage, PrioritizePage, PulsePage, RaidPage, ReleasePage, ReleasesPage, RoadmapPage, TracePage, UatPage } from './pages/deliver/Deliver.tsx';
import { FeaturesPage, LedgerPage } from './pages/learn/Learn.tsx';
import { ActivityPage, AskPage, DocsPage, MeetingPage, MeetingsPage } from './pages/workspace/Workspace.tsx';
import { SettingsPage } from './pages/settings/Settings.tsx';
import { SectionPage, ToolsPage } from './pages/tools/Tools.tsx';
import { AssumptionsPage, BetPage, BetsPage, CustomersPage, ExperimentPage, ExperimentsPage, JourneyPage, OpportunitiesPage, SignalsPage } from './pages/discover/Discover.tsx';

export interface Route { path: string; render: (p: Record<string, string>, q: URLSearchParams) => ReactNode }

export const ROUTES: Route[] = [
  { path: '/today', render: () => <TodayPage /> },
  { path: '/inbox', render: () => <InboxPage /> },
  { path: '/tools', render: () => <ToolsPage /> },
  { path: '/s/:id', render: (p) => <SectionPage key={p.id} id={p.id} /> },
  // Stakeholders
  { path: '/stakeholders', render: () => <StakeholdersPage /> },
  { path: '/stakeholders/p/:id', render: (p) => <StakeholderProfilePage key={p.id} id={p.id} /> },
  { path: '/stakeholders/maps', render: () => <StakeholderMapsPage /> },
  { path: '/stakeholders/engagement', render: () => <EngagementPage /> },
  { path: '/stakeholders/requests', render: () => <RequestsPage /> },
  { path: '/stakeholders/commitments', render: () => <CommitmentsPage /> },
  { path: '/stakeholders/raci', render: () => <RaciListPage /> },
  { path: '/stakeholders/raci/:id', render: (p) => <RaciPage key={p.id} id={p.id} /> },
  { path: '/stakeholders/approvals', render: () => <ApprovalsPage /> },
  { path: '/stakeholders/conflicts', render: () => <ConflictsPage /> },
  // Strategy
  { path: '/strategy', render: () => <VisionPage /> },
  { path: '/strategy/metrics', render: () => <MetricsPage /> },
  { path: '/strategy/business-cases', render: () => <BusinessCasesPage /> },
  { path: '/strategy/business-cases/:id', render: (p) => <BusinessCasePage key={p.id} id={p.id} /> },
  { path: '/strategy/market', render: () => <MarketPage /> },
  { path: '/strategy/capacity', render: () => <CapacityPage /> },
  // Discover
  { path: '/discover/signals', render: () => <SignalsPage /> },
  { path: '/discover/opportunities', render: () => <OpportunitiesPage /> },
  { path: '/discover/bets', render: () => <BetsPage /> },
  { path: '/discover/bets/:id', render: (p) => <BetPage key={p.id} id={p.id} /> },
  { path: '/discover/assumptions', render: () => <AssumptionsPage /> },
  { path: '/discover/experiments', render: () => <ExperimentsPage /> },
  { path: '/discover/experiments/:id', render: (p) => <ExperimentPage key={p.id} id={p.id} /> },
  { path: '/discover/customers', render: () => <CustomersPage /> },
  { path: '/discover/journeys/:id', render: (p) => <JourneyPage key={p.id} id={p.id} /> },
  // Define
  { path: '/define/specs', render: () => <SpecsPage /> },
  { path: '/define/specs/:id', render: (p) => <SpecPage key={p.id} id={p.id} /> },
  { path: '/define/requirements', render: () => <RequirementsPage /> },
  { path: '/define/requirements/:id', render: (p) => <RequirementPage key={p.id} id={p.id} /> },
  { path: '/define/baselines/:id', render: (p) => <BaselinePage key={p.id} id={p.id} /> },
  { path: '/define/changes/:id', render: (p) => <ChangeRequestRoute key={p.id} id={p.id} /> },
  { path: '/define/decisions', render: () => <DecisionsPage /> },
  { path: '/define/decisions/:id', render: (p) => <DecisionPage key={p.id} id={p.id} /> },
  { path: '/define/decision-tables', render: () => <DecisionTablesPage /> },
  { path: '/define/decision-tables/:id', render: (p) => <DecisionTablePage key={p.id} id={p.id} /> },
  { path: '/define/process', render: () => <ProcessListPage /> },
  { path: '/define/process/:id', render: (p) => <ProcessPage key={p.id} id={p.id} /> },
  { path: '/define/states/:id', render: (p) => <StateModelPage key={p.id} id={p.id} /> },
  { path: '/define/story-map', render: () => <StoryMapsPage /> },
  { path: '/define/story-map/:id', render: (p) => <StoryMapPage key={p.id} id={p.id} /> },
  { path: '/define/stories/:id', render: (p) => <StoryPage key={p.id} id={p.id} /> },
  { path: '/define/toolkit', render: () => <ToolkitPage /> },
  { path: '/define/elicitation/:id', render: (p) => <ElicitationPage key={p.id} id={p.id} /> },
  { path: '/define/data/:id', render: (p) => <DataEntityPage key={p.id} id={p.id} /> },
  { path: '/define/root-cause/:id', render: (p) => <RootCausePage key={p.id} id={p.id} /> },
  { path: '/define/glossary', render: () => <GlossaryPage /> },
  // Deliver
  { path: '/deliver/backlog', render: () => <BacklogPage /> },
  { path: '/deliver/prioritize', render: () => <PrioritizePage /> },
  { path: '/deliver/roadmap', render: () => <RoadmapPage /> },
  { path: '/deliver/releases', render: () => <ReleasesPage /> },
  { path: '/deliver/releases/:id', render: (p) => <ReleasePage key={p.id} id={p.id} /> },
  { path: '/deliver/pulse', render: () => <PulsePage /> },
  { path: '/deliver/raid', render: () => <RaidPage /> },
  { path: '/deliver/uat', render: () => <UatPage /> },
  { path: '/deliver/trace', render: () => <TracePage /> },
  // Learn
  { path: '/learn/ledger', render: () => <LedgerPage /> },
  { path: '/learn/features', render: () => <FeaturesPage /> },
  // Workspace
  { path: '/ask', render: () => <AskPage /> },
  { path: '/workspace/meetings', render: () => <MeetingsPage /> },
  { path: '/workspace/meetings/:id', render: (p) => <MeetingPage key={p.id} id={p.id} /> },
  { path: '/workspace/docs', render: () => <DocsPage /> },
  { path: '/workspace/activity', render: () => <ActivityPage /> },
  { path: '/workspace/settings', render: () => <SettingsPage /> },
  // Generic
  { path: '/e/:type', render: (p) => <EntityListPage type={p.type} /> },
  { path: '/e/:type/:id', render: (p) => <EntityPage key={p.id} id={p.id} /> },
];

function ChangeRequestRoute({ id }: { id: string }) {
  const cr = useEntity(id);
  return <EntityPage id={id}>{cr && <ChangeRequestPanel cr={cr} />}</EntityPage>;
}
