import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// En GitHub Actions el sitio vive en https://<usuario>.github.io/<repo>/
const [propietario, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const enActions = Boolean(process.env.GITHUB_ACTIONS && repo);
const esPaginaDeUsuario = Boolean(repo?.endsWith('.github.io'));

export default defineConfig({
  integrations: [preact()],
  site: enActions ? `https://${propietario}.github.io` : undefined,
  base: enActions && !esPaginaDeUsuario ? `/${repo}` : '/',
});
