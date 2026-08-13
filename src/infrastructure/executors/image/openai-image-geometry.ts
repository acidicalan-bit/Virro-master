import type {
  ImageEditPreflightContext,
  ImageEditPreflightResult,
} from "@/src/application/ports/outcome/image-edit-executor-port";

/**
 * The bounded gpt-image-2 geometry contract used by Precision Edit.
 * This is deliberately an adapter-local profile, not a generic capability registry.
 */
export const OPENAI_GPT_IMAGE_2_GEOMETRY = {
  minPixels: 655_360,
  maxPixels: 8_294_400,
  maxEdge: 3_840,
  minDimension: 16,
  maxAspectRatio: 3,
} as const;

export function validateOpenAIImageGeometry({ sourceWidth, sourceHeight }: ImageEditPreflightContext): ImageEditPreflightResult {
  if (!Number.isSafeInteger(sourceWidth) || !Number.isSafeInteger(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return unsupported("UNSUPPORTED_OUTPUT_GEOMETRY", "Image dimensions must be positive safe integers.");
  }
  if (sourceWidth > OPENAI_GPT_IMAGE_2_GEOMETRY.maxEdge || sourceHeight > OPENAI_GPT_IMAGE_2_GEOMETRY.maxEdge) {
    return unsupported("SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER", "Source geometry exceeds the current gpt-image-2 edge limit.");
  }
  if (sourceWidth % OPENAI_GPT_IMAGE_2_GEOMETRY.minDimension !== 0 || sourceHeight % OPENAI_GPT_IMAGE_2_GEOMETRY.minDimension !== 0) {
    return unsupported("SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER", "Source dimensions must be divisible by 16 for same-geometry execution.");
  }

  const pixels = sourceWidth * sourceHeight;
  if (pixels < OPENAI_GPT_IMAGE_2_GEOMETRY.minPixels) {
    return unsupported("SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER", "Source geometry is below the current gpt-image-2 pixel minimum.");
  }
  if (pixels > OPENAI_GPT_IMAGE_2_GEOMETRY.maxPixels) {
    return unsupported("SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER", "Source geometry exceeds the current gpt-image-2 pixel maximum.");
  }

  const aspectRatio = Math.max(sourceWidth, sourceHeight) / Math.min(sourceWidth, sourceHeight);
  if (aspectRatio > OPENAI_GPT_IMAGE_2_GEOMETRY.maxAspectRatio) {
    return unsupported("SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER", "Source aspect ratio exceeds the current gpt-image-2 3:1 limit.");
  }

  return {
    status: "SUPPORTED",
    requestedWidth: sourceWidth,
    requestedHeight: sourceHeight,
    requestedSize: `${sourceWidth}x${sourceHeight}`,
  };
}

function unsupported(
  code: "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER" | "UNSUPPORTED_OUTPUT_GEOMETRY",
  reason: string,
): ImageEditPreflightResult {
  return { status: "UNSUPPORTED", code, reason };
}
