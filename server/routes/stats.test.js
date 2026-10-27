import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

// Ces tests tournent contre l'app Express réelle, en DEMO_MODE (positionné
// par vitest.config.js) — pas des mocks du routeur. Ils couvrent
// spécifiquement les régressions des bugs réels trouvés le 2026-10-27 :
// les totaux ne portaient que sur le nœud par défaut, pas tout le cluster.

describe('GET /api/stats/overview', () => {
  it('agrège les VM et LXC sur les 3 nœuds de démonstration, pas un seul', async () => {
    const res = await request(app).get('/api/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body.nodes.total).toBe(3);
    // 6 VM réparties sur 3 nœuds + 2 LXC sur pve-node-01 dans les fixtures :
    // si l'agrégation ne portait que sur le nœud par défaut ('pve', qui ne
    // correspond à aucun nœud de démo), ces totaux seraient à 0.
    expect(res.body.vms.total).toBeGreaterThan(0);
    expect(res.body.lxc.total).toBeGreaterThan(0);
    expect(res.body.vms.running + res.body.vms.stopped).toBe(res.body.vms.total);
  });
});

describe('GET /api/stats/recent-resources', () => {
  it('inclut des ressources de plusieurs nœuds différents', async () => {
    const res = await request(app).get('/api/stats/recent-resources?limit=100');
    expect(res.status).toBe(200);
    const nodesSeen = new Set(res.body.map((r) => r.node));
    expect(nodesSeen.size).toBeGreaterThan(1);
  });

  it('respecte ?limit=', async () => {
    const res = await request(app).get('/api/stats/recent-resources?limit=2');
    expect(res.body.length).toBeLessThanOrEqual(2);
  });
});

describe('GET /api/stats/activity', () => {
  it('fusionne les tâches de plusieurs nœuds, triées par date décroissante', async () => {
    const res = await request(app).get('/api/stats/activity?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const times = res.body.map((t) => t.starttime);
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });
});
