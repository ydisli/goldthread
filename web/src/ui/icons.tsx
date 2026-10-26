import {
  Activity, ArrowRight, ArrowUpDown, Binoculars, Bot, BookOpen, BookUser, Brain, BriefcaseBusiness, Calendar, ChartColumn, ChartLine,
  Check, ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleDot, ClipboardCheck, Clock, Combine, Command, Compass, Copy, Download,
  ExternalLink, FileText, Filter, FlaskConical, Gavel, GitBranch, GitCompare, Goal, Grid3x3, Handshake, History, House, Inbox, Kanban,
  Layers, Lightbulb, Link as LinkIcon, ListChecks, ListTree, Map as MapIcon, Megaphone, Menu, MessageSquare, Milestone, Moon, Network,
  PartyPopper, Pencil, Plus, Quote, Radar, Rocket, Route, Scale, Search, Send, Settings, ShieldAlert, SlidersHorizontal, Sparkles, Split,
  Star, Sun, Swords, Table2, Target, Trash2, TrendingDown, TrendingUp, TriangleAlert, Upload, UserRound, Users, WandSparkles, Workflow,
  X, Zap, Boxes, Gauge, Flag,
  ChevronsUpDown, Pin, PinOff, Plug, CircleUser, LogOut, UserPlus, Ellipsis, KeyRound, Shield, Mail, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, GripVertical, Circle, Diamond, Square, Move, Rows3, Columns3, Eye, Lock, LayoutGrid, ArrowLeft, Play, CircleStop, Spline, Hand, RefreshCw, ArrowRightLeft, Terminal, Server, Puzzle, AtSign, GraduationCap, BookMarked, Bookmark, CircleHelp, Keyboard, FileUp, ArchiveRestore, ListOrdered, ChevronLeft, NotebookPen, Paperclip, FileImage, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  activity: Activity, 'arrow-right': ArrowRight, 'arrow-up-down': ArrowUpDown, binoculars: Binoculars, bot: Bot, 'book-open': BookOpen,
  'book-user': BookUser, brain: Brain, 'briefcase-business': BriefcaseBusiness, calendar: Calendar, 'chart-column': ChartColumn,
  'chart-line': ChartLine, check: Check, 'chevron-down': ChevronDown, 'chevron-right': ChevronRight, 'circle-alert': CircleAlert,
  'circle-check': CircleCheck, 'circle-dot': CircleDot, 'clipboard-check': ClipboardCheck, clock: Clock, combine: Combine, command: Command,
  compass: Compass, copy: Copy, download: Download, 'external-link': ExternalLink, 'file-text': FileText, filter: Filter,
  'flask-conical': FlaskConical, gavel: Gavel, 'git-branch': GitBranch, 'git-compare': GitCompare, goal: Goal, 'grid-3x3': Grid3x3,
  handshake: Handshake, history: History, house: House, inbox: Inbox, kanban: Kanban, layers: Layers, lightbulb: Lightbulb, link: LinkIcon,
  'list-checks': ListChecks, 'list-tree': ListTree, map: MapIcon, megaphone: Megaphone, menu: Menu, 'message-square': MessageSquare,
  milestone: Milestone, moon: Moon, network: Network, 'party-popper': PartyPopper, pencil: Pencil, plus: Plus, quote: Quote, radar: Radar,
  rocket: Rocket, route: Route, scale: Scale, search: Search, send: Send, settings: Settings, 'shield-alert': ShieldAlert,
  'sliders-horizontal': SlidersHorizontal, sparkles: Sparkles, split: Split, star: Star, sun: Sun, swords: Swords, 'table-2': Table2,
  target: Target, 'trash-2': Trash2, 'trending-down': TrendingDown, 'trending-up': TrendingUp, 'triangle-alert': TriangleAlert, upload: Upload,
  'user-round': UserRound, users: Users, 'wand-sparkles': WandSparkles, workflow: Workflow, x: X, zap: Zap, boxes: Boxes, gauge: Gauge, flag: Flag,
  'chevrons-up-down': ChevronsUpDown, 'pin': Pin, 'pin-off': PinOff, 'plug': Plug, 'circle-user': CircleUser, 'log-out': LogOut, 'user-plus': UserPlus, 'ellipsis': Ellipsis, 'key-round': KeyRound, 'shield': Shield, 'mail': Mail, 'undo-2': Undo2, 'redo-2': Redo2, 'zoom-in': ZoomIn, 'zoom-out': ZoomOut, 'maximize': Maximize, 'grip-vertical': GripVertical, 'circle': Circle, 'diamond': Diamond, 'square': Square, 'move': Move, 'rows-3': Rows3, 'columns-3': Columns3, 'eye': Eye, 'lock': Lock, 'layout-grid': LayoutGrid, 'arrow-left': ArrowLeft, 'play': Play, 'circle-stop': CircleStop, 'spline': Spline, 'hand': Hand, 'refresh-cw': RefreshCw, 'arrow-right-left': ArrowRightLeft, 'terminal': Terminal, 'server': Server, 'puzzle': Puzzle, 'at-sign': AtSign, 'graduation-cap': GraduationCap, 'book-marked': BookMarked, 'bookmark': Bookmark, 'circle-help': CircleHelp, 'keyboard': Keyboard, 'file-up': FileUp, 'archive-restore': ArchiveRestore, 'list-ordered': ListOrdered, 'chevron-left': ChevronLeft, 'notebook-pen': NotebookPen, 'paperclip': Paperclip, 'file-image': FileImage,
};

export function Icon({ name, size = 16, className, strokeWidth = 1.9 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = MAP[name] ?? CircleDot;
  return <C size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
