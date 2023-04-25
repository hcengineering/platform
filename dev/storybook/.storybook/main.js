/** @type { import('@storybook/svelte-webpack5').StorybookConfig } */

const config = {
  webpackFinal: async (config) => {
    config.module.rules.find(r => r.loader && r.loader.includes('svelte-loader')).options.preprocess = require('svelte-preprocess')();
    config.resolve.alias['@hcengineering/platform-rig/profiles/ui/svelte'] = require('path').resolve('../../common/temp/node_modules', 'svelte');
    return config;
  },
  stories: ['../stories/**/*.stories.@(js|ts|svelte)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    {
      name: "@storybook/addon-styling",
      options: {
        sass: {
          implementation: require("sass"),
        },
      },
    },
    'storybook-addon-themes'
  ],
  framework: {
    name: '@storybook/svelte-webpack5',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
};

export default config;
