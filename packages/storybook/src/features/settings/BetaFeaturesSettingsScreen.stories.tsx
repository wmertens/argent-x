import { BetaFeaturesSettingsScreen } from "@argent-x/extension/src/ui/features/settings/developerSettings/betaFeatures/BetaFeaturesSettingsScreen"

import { decorators } from "../../decorators/routerDecorators"

export default {
  component: BetaFeaturesSettingsScreen,
  decorators,
  parameters: {
    layout: "fullscreen",
  },
}

export const Default = {
  args: {},
}
