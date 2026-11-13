export {};

declare global {
  interface Window {
    __elNarration?: string[];
    __elAnnounce?: string[];
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}
