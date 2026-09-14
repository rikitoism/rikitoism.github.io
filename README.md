# Rikitoism

A static personal site for thoughts, memories, influences, creations, and
unfinished ideas.

## Local preview

Serve this folder with any static web server, then open `index.html` through
that server. For example:

```text
npx serve .
```

The Supabase client uses the public placeholder values in
`js/supabase-config.js` until they are replaced with the project's public URL
and anon key.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` deploys the site automatically
when changes are pushed to `main`. In the repository settings, set **Pages >
Build and deployment > Source** to **GitHub Actions**.
