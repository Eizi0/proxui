import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('GET /api/proxmox/resources', () => {
  it('filtre par ?type= (régression : deux routes /resources en doublon rendaient ce filtre inopérant)', async () => {
    const qemuOnly = await request(app).get('/api/proxmox/resources?type=vm');
    expect(qemuOnly.status).toBe(200);
    expect(qemuOnly.body.length).toBeGreaterThan(0);
    expect(qemuOnly.body.every((r) => r.type === 'qemu')).toBe(true);

    const lxcOnly = await request(app).get('/api/proxmox/resources?type=lxc');
    expect(lxcOnly.body.every((r) => r.type === 'lxc')).toBe(true);
  });

  it('filtre par ?node= indépendamment du type', async () => {
    const res = await request(app).get('/api/proxmox/resources?node=pve-node-02');
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.node === 'pve-node-02' || r.node === undefined)).toBe(true);
  });

  it('combine ?type= et ?node= ensemble', async () => {
    const res = await request(app).get('/api/proxmox/resources?type=vm&node=pve-node-01');
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.type === 'qemu' && r.node === 'pve-node-01')).toBe(true);
  });
});

describe('Routes VM scopées par nœud (régression du bug "toujours le nœud par défaut")', () => {
  it("GET /api/proxmox/vms/:vmid échoue sans ?node= pour une VM hors du nœud par défaut", async () => {
    // VM 102 vit sur pve-node-02 dans les fixtures ; le nœud par défaut de
    // l'environnement de test ('pve') ne correspond à aucun nœud de démo.
    const withoutNode = await request(app).get('/api/proxmox/vms/102');
    expect(withoutNode.body).toEqual({});
  });

  it('GET /api/proxmox/vms/:vmid renvoie les vraies données avec ?node=', async () => {
    const withNode = await request(app).get('/api/proxmox/vms/102?node=pve-node-02');
    expect(withNode.status).toBe(200);
    expect(withNode.body.name).toBe('web-prod-02');
  });

  it('GET /api/proxmox/vms/:vmid/config respecte aussi ?node=', async () => {
    const res = await request(app).get('/api/proxmox/vms/102/config?node=pve-node-02');
    expect(res.body.name).toBe('web-prod-02');
  });
});
