import React from "react";
import Section from "../ui/Section";
import Field from "../ui/Field";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";
import VaultStatusPill from "../VaultStatusPill";

export default function VaultSection({
  vaultUnlocked,
  passphrase,
  setPassphrase,
  handleUnlock,
  handleLock
}: {
  vaultUnlocked: boolean;
  passphrase: string;
  setPassphrase: (value: string) => void;
  handleUnlock: () => void;
  handleLock: () => void;
}) {
  return (
    <Section title="Vault" testId="section-vault">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate/80">Vault status</p>
          <p data-testid="vault-description" className="text-xs text-slate/60">
            Unlock to edit providers, folders, and workflows. You can still run workflows while locked.
          </p>
        </div>
        <VaultStatusPill unlocked={vaultUnlocked} />
      </div>
      {!vaultUnlocked ? (
        <>
          <Field
            label="Passphrase"
            value={passphrase}
            onChange={setPassphrase}
            placeholder="Enter vault passphrase"
            testId="vault-passphrase"
            type="password"
          />
          <PrimaryButton label="Unlock Vault" onClick={handleUnlock} testId="vault-unlock-button" />
        </>
      ) : (
        <GhostButton label="Lock Vault" onClick={handleLock} testId="vault-lock-button" />
      )}
    </Section>
  );
}
