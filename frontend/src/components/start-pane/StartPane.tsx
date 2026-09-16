import React from "react";
import { DesignSystem, Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import UnifiedInputPane from "../unified-input/UnifiedInputPane";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string,
    isAssetExtractionEnabled?: boolean
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  designSystems: DesignSystem[];
  onAddNewDesignSystem: () => void;
  onManageDesignSystems: () => void;
  onOpenScriptStudio: () => void;
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
  setSettings,
  designSystems,
  onAddNewDesignSystem,
  onManageDesignSystems,
  onOpenScriptStudio,
}) => {
  return (
    <div className="flex flex-col justify-center items-center py-8">
      <button
        onClick={onOpenScriptStudio}
        className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
      >
        🎬 Script → Scene Prompts
      </button>
      <UnifiedInputPane
        doCreate={doCreate}
        doCreateFromText={doCreateFromText}
        importFromCode={importFromCode}
        settings={settings}
        setSettings={setSettings}
        designSystems={designSystems}
        onAddNewDesignSystem={onAddNewDesignSystem}
        onManageDesignSystems={onManageDesignSystems}
      />
    </div>
  );
};

export default StartPane;
