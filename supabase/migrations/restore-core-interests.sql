-- Restore the original core interests.
-- Run this once in the Supabase SQL editor.
insert into public.core_interests (eyebrow, title, description, tags, sort_order)
select source.eyebrow, source.title, source.description, source.tags, source.sort_order
from (
  values
    (
      'the big questions',
      'Physics, Astronomy & Astrophysics',
      'First-semester undergrad, chasing this properly now: projects, research, competitions, workshops, all of it. I read about this for fun, which surprises no one who knows me.',
      array['undergrad', 'research goals', 'competitions']::text[],
      1
    ),
    (
      'not academic, just obsessed',
      'Psychology & Philosophy',
      'How minds work, why people believe what they believe, different ideologies, and endless what-if scenarios. I''m more intrigued by the questions than the textbooks.',
      array['human mind', 'ideologies', 'thought experiments']::text[],
      2
    ),
    (
      'life, reality, people',
      'Poetry & Wordsmithing',
      'Writing poetry about life, reality, and human insight, plus stories, scripts, and ideas for animation. Building imagination on purpose.',
      array['poetry', 'stories', 'scripts']::text[],
      3
    ),
    (
      'since June 2025',
      'Animation & Illustration',
      'Started making animation and illustration in June 2025 and went deep into imagination and storytelling from a completely different angle.',
      array['animation', 'illustration', 'storytelling']::text[],
      4
    )
) as source(eyebrow, title, description, tags, sort_order)
where not exists (
  select 1
  from public.core_interests existing
  where existing.title = source.title
);
