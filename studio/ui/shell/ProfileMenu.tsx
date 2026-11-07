'use client';

import { Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger } from '@heroui/react';

import { displayNameOf, useSessionUser } from '@/studio/lib/session-user';

import { Icon } from '../icons';
import { siteInitials } from './site-identity';

/** Menu profil: info akun (read-only) dan Keluar (`/auth/logout`). */
export function ProfileMenu() {
  const user = useSessionUser();
  const name = displayNameOf(user);

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button
          type="button"
          aria-label={`Menu akun ${name}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-default-200 text-sm font-bold text-default-700 hover:bg-default-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true">{siteInitials(name)}</span>
        </button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Menu akun">
        <DropdownSection title="Akun" showDivider>
          <DropdownItem key="profile" isReadOnly textValue={name} description={user?.email} className="cursor-default">
            {name}
          </DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem
            key="logout"
            href="/auth/logout"
            color="danger"
            className="text-danger"
            startContent={<Icon name="logout" size={16} />}
          >
            Keluar
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
