'use client';

import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Chip,
} from '@heroui/react';
import Link from 'next/link';
import { useAuth } from '../hooks/use-auth';
import { useWebsites } from '../hooks/use-websites';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user } = useAuth();
  const { websites, activeWebsite, switchWebsite } = useWebsites();

  const displayName = user?.username ?? user?.email ?? 'User';
  const initials = displayName.charAt(0).toUpperCase();

  const websiteItems = websites.map((w) => ({
    key: w.website.id,
    name: w.website.name,
    role: w.role,
    isActive: activeWebsite?.website.id === w.website.id,
  }));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-default-200 bg-background/80 px-4 backdrop-blur-md">
      {/* Left: hamburger + current website */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 hover:bg-default-100 lg:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {activeWebsite && (
          <Chip variant="flat" color="primary" size="sm" className="hidden sm:flex">
            {activeWebsite.website.name}
          </Chip>
        )}
      </div>

      {/* Right: profile dropdown with website switcher */}
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-default-100">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              {activeWebsite && (
                <p className="text-xs text-default-400">
                  {activeWebsite.role} &middot; {activeWebsite.website.slug}
                </p>
              )}
            </div>
            <Avatar
              name={initials}
              size="sm"
              className="h-8 w-8 text-xs"
              color="primary"
            />
          </button>
        </DropdownTrigger>

        <DropdownMenu
          aria-label="Profile menu"
          className="w-64"
          onAction={(key) => {
            const keyStr = String(key);
            if (keyStr === 'logout') return;
            const isWebsite = websiteItems.some((w) => w.key === keyStr);
            if (isWebsite) switchWebsite(keyStr);
          }}
        >
          <DropdownSection title="Akun" showDivider>
            <DropdownItem key="profile" isReadOnly className="cursor-default opacity-100" textValue={displayName}>
              <div>
                <p className="text-sm font-semibold">{displayName}</p>
                {user?.email && (
                  <p className="text-xs text-default-400">{user.email}</p>
                )}
              </div>
            </DropdownItem>
          </DropdownSection>

          <DropdownSection title="Website" showDivider>
            {websiteItems.map((w) => (
              <DropdownItem
                key={w.key}
                textValue={w.name}
                endContent={
                  w.isActive ? (
                    <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  ) : undefined
                }
              >
                <div>
                  <p className="text-sm">{w.name}</p>
                  <p className="text-xs text-default-400">{w.role}</p>
                </div>
              </DropdownItem>
            ))}
          </DropdownSection>

          <DropdownSection>
            <DropdownItem key="logout" color="danger" href="/auth/logout" textValue="Keluar">
              Keluar
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </header>
  );
}
