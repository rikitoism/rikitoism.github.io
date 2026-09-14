-- Optional: restore the original static Creations cards as editable records.
insert into public.creations
  (slug, category, status_label, title, short_description, tags, status, body)
select source.slug, source.category::public.creation_category, source.status_label,
       source.title, source.short_description, source.tags, 'published',
       '[]'::jsonb
from (
  values
    ('first-semester-research-idea','physics-research','in progress','first-semester research idea','An early idea I''m chasing for a small research or competition project. Details still forming.',array['physics','research']::text[]),
    ('physics-sandbox','physics-research','experiment','physics sandbox','Simulating gravity badly, on purpose, to see what breaks first.',array['simulation','curiosity']::text[]),
    ('poetry-fragments','writing','in progress','poetry fragments','Small pieces about life, reality, strange questions, and the things that refuse to leave my head.',array['poetry','human insight']::text[]),
    ('stories-and-scripts','writing','experiment','stories and scripts','Characters, scenes, and half-formed worlds waiting for a more organized version of me.',array['storytelling','scripts']::text[]),
    ('short-animation-studies','animation','in progress','short animation studies','Frame-by-frame tests, motion experiments, and four seconds of decent animation that still counts.',array['2D animation','motion studies']::text[]),
    ('illustration-archive','animation','experiment','illustration archive','Sketches, character ideas, and visual notes from the imagination department.',array['illustration','visual development']::text[]),
    ('this-website','code','in progress','this website','Being rebuilt, restyled, and re-argued-with on a near-weekly basis.',array['HTML','CSS','JavaScript']::text[]),
    ('generative-doodles','code','experiment','generative doodles','A script that draws random little creatures. Half of them look concerning.',array['creative code','play']::text[]),
    ('the-productivity-app','abandoned','RIP','the productivity app','Died of scope creep. Survived by seventeen unfinished features.',array[]::text[]),
    ('podcast-one-episode','abandoned','RIP','a podcast with one episode','The audio quality was the least of its problems.',array[]::text[])
) as source(slug, category, status_label, title, short_description, tags)
where not exists (select 1 from public.creations existing where existing.slug = source.slug);
