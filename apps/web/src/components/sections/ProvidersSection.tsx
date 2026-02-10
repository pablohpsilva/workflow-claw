import React from "react";
import { Provider } from "../../types";
import Section from "../ui/Section";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";
import EmptyState from "../ui/EmptyState";

export default function ProvidersSection({
  providers,
  configLocked,
  openAddProviderModal,
  openEditProviderModal,
  handleDeleteProvider
}: {
  providers: Provider[];
  configLocked: boolean;
  openAddProviderModal: () => void;
  openEditProviderModal: (provider: Provider) => void;
  handleDeleteProvider: (id: string) => void;
}) {
  return (
    <Section title="Providers" testId="section-providers">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate/80">Providers</p>
          <p className="text-xs text-slate/60">Add providers to power your workflows.</p>
        </div>
        <PrimaryButton
          label="Add Provider"
          onClick={openAddProviderModal}
          testId="provider-open-add"
          disabled={configLocked}
        />
      </div>
      <div data-testid="provider-list" className="space-y-2">
        {providers.length === 0 ? (
          <EmptyState
            title="No providers yet"
            description="Add your first provider to start building workflows."
            testId="provider-empty-state"
          />
        ) : (
          providers.map((provider) => (
            <div
              data-testid={`provider-card-${provider.id}`}
              key={provider.id}
              className="rounded-lg border border-slate/10 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p data-testid={`provider-card-${provider.id}-name`} className="text-sm font-semibold">
                    {provider.name}
                  </p>
                  <p data-testid={`provider-card-${provider.id}-cli`} className="text-xs text-slate/60">
                    {provider.cliCommand}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <GhostButton
                    label="Edit"
                    onClick={() => openEditProviderModal(provider)}
                    testId={`provider-card-${provider.id}-edit`}
                    disabled={configLocked}
                  />
                  <GhostButton
                    label="Delete"
                    onClick={() => handleDeleteProvider(provider.id)}
                    testId={`provider-card-${provider.id}-delete`}
                    disabled={configLocked}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
