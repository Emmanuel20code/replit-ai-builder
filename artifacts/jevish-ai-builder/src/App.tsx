import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Code2,
  ExternalLink,
  FileCode2,
  FileJson2,
  Folder,
  FolderOpen,
  GitBranch,
  Github,
  Globe2,
  History,
  Layers3,
  Loader2,
  Menu,
  MoreHorizontal,
  PanelLeft,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Settings2,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  getGetGithubStatusQueryKey,
  useGenerateProject,
  useGetGithubStatus,
  usePushAppToGithub,
  usePushProjectToGithub,
} from '@workspace/api-client-react';
import type {
  AppPushInput,
  AppPushResult,
  GithubPushInput,
  ProjectFile,
  ProjectGeneration,
  PushResult,
} from '@workspace/api-client-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const demoFiles: ProjectFile[] = [
  {
    path: 'src/App.tsx',
    content: `import { useState } from "react";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#16213b]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <span className="font-bold tracking-tight">field notes</span>
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "Close" : "Menu"}
        </button>
      </nav>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20">
        <p className="mb-5 text-sm uppercase tracking-[0.2em] text-[#e95f47]">
          A small place for big thoughts
        </p>
        <h1 className="max-w-3xl text-6xl font-black tracking-[-0.06em]">
          Make room for the things worth remembering.
        </h1>
      </section>
    </main>
  );
}`,
  },
  {
    path: 'src/styles.css',
    content: `@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap");

:root {
  font-family: "DM Sans", sans-serif;
  color: #16213b;
  background: #f4f1e8;
}

button { cursor: pointer; }`,
  },
  {
    path: 'package.json',
    content: `{
  "name": "field-notes",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}`,
  },
];

const demoGeneration: ProjectGeneration = {
  summary: 'A warm, editorial landing page for collecting thoughts in the margins.',
  files: demoFiles,
};

type HistoryItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
};

const starterHistory: HistoryItem[] = [
  { id: 'field-notes', title: 'Field notes', detail: 'Editorial note-taking page', time: 'Just now' },
  { id: 'tiny-weather', title: 'Tiny weather', detail: 'One-screen local forecast', time: 'Yesterday' },
  { id: 'studio-index', title: 'Studio index', detail: 'Portfolio with a sharp edge', time: 'Jun 18' },
];

function readStoredGeneration(): ProjectGeneration {
  try {
    const value = window.localStorage.getItem('jevish-current-project');
    return value ? JSON.parse(value) as ProjectGeneration : demoGeneration;
  } catch {
    return demoGeneration;
  }
}

function writeStoredGeneration(value: ProjectGeneration) {
  window.localStorage.setItem('jevish-current-project', JSON.stringify(value));
}

function readStoredHistory(): HistoryItem[] {
  try {
    const value = window.localStorage.getItem('jevish-history');
    return value ? JSON.parse(value) as HistoryItem[] : starterHistory;
  } catch {
    return starterHistory;
  }
}

function NavRail({ mobileOpen, closeMobile }: { mobileOpen: boolean; closeMobile: () => void }) {
  const [location] = useLocation();
  const [history, setHistory] = useState<HistoryItem[]>(() => readStoredHistory());
  const navItem = (href: string) => location === href || (href === '/' && location.startsWith('/project/'));

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        data-testid="navigation-sidebar"
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[hsl(var(--sidebar-primary))] font-display text-lg font-extrabold text-[hsl(var(--sidebar-primary-foreground))]">J</span>
            <span className="font-display text-[17px] font-bold tracking-[-0.04em]">jevish</span>
          </Link>
          <button onClick={closeMobile} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white md:hidden" aria-label="Close navigation" data-testid="button-close-navigation">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-12">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Workspace</p>
          <nav className="space-y-1" aria-label="Main navigation">
            <Link href="/" onClick={closeMobile} className={`sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${navItem('/') ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white'}`} data-testid="link-builder">
              <Sparkles className={`h-[17px] w-[17px] ${navItem('/') ? 'text-[hsl(var(--sidebar-primary))]' : ''}`} />
              Builder
              {navItem('/') && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
            </Link>
            <Link href="/" onClick={closeMobile} className="sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/55 hover:bg-white/7 hover:text-white" data-testid="link-projects">
              <Layers3 className="h-[17px] w-[17px]" />
              Projects
              <span className="ml-auto font-mono text-[10px] text-white/30">{history.length}</span>
            </Link>
            <Link href="/settings" onClick={closeMobile} className={`sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${location === '/settings' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white'}`} data-testid="link-settings">
              <Settings2 className={`h-[17px] w-[17px] ${location === '/settings' ? 'text-[hsl(var(--sidebar-primary))]' : ''}`} />
              Settings
            </Link>
          </nav>
        </div>

        <div className="mt-10 min-h-0 flex-1">
          <div className="mb-3 flex items-center justify-between px-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Recent builds</p>
            <button className="text-white/35 transition-colors hover:text-white" onClick={() => { window.localStorage.removeItem('jevish-history'); setHistory([]); }} aria-label="Clear recent builds" data-testid="button-clear-history">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            {history.map((item) => (
              <Link href={`/project/${item.id}`} onClick={closeMobile} key={item.id} className="sidebar-link block rounded-xl px-3 py-2.5 hover:bg-white/7" data-testid={`link-history-${item.id}`}>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-white/75"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />{item.title}</div>
                <div className="mt-1 truncate pl-3.5 text-[11px] text-white/35">{item.detail}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Your space</span>
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--sidebar-primary))]" />
          </div>
          <p className="text-xs leading-5 text-white/55">Describe it plainly. We’ll make the first version worth opening.</p>
          <Link href="/" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--sidebar-primary))]" data-testid="link-new-build">
            <Plus className="h-3.5 w-3.5" /> New build
          </Link>
        </div>
      </aside>
      {mobileOpen && <button onClick={closeMobile} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.35)] md:hidden" aria-label="Close menu overlay" data-testid="button-menu-overlay" />}
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const [location] = useLocation();
  const label = location === '/settings' ? 'Settings' : location.startsWith('/project/') ? 'Project preview' : 'Builder';
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] px-5 md:px-10" data-testid="topbar">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] md:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="h-5 w-5" /></button>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">Studio /</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#71a643]" /> All systems ready</span>
        <Link href="/settings" className="grid h-9 w-9 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--foreground)/.3)] hover:text-[hsl(var(--foreground))]" data-testid="link-topbar-settings"><Settings2 className="h-4 w-4" /></Link>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))] font-display text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="avatar-workspace">J</div>
      </div>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell grain flex bg-[hsl(var(--background))]">
      <NavRail mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenu={() => setMobileOpen(true)} />
        {children}
      </div>
    </div>
  );
}

function EmptyPreview({ onStart }: { onStart: () => void }) {
  return (
    <div className="studio-grid flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] px-6 text-center" data-testid="empty-preview">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"><Globe2 className="h-6 w-6" /></div>
      <h3 className="font-display text-xl font-bold tracking-[-0.03em]">Your preview appears here</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">Start with a sentence. The first pass is only ever a few seconds away.</p>
      <button onClick={onStart} className="interactive mt-6 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm" data-testid="button-start-empty-preview">Use the starter idea</button>
    </div>
  );
}

function FileIcon({ path }: { path: string }) {
  if (path.endsWith('.json')) return <FileJson2 className="h-4 w-4 text-[#d88942]" />;
  if (path.endsWith('.css')) return <FileCode2 className="h-4 w-4 text-[#5d8fd1]" />;
  return <FileCode2 className="h-4 w-4 text-[#bd75b8]" />;
}

function FileTree({ files, activePath, onSelect }: { files: ProjectFile[]; activePath: string; onSelect: (path: string) => void }) {
  return (
    <div className="space-y-1" data-testid="file-tree">
      <div className="mb-3 flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]"><FolderOpen className="h-3.5 w-3.5" /> Project files <span className="ml-auto">{files.length}</span></div>
      {files.map((file) => (
        <button key={file.path} onClick={() => onSelect(file.path)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${activePath === file.path ? 'bg-[hsl(var(--accent)/.18)] font-semibold text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`button-file-${file.path.replace(/[/.]/g, '-')}`}>
          <FileIcon path={file.path} /><span className="truncate">{file.path}</span>{activePath === file.path && <ChevronRight className="ml-auto h-3 w-3 text-[hsl(var(--accent-foreground))]" />}
        </button>
      ))}
    </div>
  );
}

function CodeEditor({ file, onChange }: { file?: ProjectFile; onChange: (content: string) => void }) {
  if (!file) return <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]" data-testid="empty-editor">Select a file to inspect it.</div>;
  const lines = file.content.split('\n');
  return (
    <div className="overflow-auto rounded-b-2xl bg-[#17233d] p-4 text-[12px] leading-[1.65rem] text-[#dce3ef]" data-testid="code-editor">
      <div className="min-w-[480px]">
        {lines.map((line, index) => (
          <div className="code-line flex" key={`${file.path}-${index}`}>
            <span className="w-9 shrink-0 select-none pr-3 text-right font-mono text-[#60708f]">{index + 1}</span>
            <textarea value={line} onChange={(event) => {
              const next = [...lines];
              next[index] = event.target.value;
              onChange(next.join('\n'));
            }} spellCheck={false} rows={1} className="min-h-7 flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 font-mono leading-[1.65rem] text-[#e8edf4] outline-none focus:text-[#d7f27a]" data-testid={`textarea-code-line-${index + 1}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewFrame({ generation, onStart }: { generation?: ProjectGeneration; onStart: () => void }) {
  const appFile = generation?.files.find((file) => /app\.(tsx|jsx|html)$/i.test(file.path)) ?? generation?.files[0];
  if (!generation || !appFile) return <EmptyPreview onStart={onStart} />;
  const title = generation.summary.split(/[.!?]/)[0] || 'Generated project';
  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[#f7f4ec] shadow-sm" data-testid="project-preview">
      <div className="flex items-center gap-2 border-b border-[#dedbd1] bg-[#eeebe1] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e66e5b]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d5ab4d]" /><span className="h-2.5 w-2.5 rounded-full bg-[#77a85a]" />
        <div className="mx-auto flex items-center gap-2 rounded-md bg-[#f7f4ec] px-3 py-1 font-mono text-[9px] text-[#8a887e]"><Globe2 className="h-3 w-3" /> preview.local</div>
        <button className="text-[#8a887e] hover:text-[#16213b]" onClick={onStart} aria-label="Refresh preview" data-testid="button-refresh-preview"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      <div className="min-h-[390px] bg-[#f4f1e8] px-7 py-10 md:px-12 md:py-14">
        <div className="flex items-center justify-between text-[#16213b]">
          <span className="font-bold tracking-[-0.04em]">field notes</span><span className="font-mono text-[10px] uppercase tracking-[.15em] text-[#8d8a80]">Issue 01</span>
        </div>
        <div className="mt-20 max-w-lg">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#df674d]">A small place for big thoughts</p>
          <h3 className="mt-4 font-display text-4xl font-extrabold leading-[.98] tracking-[-.07em] text-[#16213b] md:text-5xl">{title}.</h3>
          <p className="mt-6 max-w-sm text-sm leading-6 text-[#5e6371]">{generation.summary}</p>
          <button className="mt-8 flex items-center gap-2 border-b border-[#16213b] pb-1 text-xs font-bold text-[#16213b]" onClick={onStart} data-testid="button-preview-action">Open the notebook <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function Builder() {
  const [generation, setGeneration] = useState<ProjectGeneration | undefined>(() => readStoredGeneration());
  const [activePath, setActivePath] = useState('src/App.tsx');
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => readStoredHistory());
  const [showHistory, setShowHistory] = useState(false);
  const generateProject = useGenerateProject();
  const files = generation?.files ?? [];
  const activeFile = files.find((file) => file.path === activePath) ?? files[0];

  useEffect(() => {
    if (generation) writeStoredGeneration(generation);
  }, [generation]);

  const updateFile = (content: string) => {
    if (!activeFile || !generation) return;
    const next = { ...generation, files: generation.files.map((file) => file.path === activeFile.path ? { ...file, content } : file) };
    setGeneration(next);
  };

  const submitPrompt = (value = prompt) => {
    const cleanPrompt = value.trim();
    if (!cleanPrompt || generateProject.isPending) return;
    generateProject.mutate({ data: { prompt: cleanPrompt, currentFiles: generation?.files } }, {
      onSuccess: (result) => {
        setGeneration(result);
        setActivePath(result.files[0]?.path ?? '');
        setPrompt('');
        const id = cleanPrompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 28) || `build-${Date.now()}`;
        const item = { id, title: cleanPrompt.split(' ').slice(0, 4).join(' '), detail: result.summary.split(/[.!?]/)[0], time: 'Just now' };
        const nextHistory = [item, ...history.filter((entry) => entry.id !== id)].slice(0, 8);
        setHistory(nextHistory);
        window.localStorage.setItem('jevish-history', JSON.stringify(nextHistory));
      },
    });
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] px-5 py-7 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1180px]">
        <section className="animate-rise">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Make something real</p>
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[.98] tracking-[-0.065em] md:text-6xl">Start with the shape<br className="hidden md:block" /> of an idea.</h1>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">Describe a site, tool, or strange little experiment. JEVISH turns the first sentence into a runnable project you can make your own.</p>
            </div>
            <div className="hidden items-center gap-2 text-right md:flex"><div><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Build mode</div><div className="mt-1 text-sm font-semibold">Open canvas</div></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Sparkles className="h-4 w-4" /></div></div>
          </div>

          <div className="mt-9 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-[var(--shadow-sm)] transition-shadow focus-within:shadow-[var(--shadow-lg)]">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitPrompt(); }} placeholder="I want to make..." rows={3} className="w-full resize-none border-0 bg-transparent px-3 py-2 text-lg font-medium leading-7 outline-none placeholder:text-[hsl(var(--muted-foreground)/.65)] md:text-xl" data-testid="textarea-project-prompt" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-3 pt-3">
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><span className="grid h-6 w-6 place-items-center rounded-md bg-[hsl(var(--muted))]"><Sparkles className="h-3.5 w-3.5" /></span> Press <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-0.5 font-mono text-[10px]">⌘ ↵</kbd> to build</div>
              <button onClick={() => submitPrompt()} disabled={!prompt.trim() || generateProject.isPending} className="interactive flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-generate-project">
                {generateProject.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Building</> : <><Rocket className="h-4 w-4" /> Build project</>}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['A landing page for a neighborhood radio station', 'A tiny tool to plan a weekend away', 'A portfolio that feels like a printed zine'].map((suggestion) => (
              <button onClick={() => { setPrompt(suggestion); submitPrompt(suggestion); }} key={suggestion} className="interactive rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground)/.25)] hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))]" data-testid={`button-suggestion-${suggestion.slice(0, 12).replace(/\s/g, '-')}`}>{suggestion}</button>
            ))}
          </div>
          {generateProject.isError && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e8b0a5] bg-[#fff0ec] px-3 py-2.5 text-sm text-[#9d4437]" data-testid="status-generation-error"><CircleAlert className="h-4 w-4 shrink-0" /> We couldn’t finish that build. Check your connection and try again.</div>}
        </section>

        <section className="mt-14 animate-rise animate-rise-delay-1" data-testid="workspace-section">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><h2 className="font-display text-xl font-bold tracking-[-.04em]">Your workspace</h2><span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{files.length ? `${files.length} files` : 'empty'}</span></div>
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" data-testid="button-toggle-history"><History className="h-3.5 w-3.5" /> History <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} /></button>
          </div>
          {showHistory && <div className="mb-4 grid gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 md:grid-cols-3" data-testid="history-panel">{history.map((item) => <Link key={item.id} href={`/project/${item.id}`} className="rounded-xl px-3 py-2.5 hover:bg-[hsl(var(--muted))]" data-testid={`history-item-${item.id}`}><div className="flex justify-between text-sm font-semibold"><span className="truncate">{item.title}</span><span className="font-mono text-[10px] font-normal text-[hsl(var(--muted-foreground))]">{item.time}</span></div><p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</p></Link>)}</div>}

          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="min-h-[470px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 panel-shadow">
              {generateProject.isPending ? <div className="space-y-3 p-2" data-testid="file-tree-loading">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-7 rounded-lg" />)}</div> : <FileTree files={files} activePath={activeFile?.path ?? ''} onSelect={setActivePath} />}
            </div>
            <div className="min-h-[470px] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] panel-shadow">
              <div className="flex h-12 items-center justify-between border-b border-[hsl(var(--border))] px-4"><div className="flex items-center gap-2 text-xs font-semibold"><Code2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> {activeFile?.path ?? 'Editor'} {activeFile && <span className="font-mono text-[10px] font-normal text-[hsl(var(--muted-foreground))]">edited locally</span>}</div><button className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" onClick={() => activeFile && navigator.clipboard?.writeText(activeFile.content)} aria-label="Copy file contents" data-testid="button-copy-code"><Save className="h-4 w-4" /></button></div>
              <CodeEditor file={activeFile} onChange={updateFile} />
            </div>
            <PreviewFrame generation={generation} onStart={() => setPrompt('A polished personal homepage with a bold editorial layout')} />
          </div>
        </section>

        <section className="mt-16 grid gap-5 border-t border-[hsl(var(--border))] pt-7 md:grid-cols-[1fr_1fr_1.4fr]" data-testid="builder-notes">
          <div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]"><Play className="h-3.5 w-3.5 text-[#df674d]" /> Run it</div><p className="max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">Every build lands as a living preview, not a screenshot of a promise.</p></div>
          <div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]"><Terminal className="h-3.5 w-3.5 text-[#df674d]" /> Make it yours</div><p className="max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">Edit the files directly, then ask for the next move in plain language.</p></div>
          <div className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><div className="flex items-start justify-between"><p className="font-display text-lg font-bold tracking-[-.03em]">Good work compounds.</p><ArrowUpRight className="h-4 w-4 opacity-60" /></div><p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)/.65)]">When the idea has a pulse, send it somewhere. Connect GitHub in Settings to publish when you’re ready.</p><Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-xs font-bold underline decoration-[hsl(var(--accent))] underline-offset-4" data-testid="link-builder-settings">Open publishing settings <ChevronRight className="h-3.5 w-3.5" /></Link></div>
        </section>
      </div>
    </main>
  );
}

function SettingsPage() {
  const githubStatus = useGetGithubStatus({ query: { queryKey: getGetGithubStatusQueryKey() } });
  const pushApp = usePushAppToGithub();
  const pushProject = usePushProjectToGithub();
  const [generation] = useState<ProjectGeneration>(() => readStoredGeneration());
  const [appRepository, setAppRepository] = useState('');
  const [appResult, setAppResult] = useState<AppPushResult | null>(null);
  const [repository, setRepository] = useState('');
  const [description, setDescription] = useState('A project made in JEVISH AI Builder');
  const [commitMessage, setCommitMessage] = useState('Build first version');
  const [privateRepo, setPrivateRepo] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const submitPush = () => {
    if (!repository.trim() || !commitMessage.trim() || !generation.files.length || pushProject.isPending) return;
    const data: GithubPushInput = { repository: repository.trim(), description: description.trim(), private: privateRepo, commitMessage: commitMessage.trim(), files: generation.files };
    pushProject.mutate({ data }, { onSuccess: (value) => setResult(value) });
  };

  const submitAppPush = () => {
    if (!appRepository.trim() || pushApp.isPending) return;
    const data: AppPushInput = {
      repository: appRepository.trim(),
      description: 'JEVISH AI Builder — build with ideas',
      private: false,
      commitMessage: 'Publish JEVISH AI Builder',
    };
    pushApp.mutate({ data }, { onSuccess: (value) => setAppResult(value) });
  };

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-8 md:px-10 md:py-12">
      <div className="animate-rise">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Workspace settings</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="font-display text-4xl font-extrabold tracking-[-.06em] md:text-5xl">Put it somewhere.</h1><p className="mt-3 max-w-lg text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">Connect the places where your work lives, then push a project when it has earned its URL.</p></div><div className="hidden rounded-xl bg-[hsl(var(--accent)/.2)] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--foreground))] md:block">Publishing desk</div></div>
      </div>

      <section className="mt-10 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="animate-rise animate-rise-delay-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 panel-shadow" data-testid="github-connection-card">
          <div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Github className="h-5 w-5" /></div>{githubStatus.isLoading ? <div className="skeleton h-6 w-20 rounded-full" data-testid="github-status-loading" /> : githubStatus.data?.connected ? <span className="flex items-center gap-1.5 rounded-full bg-[#e5f0d9] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.1em] text-[#52722f]" data-testid="status-github-connected"><CircleCheck className="h-3.5 w-3.5" /> Connected</span> : <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]" data-testid="status-github-disconnected">Not connected</span>}</div>
          <h2 className="mt-6 font-display text-2xl font-bold tracking-[-.04em]">GitHub connection</h2>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{githubStatus.isLoading ? 'Checking your connection…' : githubStatus.data?.message ?? 'Connect GitHub to publish your builds directly to a repository.'}</p>
          {githubStatus.data?.connected && githubStatus.data.login && <div className="mt-5 flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3" data-testid="github-login"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7e2d8] font-mono text-xs font-bold text-[hsl(var(--foreground))]">{githubStatus.data.login.slice(0, 1).toUpperCase()}</div><div><p className="text-xs font-bold">@{githubStatus.data.login}</p><p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">Ready to publish</p></div><Check className="ml-auto h-4 w-4 text-[#71a643]" /></div>}
          {githubStatus.isError && <div className="mt-5 flex gap-2 rounded-xl border border-[#e8b0a5] bg-[#fff0ec] p-3 text-xs leading-5 text-[#9d4437]" data-testid="status-github-error"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Could not check the connection right now. Refresh to try again.</div>}
          <button onClick={() => githubStatus.refetch()} className="interactive mt-6 flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3.5 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-refresh-github-status"><RefreshCw className={`h-3.5 w-3.5 ${githubStatus.isFetching ? 'animate-spin' : ''}`} /> Refresh connection</button>
        </div>

        <div className="animate-rise animate-rise-delay-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 panel-shadow" data-testid="github-publish-card">
          <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Publish a build</p><h2 className="mt-2 font-display text-2xl font-bold tracking-[-.04em]">Send to GitHub</h2></div><GitBranch className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Repository name</span><input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="my-new-project" className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none transition-shadow placeholder:text-[hsl(var(--muted-foreground)/.6)] focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.25)]" data-testid="input-repository" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description <span className="font-normal text-[hsl(var(--muted-foreground))]">optional</span></span><input value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none transition-shadow focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.25)]" data-testid="input-repository-description" /></label>
            <label><span className="mb-2 block text-xs font-bold">Commit message</span><input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm outline-none transition-shadow focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.25)]" data-testid="input-commit-message" /></label>
            <label className="flex cursor-pointer items-center gap-3 self-end pb-2 text-sm"><input type="checkbox" checked={privateRepo} onChange={(event) => setPrivateRepo(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--accent))]" data-testid="input-private-repository" /><span><span className="block text-xs font-bold">Private repository</span><span className="text-[11px] text-[hsl(var(--muted-foreground))]">Only you can see it</span></span></label>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><FileCode2 className="h-4 w-4" /> {generation.files.length} files from your latest build</span><button onClick={submitPush} disabled={!repository.trim() || !commitMessage.trim() || pushProject.isPending || !generation.files.length} className="interactive flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-push-github">{pushProject.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing</> : <><Github className="h-4 w-4" /> Publish project</>}</button></div>
          {pushProject.isError && <div className="mt-4 flex gap-2 rounded-xl border border-[#e8b0a5] bg-[#fff0ec] p-3 text-xs leading-5 text-[#9d4437]" data-testid="status-push-error"><CircleAlert className="h-4 w-4 shrink-0" /> Publishing failed. Check the repository name and connection, then try again.</div>}
          {result && <div className="mt-4 rounded-xl border border-[#b7d59b] bg-[#eef7e7] p-4 text-sm text-[#52722f]" data-testid="status-push-success"><div className="flex items-center gap-2 font-bold"><CircleCheck className="h-4 w-4" /> {result.message || 'Project published successfully.'}</div><div className="mt-2 flex flex-wrap gap-3 text-xs"><a href={result.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4" data-testid="link-published-repository">Open repository <ExternalLink className="h-3 w-3" /></a>{result.commitUrl && <a href={result.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4" data-testid="link-published-commit">View commit <ExternalLink className="h-3 w-3" /></a>}</div></div>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-md)]" data-testid="publish-app-card">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary-foreground)/.6)]"><Rocket className="h-3.5 w-3.5" /> Publish the builder</div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.05em]">Push JEVISH AI Builder itself.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">This sends the actual app source, API routes, generated contracts, workspace configuration, and documentation to a repository you choose.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px]">
            <label className="font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--primary-foreground)/.6)]" htmlFor="app-repository">App repository name</label>
            <div className="flex gap-2">
              <input id="app-repository" value={appRepository} onChange={(event) => setAppRepository(event.target.value)} placeholder="jevish-ai-builder" className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.3)]" data-testid="input-app-repository" />
              <button onClick={submitAppPush} disabled={!appRepository.trim() || pushApp.isPending} className="interactive flex shrink-0 items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-push-app">{pushApp.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing</> : <><Github className="h-4 w-4" /> Push app</>}</button>
            </div>
          </div>
        </div>
        {pushApp.isError && <div className="mt-4 flex gap-2 rounded-xl border border-[#ffb8a8]/40 bg-[#8f3428]/35 p-3 text-xs leading-5 text-white" data-testid="status-app-push-error"><CircleAlert className="h-4 w-4 shrink-0" /> The app could not be published. Check your GitHub connection and repository name.</div>}
        {appResult && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/15 bg-white/10 p-3 text-xs" data-testid="status-app-push-success"><span className="flex items-center gap-2 font-bold"><CircleCheck className="h-4 w-4 text-[hsl(var(--accent))]" /> {appResult.message} {appResult.filesPublished} files published.</span><a href={appResult.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline underline-offset-4" data-testid="link-app-repository">Open repository <ExternalLink className="h-3 w-3" /></a>{appResult.commitUrl && <a href={appResult.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline underline-offset-4" data-testid="link-app-commit">View commit <ExternalLink className="h-3 w-3" /></a>}</div>}
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-5" data-testid="settings-guidance"><div className="flex items-center gap-2 text-xs font-bold"><PanelLeft className="h-4 w-4 text-[#df674d]" /> A clear handoff</div><p className="mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Your editor changes stay in this workspace until you publish. Nothing moves without your say-so.</p></div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-5" data-testid="settings-privacy"><div className="flex items-center gap-2 text-xs font-bold"><CircleCheck className="h-4 w-4 text-[#71a643]" /> Built for iteration</div><p className="mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Push again to update the same repository. Each publish becomes a useful marker in your project’s story.</p></div>
      </section>
    </main>
  );
}

function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [generation, setGeneration] = useState<ProjectGeneration>(() => readStoredGeneration());
  const [activePath, setActivePath] = useState(generation.files[0]?.path ?? '');
  const activeFile = generation.files.find((file) => file.path === activePath) ?? generation.files[0];
  return (
    <main className="mx-auto w-full max-w-[1260px] px-5 py-8 md:px-10 md:py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="animate-rise"><button onClick={() => setLocation('/')} className="mb-5 flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="button-back-builder"><ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back to builder</button><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Project / {params.id}</p><h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-.06em] md:text-5xl">{params.id?.replace(/-/g, ' ') || 'Untitled project'}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]" data-testid="text-project-summary">{generation.summary}</p></div>
        <div className="flex items-center gap-2 animate-rise animate-rise-delay-1"><Link href="/settings" className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3.5 py-2.5 text-xs font-bold hover:bg-[hsl(var(--muted))]" data-testid="link-project-settings"><Github className="h-3.5 w-3.5" /> Publish</Link><button onClick={() => { writeStoredGeneration(generation); setLocation('/'); }} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-edit-project"><Code2 className="h-3.5 w-3.5" /> Continue editing</button></div>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 panel-shadow"><FileTree files={generation.files} activePath={activeFile?.path ?? ''} onSelect={setActivePath} /></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"><div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] panel-shadow"><div className="flex h-12 items-center gap-2 border-b border-[hsl(var(--border))] px-4 text-xs font-semibold"><Code2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> {activeFile?.path}</div><CodeEditor file={activeFile} onChange={(content) => setGeneration({ ...generation, files: generation.files.map((file) => file.path === activeFile.path ? { ...file, content } : file) })} /></div><PreviewFrame generation={generation} onStart={() => setGeneration({ ...generation })} /></div>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={Builder} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/project/:id" component={ProjectDetail} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;