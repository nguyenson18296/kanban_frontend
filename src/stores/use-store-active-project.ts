import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveProjectStore {
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;
}

/**
 * The currently selected project (shown in the sidebar ProjectSwitcher).
 * Persisted so the selection survives a reload; holds only a project id —
 * no tokens/PII. Synced from the URL in the /projects/$projectId routes'
 * `beforeLoad`, so a deep link always wins over the stored value.
 */
export const useStoreActiveProject = create<ActiveProjectStore>()(
  persist(
    (set) => ({
      activeProjectId: null,
      // Always build a new object so referential equality drives re-renders.
      setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
    }),
    { name: 'active-project-store', version: 1 },
  ),
);
