-- Totals for XP card November 2025
with params as (
  select
    '9fad4881-65a9-4e38-ad75-b707ddff473f'::uuid as org_id,
    '2025-11-01'::date as month_start,
    '2025-11-30'::date as month_end,
    'b1cddadb-078c-453d-a5bb-a54c60abc8f1'::uuid as card_id
),
xp_expenses as (
  select
    e.amount,
    gc.start_date,
    gc.end_date,
    case
      when c.billing_day is null then gc.end_date
      when c.billing_day < extract(day from gc.end_date)
        then (date_trunc('month', gc.end_date) + interval '1 month' + (c.billing_day - 1) * interval '1 day')::date
      else
        (date_trunc('month', gc.end_date) + (c.billing_day - 1) * interval '1 day')::date
    end as due_date
  from expenses e
  join cards c on c.id = e.card_id
  join lateral get_billing_cycle(e.card_id, e.date) gc on true
  where e.organization_id = (select org_id from params)
    and e.status = 'confirmed'
    and e.payment_method = 'credit_card'
    and e.card_id = (select card_id from params)
),
totals as (
  select 'tooltip_total'::text as origin, sum(amount) as total
  from xp_expenses
  where due_date between '2025-11-01' and '2025-11-30'

  union all

  select 'modal_total'::text as origin, sum(amount) as total
  from xp_expenses
  where start_date between '2025-11-01' and '2025-11-30'
)
select * from totals;

-- Detailed transactions for the XP card with due date in November 2025
select
  e.id,
  e.description,
  e.amount,
  e.date,
  gc.start_date,
  gc.end_date,
  case
    when c.billing_day is null then gc.end_date
    when c.billing_day < extract(day from gc.end_date)
      then (date_trunc('month', gc.end_date) + interval '1 month' + (c.billing_day - 1) * interval '1 day')::date
    else
      (date_trunc('month', gc.end_date) + (c.billing_day - 1) * interval '1 day')::date
  end as due_date
from expenses e
join cards c on c.id = e.card_id
join lateral get_billing_cycle(e.card_id, e.date) gc on true
where e.organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
  and e.status = 'confirmed'
  and e.payment_method = 'credit_card'
  and e.card_id = 'b1cddadb-078c-453d-a5bb-a54c60abc8f1'
  and (
    case
      when c.billing_day is null then gc.end_date
      when c.billing_day < extract(day from gc.end_date)
        then (date_trunc('month', gc.end_date) + interval '1 month' + (c.billing_day - 1) * interval '1 day')::date
      else
        (date_trunc('month', gc.end_date) + (c.billing_day - 1) * interval '1 day')::date
    end
  ) between '2025-11-01' and '2025-11-30'
order by e.date;
