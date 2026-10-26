import { lazy } from 'react';

// The Field Guide carries the whole book, so it loads on first use only.
const guide = () => import('./Guide.tsx');
export const GuidePage = lazy(() => guide().then((m) => ({ default: m.GuidePage })));
export const ChapterPage = lazy(() => guide().then((m) => ({ default: m.ChapterPage })));
export const GuideCard = lazy(() => guide().then((m) => ({ default: m.GuideCard })));
