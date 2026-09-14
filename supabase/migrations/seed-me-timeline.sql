-- Optional: copy the original Me timeline into the editable site settings.
insert into public.site_settings (key, value)
values (
  'me_timeline',
  '{
    "eyebrow": "the whole thing, fast",
    "title": "life in a nutshell",
    "intro": "Every event below can be clicked open, if you''re curious. Most of them are true. All of them are exaggerated slightly.",
    "events": [
      {"year":"200X","title":"spawned into existence","body":"Arrived with no instructions and a strong opinion about everything, somehow.","more":"","bodyLink":"","sort_order":1},
      {"year":"200X","title":"discovered computers","body":"Turned one on. Never really turned it back off.","more":"It started with a game and ended with me trying to understand how the game actually worked, which is a pattern that has never once stopped repeating.","bodyLink":"","sort_order":2},
      {"year":"201X","title":"discovered art","body":"Drew a very wobbly horse. Was told it looked like a dog. Kept going anyway.","more":"","bodyLink":"","sort_order":3},
      {"year":"201X","title":"discovered physics","body":"Learned that everything is just particles pretending to be things, and never recovered.","more":"","bodyLink":"","sort_order":4},
      {"year":"201X","title":"became obsessed with space","body":"Realised the sky is mostly empty and got weirdly emotional about it.","more":"There was a phase involving a cheap telescope, a cold balcony, and a genuinely unreasonable number of astronomy documentaries.","bodyLink":"","sort_order":5},
      {"year":"202X","title":"made questionable life decisions","body":"Several. We don''t need to list them all here. See: journal.","more":"","bodyLink":"journal.html","sort_order":6},
      {"year":"202X","title":"started making things","body":"Sketches, half-built apps, one very ambitious spreadsheet.","more":"","bodyLink":"","sort_order":7},
      {"year":"now","title":"currently here","body":"Building this website, mostly. It is still very much in progress.","more":"","bodyLink":"","sort_order":8}
    ]
  }'::jsonb
)
on conflict (key) do nothing;
