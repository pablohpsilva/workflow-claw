import React from "react";
import VaultStatusPill from "../VaultStatusPill";

export default function AppHeader({ vaultUnlocked }: { vaultUnlocked: boolean }) {
  return (
    <header
      data-testid="app-header"
      className="flex items-center justify-between border-b border-slate/10 bg-white/70 px-8 py-6 backdrop-blur"
    >
      <div data-testid="header-left" className="flex flex-col">
        <h1 data-testid="header-title" className="font-display text-2xl font-semibold tracking-tight">
          Workflow Claw
        </h1>
        <p data-testid="header-subtitle" className="text-sm text-slate/60">
          Orchestrate local LLM workflows with clean context.
        </p>
      </div>
      <div data-testid="header-right" className="flex items-center gap-2">
        <span data-testid="header-lock-label" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/50">
          Vault
        </span>
        <VaultStatusPill unlocked={vaultUnlocked} />
      </div>
    </header>
  );
}
