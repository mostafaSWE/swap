import { Global, Injectable, Module } from "@nestjs/common";

/**
 * The outcome of a proactive moderation check.
 *
 * `scanned:false` is HONEST — it means no provider is configured and the content was
 * **NOT** proactively scanned; it is NOT a "safe/approved" verdict. Reactive
 * moderation (user reports + the listing auto-hide trigger) remains the safety net
 * until Decision D-2 selects a provider. Callers act only on `scanned && !allowed`.
 */
export interface ModerationVerdict {
  /** Whether a provider actually inspected the content. false = no provider wired. */
  scanned: boolean;
  /** Whether the content may proceed. With no provider this is `true` (pass-through),
   *  which means "un-scanned", never "vouched safe". */
  allowed: boolean;
  /** Categories the provider flagged (empty when not scanned). */
  flagged: string[];
  /** The provider that produced this verdict; "none" until D-2 wires a real one. */
  provider: string;
}

const PASS_THROUGH: ModerationVerdict = { scanned: false, allowed: true, flagged: [], provider: "none" };

/**
 * Provider-agnostic proactive content-moderation boundary (Apple 1.2 "filter" pillar
 * / Google UGC moderation). This is the single seam a moderation provider plugs into
 * — see `docs/d2-content-moderation.md` for the option comparison + recommendation.
 *
 * **Today it is a documented NO-OP:** every call returns a `scanned:false`
 * pass-through, so behaviour is unchanged and nothing is falsely marked approved.
 * When D-2 is decided, replace the two method bodies with the chosen provider
 * (e.g. OpenAI omni-moderation for text, AWS Rekognition / Google Vision for images)
 * and act on the verdict at the call sites (listing create/update, message send,
 * image upload). Callers already tolerate the pass-through, so wiring a real provider
 * is localized here.
 */
@Injectable()
export class ContentModerationService {
  /** Scan user-authored text (listing title/description, message body, note, review). */
  async checkText(_text: string): Promise<ModerationVerdict> {
    // TODO(D-2): call the selected text provider; map its response to ModerationVerdict.
    return PASS_THROUGH;
  }

  /** Scan a user-uploaded image by URL (listing photo, avatar). */
  async checkImage(_imageUrl: string): Promise<ModerationVerdict> {
    // TODO(D-2): call the selected image provider (+ a separate CSAM hash-match path).
    return PASS_THROUGH;
  }
}

@Global()
@Module({
  providers: [ContentModerationService],
  exports: [ContentModerationService],
})
export class ModerationModule {}
