import { act } from 'react';

export function clickSettingsSubnav(host: ParentNode) {
  const button = host.querySelector('[data-subnav="settings"]') as HTMLButtonElement | null;
  if (!button) throw new Error('Settings subnav button not found');
  button.click();
}

export function clickSettingsTab(host: ParentNode, domain: string) {
  const button = host.querySelector(`[data-settings-tab="${domain}"]`) as HTMLButtonElement | null;
  if (!button) throw new Error(`Settings tab "${domain}" not found`);
  button.click();
}

export async function openSettingsDomain(
  host: ParentNode,
  domain: string,
  options?: { alreadyOpen?: boolean },
) {
  if (!options?.alreadyOpen) {
    await act(async () => {
      clickSettingsSubnav(host);
    });
  }
  if (domain !== 'colors') {
    await act(async () => {
      clickSettingsTab(host, domain);
    });
  }
}
