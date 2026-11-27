-- "Submit for review" in the listing wizard: a listing waits for Moment's
-- review before it goes live. Kept in its own migration because a new enum
-- value can't be used in the transaction that adds it.
alter type public.listing_status add value if not exists 'pending_review' after 'draft';
