import { describe, it, expect } from 'vitest';
import { resolveDemoEndpoint } from './demoData.js';

describe('resolveDemoEndpoint', () => {
  it('renvoie la liste des 3 nœuds de démonstration', () => {
    const nodes = resolveDemoEndpoint('GET', '/nodes');
    expect(nodes).toHaveLength(3);
    expect(nodes.map((n) => n.node)).toEqual(['pve-node-01', 'pve-node-02', 'pve-node-03']);
  });

  it('renvoie les VM propres à chaque nœud, pas celles des autres', () => {
    const vmsNode1 = resolveDemoEndpoint('GET', '/nodes/pve-node-01/qemu');
    const vmsNode2 = resolveDemoEndpoint('GET', '/nodes/pve-node-02/qemu');
    expect(vmsNode1.map((v) => v.vmid)).toEqual(expect.arrayContaining([101, 105, 110]));
    expect(vmsNode2.map((v) => v.vmid)).toEqual([102]);
    // Pas de VM d'un nœud qui fuite sur un autre.
    expect(vmsNode2.some((v) => v.vmid === 101)).toBe(false);
  });

  it('expose à la fois `cpus` et `maxcpu` sur les VM/LXC par nœud (incohérence réelle de l\'API Proxmox entre endpoints)', () => {
    const vms = resolveDemoEndpoint('GET', '/nodes/pve-node-01/qemu');
    for (const vm of vms) {
      expect(vm.cpus).toBe(vm.maxcpu);
    }
  });

  it('/cluster/resources respecte le filtre ?type= (régression du bug de route dupliquée)', () => {
    const all = resolveDemoEndpoint('GET', '/cluster/resources');
    const onlyQemu = resolveDemoEndpoint('GET', '/cluster/resources?type=qemu');
    const onlyLxc = resolveDemoEndpoint('GET', '/cluster/resources?type=lxc');

    expect(onlyQemu.length).toBeGreaterThan(0);
    expect(onlyQemu.every((r) => r.type === 'qemu')).toBe(true);
    expect(onlyLxc.every((r) => r.type === 'lxc')).toBe(true);
    expect(onlyQemu.length + onlyLxc.length).toBeLessThan(all.length); // les nœuds eux-mêmes sont aussi dans `all`
  });

  it('résout le statut et la config d\'une VM précise par nœud + vmid', () => {
    const status = resolveDemoEndpoint('GET', '/nodes/pve-node-02/qemu/102/status/current');
    expect(status.name).toBe('web-prod-02');
    expect(status.qmpstatus).toBe(status.status);

    const config = resolveDemoEndpoint('GET', '/nodes/pve-node-02/qemu/102/config');
    expect(config.name).toBe('web-prod-02');
    expect(config.scsi0).toContain('vm-102-disk-0');
  });

  it('renvoie undefined pour un endpoint non simulé, sans lever d\'exception', () => {
    expect(resolveDemoEndpoint('GET', '/nodes/pve-node-01/something-unmapped')).toBeUndefined();
    expect(resolveDemoEndpoint('DELETE', '/nodes')).toBeUndefined();
  });

  it('renvoie les snapshots connus pour la VM 101 et une liste vide pour une VM sans snapshot', () => {
    const snaps101 = resolveDemoEndpoint('GET', '/nodes/pve-node-01/qemu/101/snapshot');
    expect(snaps101.length).toBeGreaterThan(0);
    expect(snaps101[0]).toHaveProperty('name');

    const snapsNone = resolveDemoEndpoint('GET', '/nodes/pve-node-02/qemu/102/snapshot');
    expect(snapsNone).toEqual([]);
  });
});
