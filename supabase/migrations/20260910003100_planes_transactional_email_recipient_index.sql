create index if not exists email_outbox_recipient_user_idx
  on private.email_outbox(recipient_user_id)
  where recipient_user_id is not null;
