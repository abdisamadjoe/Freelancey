'use client';

import { SearchIcon } from '@/components/common/header/icons';
import { useNav } from '@/components/common/sidebar/nav-context';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/tailgrids/core/input-group';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchItem {
    id: string;
    title: string;
    parentTitle?: string;
    section: string;
    url: string;
    icon?: React.ReactNode;
}

const MIN_QUERY_LENGTH = 2;

interface SearchResults {
    projects: { id: string; name: string; status: string }[];
    tasks: { id: string; title: string; projectId: string; project: { name: string } }[];
    files: { id: string; filename: string; projectId: string; project: { name: string } }[];
    clients: { id: string; company: string | null; user: { name: string; email: string } }[];
}

export default function SearchBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { navData } = useNav();
    const debouncedQuery = useDebounce(query, 300);

    // Start fresh every time the palette opens.
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults(null);
        }
    }, [open]);

    // Search projects, tasks, files and people as the user types.
    useEffect(() => {
        if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
            setResults(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        apiFetch<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
            .then((data) => {
                if (!cancelled) setResults(data);
            })
            .catch(() => {
                if (!cancelled) setResults(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    // Keyboard shortcut listener (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Parse the nav into searchable items grouped by section
    const { itemsBySection } = useMemo(() => {
        const sectionsMap: Record<string, SearchItem[]> = {};

        navData.forEach((section) => {
            const sectionLabel = section.label || 'PAGES';

            section.items.forEach((item) => {
                if (item.url) {
                    if (!sectionsMap[sectionLabel]) {
                        sectionsMap[sectionLabel] = [];
                    }
                    sectionsMap[sectionLabel].push({
                        id: item.url,
                        title: item.title,
                        section: sectionLabel,
                        url: item.url,
                        icon: item.icon,
                    });
                }

                if (item.items && item.items.length > 0) {
                    item.items.forEach((subItem) => {
                        if (subItem.url) {
                            if (!sectionsMap[sectionLabel]) {
                                sectionsMap[sectionLabel] = [];
                            }
                            sectionsMap[sectionLabel].push({
                                id: subItem.url,
                                title: subItem.title,
                                parentTitle: item.title,
                                section: sectionLabel,
                                url: subItem.url,
                                icon: item.icon,
                            });
                        }
                    });
                }
            });
        });

        return { itemsBySection: sectionsMap };
    }, [navData]);

    // Pages whose name matches what was typed (all of them while the box is empty).
    const pageGroups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return Object.entries(itemsBySection)
            .map(([label, rows]) => [
                label,
                rows.filter((r) =>
                    `${r.parentTitle ?? ''} ${r.title}`.toLowerCase().includes(needle),
                ),
            ] as const)
            .filter(([, rows]) => rows.length > 0);
    }, [itemsBySection, query]);

    const dataGroups = useMemo(() => {
        if (!results) return [];
        return [
            {
                heading: 'Projects',
                rows: results.projects.map((p) => ({
                    key: `project-${p.id}`,
                    href: `/dashboard/projects/${p.id}`,
                    label: p.name,
                    sublabel: p.status,
                })),
            },
            {
                heading: 'Tasks',
                rows: results.tasks.map((t) => ({
                    key: `task-${t.id}`,
                    href: `/dashboard/projects/${t.projectId}`,
                    label: t.title,
                    sublabel: t.project.name,
                })),
            },
            {
                heading: 'Files',
                rows: results.files.map((f) => ({
                    key: `file-${f.id}`,
                    href: `/dashboard/projects/${f.projectId}`,
                    label: f.filename,
                    sublabel: f.project.name,
                })),
            },
            {
                heading: 'People',
                rows: results.clients.map((c) => ({
                    key: `client-${c.id}`,
                    href: '/dashboard/clients',
                    label: c.user.name,
                    sublabel: c.company || c.user.email,
                })),
            },
        ].filter((g) => g.rows.length > 0);
    }, [results]);

    const hasDataResults = dataGroups.length > 0;

    const groupClass =
        'py-1.5 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-text-tertiary **:[[cmdk-group-heading]]:uppercase';
    const itemClass =
        'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-background-gray-primary data-[selected=true]:bg-background-gray-primary data-[selected=true]:text-text-primary';

    const handleSelect = (url: string) => {
        setOpen(false);
        router.push(url);
    };

    return (
        <>
            {/* Mobile trigger button (< xl) */}
            <button
                onClick={() => setOpen(true)}
                className='flex size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs transition-colors outline-none hover:bg-background-gray-primary focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 xl:hidden'
                aria-label='Open search modal'
            >
                <SearchIcon />
            </button>

            {/* Desktop trigger button (xl+) */}
            <div className='hidden xl:block'>
                <button
                    onClick={() => setOpen(true)}
                    className='w-full text-left outline-none focus:outline-none'
                    type='button'
                >
                    <InputGroup className='h-10 cursor-pointer'>
                        <InputGroupAddon
                            align='inline-start'
                            className='pr-0 text-icon-tertiary'
                        >
                            <SearchIcon />
                        </InputGroupAddon>
                        <InputGroupInput
                            placeholder='Search...'
                            className='pointer-events-none cursor-pointer pl-2 text-sm select-none'
                            readOnly
                        />
                        <InputGroupAddon align='inline-end'>
                            <div className='rounded-md border border-card-border bg-background-gray-primary/50 px-2 py-0.75 text-xs text-text-tertiary'>
                                <span className='font-medium'>⌘</span> K
                            </div>
                        </InputGroupAddon>
                    </InputGroup>
                </button>
            </div>

            {/* Command Palette Modal */}
            <Command.Dialog
                open={open}
                onOpenChange={setOpen}
                label='Global Search'
                shouldFilter={false}
                overlayClassName='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200'
                contentClassName='fixed top-1/2 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-card-border bg-card-background text-text-primary shadow-2xl overflow-hidden outline-none max-sm:max-w-[calc(100%-2rem)]'
            >
                {/* Search Header Input */}
                <div className='border-b border-card-border p-3.5'>
                    <InputGroup className='h-10'>
                        <InputGroupAddon
                            align='inline-start'
                            className='pr-0 text-icon-tertiary'
                        >
                            <SearchIcon />
                        </InputGroupAddon>
                        <Command.Input
                            value={query}
                            onValueChange={setQuery}
                            placeholder='Search pages, projects, tasks, files, people...'
                            className='w-full min-w-0 flex-1 border-none bg-transparent pl-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:ring-0 focus:outline-none'
                        />
                        <InputGroupAddon align='inline-end'>
                            <div className='rounded-md border border-card-border bg-background-gray-primary/50 px-2 py-0.75 text-xs text-text-tertiary'>
                                ESC
                            </div>
                        </InputGroupAddon>
                    </InputGroup>
                </div>

                {/* Results List */}
                <Command.List className='scrollbar-thin max-h-96 overflow-y-auto p-2'>
                    {pageGroups.length === 0 && !hasDataResults && (
                        <div className='py-8 text-center text-sm text-text-tertiary'>
                            {loading
                                ? 'Searching...'
                                : query.trim().length >= MIN_QUERY_LENGTH
                                  ? 'No results found.'
                                  : 'Type at least 2 characters to search your work.'}
                        </div>
                    )}

                    {pageGroups.map(([sectionLabel, sectionItems]) => (
                        <Command.Group
                            key={sectionLabel}
                            heading={sectionLabel}
                            className={groupClass}
                        >
                            {sectionItems.map((item) => (
                                <Command.Item
                                    key={item.id}
                                    value={`${item.section} ${item.parentTitle || ''} ${item.title} ${item.url}`}
                                    onSelect={() => handleSelect(item.url)}
                                    className={itemClass}
                                >
                                    <div className='flex min-w-0 items-center gap-3'>
                                        {item.icon && (
                                            <span className='flex size-5 shrink-0 items-center justify-center text-icon-secondary'>
                                                {item.icon}
                                            </span>
                                        )}
                                        <div className='flex items-center gap-1.5 truncate'>
                                            {item.parentTitle && (
                                                <span className='truncate font-normal text-text-tertiary'>
                                                    {item.parentTitle} /
                                                </span>
                                            )}
                                            <span className='truncate text-text-primary'>{item.title}</span>
                                        </div>
                                    </div>
                                    <div className='flex shrink-0 items-center gap-2'>
                                        <span className='hidden text-xs text-text-tertiary sm:inline'>{item.url}</span>
                                    </div>
                                </Command.Item>
                            ))}
                        </Command.Group>
                    ))}

                    {dataGroups.map((group) => (
                        <Command.Group key={group.heading} heading={group.heading} className={groupClass}>
                            {group.rows.map((row) => (
                                <Command.Item
                                    key={row.key}
                                    value={row.key}
                                    onSelect={() => handleSelect(row.href)}
                                    className={itemClass}
                                >
                                    <span className='truncate text-text-primary'>{row.label}</span>
                                    {row.sublabel && (
                                        <span className='max-w-40 shrink-0 truncate text-xs text-text-tertiary'>
                                            {row.sublabel}
                                        </span>
                                    )}
                                </Command.Item>
                            ))}
                        </Command.Group>
                    ))}
                </Command.List>

                {/* Modal Footer with navigation shortcuts */}
                <div className='flex items-center justify-between border-t border-card-border bg-background-gray-primary/40 px-4 py-2.5 text-xs text-text-tertiary'>
                    <div className='flex items-center gap-4'>
                        <span className='flex items-center gap-1'>
                            <kbd className='rounded border border-card-border bg-card-background px-1 py-0.5 font-mono text-[10px] shadow-xs'>
                                ↑
                            </kbd>
                            <kbd className='rounded border border-card-border bg-card-background px-1 py-0.5 font-mono text-[10px] shadow-xs'>
                                ↓
                            </kbd>
                            <span>Navigate</span>
                        </span>
                        <span className='flex items-center gap-1'>
                            <kbd className='rounded border border-card-border bg-card-background px-1.5 py-0.5 font-mono text-[10px] shadow-xs'>
                                ↵
                            </kbd>
                            <span>Select</span>
                        </span>
                    </div>
                    <div className='flex items-center gap-1'>
                        <kbd className='rounded border border-card-border bg-card-background px-1.5 py-0.5 font-mono text-[10px] shadow-xs'>
                            ESC
                        </kbd>
                        <span>Close</span>
                    </div>
                </div>
            </Command.Dialog>
        </>
    );
}
