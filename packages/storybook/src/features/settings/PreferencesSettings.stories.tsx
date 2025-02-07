import { PreferencesSettings } from "@argent-x/extension/src/ui/features/settings/preferences/PreferencesSettings"

import { decorators } from "../../decorators/routerDecorators"

export default {
  component: PreferencesSettings,
  decorators,
  parameters: {
    layout: "fullscreen",
  },
}

export const Default = {
  args: {
    nftMarketplace: {
      title: "Foo",
    },
    blockExplorer: {
      title: "Bar",
    },
  },
}
