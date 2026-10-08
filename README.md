# Rikitoism

**A personal website that works like a living notebook.** It holds writing, photo memories, influences, projects and a public guestbook, and it has a private admin panel so the owner can publish new things without touching code.

**Live site:** [rikitoism.github.io](https://rikitoism.github.io)

It is plain HTML, CSS and JavaScript with no build step and no framework. Content lives in a free [Supabase](https://supabase.com) project, and the site is hosted on GitHub Pages.

---

## What's on the site

| Page | What it is |
| --- | --- |
| **Home** (`index.html`) | An animated intro, a scrolling ticker and a tour of the rest of the site. |
| **Me** (`me.html`) | Who I am, plus a "whole thing, fast" timeline. |
| **Journal** (`journal.html`) | Written entries, each on its own page, written in Markdown. |
| **Memories** (`memories.html`) | Photo albums shown as polaroids, with a timeline and a gallery for each memory. |
| **Influences** (`influences.html`) | Core interests, playlists, songs that define me, and the books, films and anime that shaped me. |
| **Creations** (`creations.html`) | Projects and experiments in categories (research, writing, animation, code, abandoned). Each has its own block-based page. |
| **Guestbook** (`guestbook.html`) | Visitors leave an opinion, appreciation, confession or criticism, with an optional emoji. Notes appear on a wall only after the owner approves them. |
| **Archive** (`archive.html`) | One searchable list of everything on the site. |
| **Admin** (`admin.html`) | Private writing room for managing all of the above. It needs a login. |

The layout adapts from phones to wide screens, and the guestbook wall and photo galleries rearrange themselves to fit.

## How it works

```
Browser ──► GitHub Pages (static HTML / CSS / JS)
              │
              └─► Supabase
                    ├─ Postgres  : journal, memories, influences, creations, guestbook …
                    ├─ Auth      : one admin account
                    └─ Storage   : uploaded photos (public bucket "memory-media")
```

- **Visitors** only read published content. A visitor can write only one thing: a guestbook note, which stays hidden until approved.
- **The owner** signs in at `admin.html` and creates, edits, publishes and deletes content. Only accounts listed in the `admin_users` table can write.
- **Markdown** is rendered with [marked](https://marked.js.org/) and cleaned with [DOMPurify](https://github.com/cure53/DOMPurify) before it is shown.
- **Home and Me** page text comes from the static files in `data/`, so you can edit those directly.

## The admin panel

- One section for each kind of content: Overview, Guestbook, Journal, Memories, Timeline, Influences, Creations and Me timeline.
- A Markdown editor with a live preview. It saves drafts as you type, so a reload or a switch to another app doesn't lose your work.
- Guestbook moderation: publish a note, hide it, reply to it or delete it. There are tabs for waiting, published and hidden notes, plus search and a type filter.
- Creations can be filtered and sorted. Influences are split into four sections, each with its own "new" button.
- Deleting content asks for the admin password again.
- Photo uploads go to Supabase Storage.

## Tech stack

- HTML, CSS and vanilla JavaScript
- [Supabase](https://supabase.com): Postgres with Row Level Security, Auth and Storage
- [marked](https://marked.js.org/) and [DOMPurify](https://github.com/cure53/DOMPurify), loaded from a CDN
- GitHub Pages and GitHub Actions for hosting and deployment

## Project structure

```
.
├── index.html, me.html, journal.html, …   public pages
├── admin.html                             private admin panel
├── css/
│   ├── style.css                          the site's look
│   ├── guestbook.css                      guestbook wall and form
│   └── admin.css                          all admin-only styles
├── js/
│   ├── site-layout.js                     shared header and footer
│   ├── supabase-client.js                 creates the Supabase client
│   ├── supabase-config.example.js         copy this to supabase-config.js
│   ├── markdown-content.js                safe Markdown rendering
│   ├── admin.js                           admin module entry point
│   ├── admin/                             shared core + one module per editor
│   │   ├── core.js, guestbook.js
│   │   └── journal.js, memories.js, creations.js, influences.js …
│   └── home.js, journal.js, memories.js … one file per public page
├── data/                                  text for the Home and Me pages
├── supabase/
│   ├── schema.sql                         tables, security rules, storage
│   └── migrations/                        guestbook, upgrades and optional starter data
└── .github/workflows/pages.yml            deploys to GitHub Pages
```

## Run it yourself

You'll need a free Supabase account and a recent version of Node (only for the local preview server).

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run `supabase/schema.sql`.
3. Run `supabase/migrations/guestbook-upgrade.sql` to add the guestbook.
4. Run `supabase/migrations/journal-remove-excerpt-cover.sql` to remove the retired journal excerpt and cover-image columns from an existing project. This drops their stored values.
5. Optional: run the other files in `supabase/migrations/`.
   - `memories-upgrade.sql` and `creations-upgrade.sql` are only for projects created from an older version of the schema.
   - `restore-core-interests.sql`, `seed-creations.sql` and `seed-me-timeline.sql` add starter content.

### 2. Make yourself the admin

1. In Supabase go to **Authentication > Users** and add a user with your email and a password.
2. Copy that user's UUID and run this in the SQL editor:

   ```sql
   insert into public.admin_users (user_id) values ('YOUR-USER-UUID');
   ```

Nobody else can write to the database, even if they sign up.

### 3. Connect the site

```bash
cp js/supabase-config.example.js js/supabase-config.js
```

Open `js/supabase-config.js` and fill in your **Project URL** and **anon key** (Supabase **Project Settings > API**):

```js
window.SOUL_SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY'
};
```

> Use the **anon** key only. Never put a service-role key in this file.

### 4. Preview locally

```bash
npx serve .
```

Open the address it prints, then go to `/admin.html` to sign in.

### 5. Deploy

1. Push to `main`.
2. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.

The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`.

## Making it your own

- Change the text on the Home and Me pages in `data/home.json` and `data/me.json`.
- Change the look in `css/style.css`. Fonts and colours are defined at the top of the file.
- Change the shared header, footer and navigation in `js/site-layout.js`.
- Everything else (journal, memories, influences, creations) is written from the admin panel.

## Security notes

- The Supabase **anon key is meant to be public**. Row Level Security is what protects the data, so keep it enabled on every table.
- Public visitors can read only published content. Draft journal entries, unapproved guestbook notes and hidden notes stay private.
- Guestbook submissions go through a database function that limits each visitor to one note every 30 minutes.
- Markdown is sanitised before it reaches the page.
- Deleting content in the admin panel needs the admin password again.

## License

This is a personal website, so the writing, drawings and photos are the owner's and are not licensed for reuse.

If you'd like to use the code as a starting point for your own site, please open an issue first. The owner can add a code license (such as MIT) to the repository if that is wanted.
