CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties (id),
  number text NOT NULL,
  room_type text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('vacant_clean', 'vacant_dirty', 'occupied', 'out_of_order')
  ),
  UNIQUE (property_id, number)
);

CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text
);

-- A stay occupies [check_in, check_out). The checkout morning is free for the next guest.
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms (id),
  guest_id uuid NOT NULL REFERENCES guests (id),
  check_in date NOT NULL,
  check_out date NOT NULL,
  status text NOT NULL CHECK (
    status IN ('booked', 'checked_in', 'checked_out', 'cancelled')
  ),
  CHECK (check_out > check_in)
);

CREATE INDEX reservations_room_active_dates
  ON reservations (room_id, check_in, check_out)
  WHERE status <> 'cancelled';

CREATE TABLE folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations (id),
  status text NOT NULL CHECK (status IN ('open', 'closed'))
);

CREATE TABLE folio_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id uuid NOT NULL REFERENCES folios (id),
  kind text NOT NULL CHECK (kind IN ('charge', 'payment')),
  description text NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms (id),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'done')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
