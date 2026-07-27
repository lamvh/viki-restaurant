-- Order detail that was being collected and then dropped.
--
-- `CartLine.notes` is captured in the item modal and carried through checkout,
-- but there was nowhere to store it — a customer's "no coriander" never reached
-- the kitchen. `order_items.options` already holds the chosen option labels.

alter table order_items add column if not exists notes text;

-- Counter sales take a phone number too; the column exists on orders already.
-- Index the reference lookup used by the staff order screen.
create index if not exists orders_created_at_status_idx on orders (created_at desc, status);
