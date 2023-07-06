import type { StoryObj } from '@storybook/svelte';
import { Button } from '@hcengineering/ui';
import uiPlugin from '@hcengineering/ui';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'label description',
      table: {
        type: { summary: 'IntlString | undefined' },
        defaultValue: { summary: 'undefined' },
      }
    },
    kind: {
      control: 'select',
      options: ['accented', 'regular', 'no-border', 'ghost', 'link', 'link-bordered', 'dangerous', 'list', 'list-header'],
      description: 'kind description',
      table: {
        type: { summary: 'ButtonKind' },
        defaultValue: { summary: '"regular"' },
      }
    },
    size: {
      control: 'select',
      options: ['inline', 'small', 'medium', 'large', 'x-large'],
      description: 'size description',
      table: {
        type: { summary: 'ButtonSize' },
        defaultValue: { summary: '"medium"' },
      }
    },
    shape: {
      control: 'select',
      options: ['rectangle', 'rectangle-left', 'rectangle-right', 'circle', 'round', undefined],
      description: 'shape description',
      table: {
        type: { summary: 'ButtonShape | undefined' },
        defaultValue: { summary: 'undefined' },
      }
    },
    justify: {
      control: 'inline-radio',
      options: ['left', 'center'],
      description: 'justify description',
      table: {
        type: { summary: '"left" | "center"' },
        defaultValue: { summary: '"center"' },
      }
    },
    disabled: {
      control: 'boolean',
      description: 'disabled description',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      }
    },
    loading: {
      control: 'boolean',
      description: 'loading description',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      }
    },
    width: {
      control: 'text',
      description: 'width description',
      table: {
        type: { summary: 'string | undefined' },
        defaultValue: { summary: 'undefined' },
      }
    },
    height: {
      control: 'text',
      description: 'height description',
      table: {
        type: { summary: 'string | undefined' },
        defaultValue: { summary: 'undefined' },
      }
    },
    title: {
      control: 'text',
      description: 'title description',
      table: {
        type: { summary: 'string | undefined' },
        defaultValue: { summary: 'undefined' },
      }
    },
    borderStyle: {
      control: 'inline-radio',
      options: ['solid', 'dashed'],
      description: 'borderStyle description',
      table: {
        type: { summary: '"solid" | "dashed"' },
        defaultValue: { summary: '"solid"' },
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {
  args: {
    label: uiPlugin.string.Ok,
    kind: 'accented',
    size: 'medium',
    shape: undefined,
    justify: 'left',
    disabled: false,
    loading: false,
    width: undefined,
    height: undefined,
    title: 'This is a button',
    borderStyle: 'dashed'
  },
};

export const Cancel: Story = {
  args: {
    label: uiPlugin.string.Cancel,
    kind: 'accented',
    size: 'medium',
    shape: undefined,
    justify: 'left',
    disabled: false,
    loading: false,
    width: undefined,
    height: undefined,
    title: 'This is a button',
    borderStyle: 'dashed'
  },
};
