'use client';

export type VoiceOrbState = 'speaking' | 'listening' | 'heard' | 'idle';

function SpeakerIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function VoiceOrb({
  state,
  micDenied = false,
}: {
  state: VoiceOrbState;
  micDenied?: boolean;
}) {
  return (
    <div
      className="relative grid place-items-center"
      data-testid="voice-orb"
      data-orb-state={state}
      aria-hidden="true"
    >
      <div className={`entry-orb ${state === 'speaking' ? 'entry-orb-breath' : ''}`}>
        {state === 'speaking' ? <SpeakerIcon /> : <MicIcon />}
        {state === 'listening'
          ? [0, 1, 2].map((index) => (
              <span
                key={index}
                className="entry-orb-ring"
                style={{ animationDelay: `${index * 700}ms` }}
              />
            ))
          : null}
        {state === 'heard' ? <span className="entry-orb-heard" /> : null}
      </div>
      {micDenied ? (
        <span className="entry-mic-off">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}
