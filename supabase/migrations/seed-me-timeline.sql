-- Optional: copy the original Me timeline into the editable site settings.
insert into public.site_settings (key, value)
values (
  'me_timeline',
  '{
    "eyebrow": "the whole thing, fast",
    "title": "life in a nutshell",
    "intro": "Every event below can be clicked open, if you''re curious. Most of them are true. All of them are exaggerated slightly.",
    "events": [
      {"year":"200X","title":"spawned into existence","body":"Arrived with no instructions and a strong opinion about everything, somehow.","bodyLink":""},
      {"year":"200X","title":"discovered computers","body":"Turned one on. Never really turned it back off.","bodyLink":""},
      {"year":"201X","title":"discovered art","body":"Drew a very wobbly horse. Was told it looked like a dog. Kept going anyway.","bodyLink":""},
      {"year":"201X","title":"discovered physics","body":"Learned that everything is just particles pretending to be things, and never recovered.","bodyLink":""},
      {"year":"201X","title":"became obsessed with space","body":"Realised the sky is mostly empty and got weirdly emotional about it.","bodyLink":""},
      {"year":"202X","title":"made questionable life decisions","body":"Several. We don''t need to list them all here. See: journal.","bodyLink":"journal.html"},
      {"year":"202X","title":"started making things","body":"Sketches, half-built apps, one very ambitious spreadsheet.","bodyLink":""},
      {"year":"now","title":"currently here","body":"Building this website, mostly. It is still very much in progress.","bodyLink":""}
    ]
  }'::jsonb
)
on conflict (key) do nothing;
