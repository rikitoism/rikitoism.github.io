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

## Guestbook setup

After running `supabase/schema.sql`, run
`supabase/migrations/guestbook-upgrade.sql` in the Supabase SQL editor. The
guestbook page is `guestbook.html`; new notes remain private until approved in
the guestbook module on `admin.html`. If the guestbook migration was already
run, run its updated version again to add optional emoji feelings to the table
and submission function, and to enable the private Hidden moderation state.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` deploys the site automatically
when changes are pushed to `main`. In the repository settings, set **Pages >
Build and deployment > Source** to **GitHub Actions**.
