export const translateCB = jest.fn(
  (
    label: string,
    params: Record<string, unknown>,
    language: string | undefined,
    onTranslated: (title: string) => void
  ): void => {}
)
