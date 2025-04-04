import type { SvelteComponent, SvelteComponentTyped } from 'svelte'

type HoverableOptions<TProps> = {
  hoverDelay?: number
  leaveDelay?: number
  popupContent: (props: TProps) => SvelteComponent | string
}

interface ComponentConstructorOptions {
  target: HTMLElement
  anchor?: HTMLElement
  props?: Record<string, any>
  context?: Map<any, any>
  hydrate?: boolean
  intro?: boolean
}

export function withHover<
  T extends SvelteComponentTyped,
  P extends Record<string, any> = ComponentProps<T>
>(
  WrappedComponent: new (options: ComponentConstructorOptions) => T,
  hoverOptions: HoverableOptions<P>
) {
  return class HoverableWrapper extends SvelteComponent {
    constructor(options: ComponentConstructorOptions) {
      super(options)

      return new Hoverable({
        ...options,
        props: {
          hoverDelay: hoverOptions.hoverDelay,
          leaveDelay: hoverOptions.leaveDelay,
          $$slots: {
            trigger: () => new WrappedComponent({ ...options }),
            popup: () => hoverOptions.popupContent(options.props as P)
          },
          $$scope: {}
        }
      })
    }
  }
}

// Helper type to extract props from a Svelte component
type ComponentProps<T> = T extends SvelteComponentTyped<infer P> ? P : never
