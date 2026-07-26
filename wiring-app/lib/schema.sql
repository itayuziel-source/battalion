PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  employee_no TEXT NOT NULL,
  job_title TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker','inspector','manager'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  station_name TEXT NOT NULL,
  work_number TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  progress REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wiring_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  received_date TEXT NOT NULL,
  mapping_status TEXT NOT NULL DEFAULT 'new' CHECK (mapping_status IN ('new','uploaded','extracting','review','approved')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS set_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id INTEGER NOT NULL REFERENCES wiring_sets(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS extracted_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id INTEGER NOT NULL REFERENCES wiring_sets(id),
  cabinet_no TEXT NOT NULL,
  cable_no TEXT NOT NULL,
  wire_no TEXT NOT NULL,
  cable_type TEXT NOT NULL DEFAULT '',
  source_cabinet TEXT NOT NULL DEFAULT '',
  source_terminal TEXT NOT NULL DEFAULT '',
  dest_cabinet TEXT NOT NULL DEFAULT '',
  dest_terminal TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  valid INTEGER NOT NULL DEFAULT 1,
  error_msg TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cabinets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  set_id INTEGER REFERENCES wiring_sets(id),
  cabinet_no TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','pending_check','done','issue')),
  total_cables INTEGER NOT NULL DEFAULT 0,
  completed_cables INTEGER NOT NULL DEFAULT 0,
  progress REAL NOT NULL DEFAULT 0,
  assignee_id INTEGER REFERENCES users(id),
  started_at TEXT,
  finished_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cabinet_id INTEGER NOT NULL REFERENCES cabinets(id),
  cable_no TEXT NOT NULL,
  source_cabinet TEXT NOT NULL DEFAULT '',
  dest_cabinet TEXT NOT NULL DEFAULT '',
  cable_type TEXT NOT NULL DEFAULT '',
  wire_count INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','pending_check','done','issue')),
  completed_by INTEGER REFERENCES users(id),
  completed_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  checked INTEGER NOT NULL DEFAULT 0,
  checked_by INTEGER REFERENCES users(id),
  checked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cable_id INTEGER NOT NULL REFERENCES cables(id),
  wire_no TEXT NOT NULL,
  source_cabinet TEXT NOT NULL DEFAULT '',
  source_terminal TEXT NOT NULL DEFAULT '',
  dest_cabinet TEXT NOT NULL DEFAULT '',
  dest_terminal TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  completed INTEGER NOT NULL DEFAULT 0,
  completed_by INTEGER REFERENCES users(id),
  completed_at TEXT,
  has_deviation INTEGER NOT NULL DEFAULT 0,
  deviation_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS deviations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  cabinet_id INTEGER NOT NULL REFERENCES cabinets(id),
  cable_id INTEGER REFERENCES cables(id),
  wire_id INTEGER REFERENCES wires(id),
  description TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  reported_by INTEGER NOT NULL REFERENCES users(id),
  reported_at TEXT NOT NULL DEFAULT (datetime('now')),
  image_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','approved','rejected')),
  manager_response TEXT NOT NULL DEFAULT '',
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  entity_label TEXT NOT NULL DEFAULT '',
  old_value TEXT NOT NULL DEFAULT '',
  new_value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cables_cabinet ON cables(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_wires_cable ON wires(cable_id);
CREATE INDEX IF NOT EXISTS idx_rows_set ON extracted_rows(set_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
