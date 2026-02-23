'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PanelLeftClose, PanelLeft, Search, Github, Sun, Moon, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JamLogoOutline } from '@/components/JamLogoOutline';
import { Input } from '@/components/ui/input';
import type { NodeMetadata, NodeCategory } from '@jam-nodes/core';

interface SidebarProps {
  nodes: NodeMetadata[];
  selectedNode?: string;
  onSelect: (nodeType: string) => void;
}

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  logic: 'Logic',
  transform: 'Transform',
  integration: 'Integration',
  action: 'Action',
};

export function Sidebar({ nodes, selectedNode, onSelect }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | 'all'>('all');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('playground-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('playground-sidebar-collapsed', String(newState));
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const filteredNodes = nodes.filter((node) => {
    const matchesSearch =
      search === '' ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.type.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || node.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const groupedNodes = filteredNodes.reduce(
    (acc, node) => {
      if (!acc[node.category]) acc[node.category] = [];
      acc[node.category].push(node);
      return acc;
    },
    {} as Record<NodeCategory, NodeMetadata[]>
  );

  const categories: NodeCategory[] = ['logic', 'transform', 'integration', 'action'];

  return (
    <aside
      className={cn(
        'group/sidebar z-30 flex h-screen flex-shrink-0 flex-col gap-2 overflow-hidden',
        'border-r border-border bg-card/95 p-3.5 backdrop-blur-[48px]',
        'transition-[width] duration-200 ease-linear'
      )}
      data-collapsed={isCollapsed}
      style={{ width: isCollapsed ? '72px' : '320px' }}
    >
      {/* Main content wrapper */}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-3">
        {/* Header: Logo and collapse toggle */}
        {isCollapsed ? (
          // Collapsed: Center the logo
          <div className="flex w-full items-center justify-center">
            <button
              onClick={toggleCollapse}
              className="group/logo relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted cursor-e-resize overflow-visible"
              aria-label="Expand sidebar"
            >
              <JamLogoOutline size={22} className="transition-opacity group-hover/logo:opacity-0" />
              <PanelLeft className="h-4 w-4 absolute inset-0 m-auto opacity-0 transition-all duration-200 group-hover/logo:opacity-100 group-hover/logo:scale-110" />
            </button>
          </div>
        ) : (
          // Expanded: Logo left, collapse button right
          <div className="flex w-full items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted overflow-visible">
                <JamLogoOutline size={22} />
              </div>
              <span className="font-semibold text-foreground">
                Jam <span className="font-normal text-muted-foreground">Nodes</span>
              </span>
            </Link>
            <button
              onClick={toggleCollapse}
              className="group/toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-w-resize"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5 transition-transform duration-200 group-hover/toggle:scale-110" />
            </button>
          </div>
        )}

        {/* Search */}
        {!isCollapsed ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-8 w-full items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {/* Category filter - only when expanded */}
        {!isCollapsed && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                categoryFilter === 'all'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                  categoryFilter === cat
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {/* Node list */}
        <nav className="flex-1 overflow-y-auto overflow-x-clip">
          {isCollapsed ? (
            // Collapsed view
            <div className="flex flex-col gap-1">
              {filteredNodes.slice(0, 15).map((node) => (
                <button
                  key={node.type}
                  onClick={() => onSelect(node.type)}
                  className={cn(
                    'flex h-8 w-full items-center justify-center rounded-lg text-sm transition-colors',
                    selectedNode === node.type
                      ? 'bg-secondary text-secondary-foreground'
                      : 'hover:bg-muted'
                  )}
                  title={node.name}
                >
                  <span className="text-xs font-medium">
                    {node.name.slice(0, 2).toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            // Expanded view
            <div className="flex flex-col gap-4">
              {categories.map((category) => {
                const categoryNodes = groupedNodes[category];
                if (!categoryNodes || categoryNodes.length === 0) return null;

                return (
                  <div key={category} className="flex flex-col gap-1">
                    <div className="flex h-8 items-center px-2 text-sm text-muted-foreground">
                      {CATEGORY_LABELS[category]}
                    </div>

                    <div className="ml-4 border-l border-border pl-2 flex flex-col gap-0.5">
                      {categoryNodes.map((node) => (
                        <button
                          key={node.type}
                          onClick={() => onSelect(node.type)}
                          className={cn(
                            'flex flex-col items-start rounded-lg px-3 py-1.5 text-sm transition-colors text-left',
                            selectedNode === node.type
                              ? 'bg-secondary text-secondary-foreground'
                              : 'hover:bg-muted'
                          )}
                        >
                          <span className="truncate font-medium">{node.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {node.description.length > 50
                              ? node.description.slice(0, 50) + '...'
                              : node.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredNodes.length === 0 && (
                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                  No nodes found
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom section: Theme toggle, Docs, and GitHub */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <a
              href="https://docs.spreadjam.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Documentation"
            >
              <BookOpen className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/wespreadjam/jam-nodes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <a
                href="https://docs.spreadjam.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center gap-2 rounded-lg px-2 hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="h-4 w-4" />
                <span>Docs</span>
              </a>
              <a
                href="https://github.com/wespreadjam/jam-nodes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center gap-2 rounded-lg px-2 hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
            </div>
            {mounted && (
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
