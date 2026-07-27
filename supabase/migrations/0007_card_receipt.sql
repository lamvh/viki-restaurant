-- The terminal returns its own EFTPOS receipt text on completion (`Rcpt`).
-- It was landing in payment_events and nowhere else, so the printed food bill
-- could not carry it. Storing it lets one piece of paper show both what was
-- ordered and the card transaction.
alter table orders add column if not exists card_receipt text;
