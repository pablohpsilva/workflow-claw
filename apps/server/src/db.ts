import Database from "better-sqlite3";
import { getDbPath } from "./paths.js";

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    create table if not exists settings (
      key text primary key,
      value text not null
    );

    create table if not exists providers (
      id text primary key,
      name text not null,
      cli_command text not null,
      template text not null,
      default_model text,
      env_enc text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists folders (
      id text primary key,
      path text not null unique,
      label text,
      created_at text not null
    );

    create table if not exists workflows (
      id text primary key,
      name text not null,
      description text,
      folder_id text not null,
      execution_mode text not null,
      created_at text not null,
      updated_at text not null,
      foreign key (folder_id) references folders(id)
    );

    create table if not exists steps (
      id text primary key,
      workflow_id text not null,
      name text not null,
      description text not null,
      provider_id text not null,
      model text,
      max_iterations integer not null,
      skills_json text not null,
      success_criteria text,
      failure_criteria text,
      pos_x real not null,
      pos_y real not null,
      created_at text not null,
      updated_at text not null,
      foreign key (workflow_id) references workflows(id),
      foreign key (provider_id) references providers(id)
    );

    create table if not exists edges (
      id text primary key,
      workflow_id text not null,
      from_step_id text not null,
      to_step_id text not null,
      type text not null,
      created_at text not null,
      foreign key (workflow_id) references workflows(id)
    );

    create table if not exists runs (
      id text primary key,
      workflow_id text not null,
      status text not null,
      goal text not null,
      started_at text not null,
      ended_at text,
      foreign key (workflow_id) references workflows(id)
    );

    create table if not exists step_runs (
      id text primary key,
      run_id text not null,
      step_id text not null,
      status text not null,
      iteration integer not null,
      stdout text,
      stderr text,
      summary text,
      created_at text not null,
      foreign key (run_id) references runs(id)
    );
  `);
}
