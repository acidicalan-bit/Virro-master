
alter table public.image_evidence
  add column if not exists changed_pixel_ratio_total numeric(10, 9) not null default 0
    check (changed_pixel_ratio_total between 0 and 1),
  add column if not exists changed_pixel_ratio_inside numeric(10, 9) not null default 0
    check (changed_pixel_ratio_inside between 0 and 1),
  add column if not exists changed_pixel_ratio_outside numeric(10, 9) not null default 0
    check (changed_pixel_ratio_outside between 0 and 1);

comment on column public.image_evidence.changed_pixel_ratio_total is 'Fraction of total pixels with diff > threshold.';
comment on column public.image_evidence.changed_pixel_ratio_inside is 'Fraction of ROI pixels with diff > threshold.';
comment on column public.image_evidence.changed_pixel_ratio_outside is 'Fraction of outside-ROI pixels with diff > threshold.';
