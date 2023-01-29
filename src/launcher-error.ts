export class LauncherError extends Error {
  private readonly translationKey: string;

  constructor(translationKey: string, message: string) {
    super(message);
    this.translationKey = translationKey;
  }

  getTranslationKey() {
    return this.translationKey;
  }
}
