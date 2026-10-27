import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

// API schema: Magic Hour OpenAPI at 2e0bbe9; price inputs: web-app at 595e4b9.
export default defineEndpoint({
    meta: {
        displayName: "Magic Hour AI Image Generator",
        summary: "AI Image Generator",
        description:
            "AI Image Generator. Select an explicit model and resolution for a pre-run credit estimate. Model, image count, resolution and subscription tier determine availability. Monid submits once, polls the corresponding project to completion and returns project metadata with expiring download URLs. Save outputs promptly. Upload local media through /v1/files/upload-urls and use its file_path; direct asset URLs are accepted where documented.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    request: { method: "POST", path: "/v1/ai-image-generator" },
    input: {
        schema: {
            body: z
                .object({
                    name: z
                        .string()
                        .describe(
                            "Give your image a custom name for easy identification.",
                        )
                        .optional(),
                    image_count: z
                        .number()
                        .int()
                        .min(1)
                        .max(16)
                        .describe(
                            "Number of images to generate. Allowed counts depend on the selected model.",
                        ),
                    model: z.enum([
                        "z-image-turbo",
                        "gpt-image-2",
                        "qwen-image-2.1",
                        "flux-2-klein",
                        "nano-banana-2",
                        "nano-banana-2.1",
                        "nano-banana-pro",
                        "krea-2",
                        "seedream-v5-pro",
                        "nano-banana-2-lite",
                        "gpt-image-2.5-flare",
                        "seedream-v4",
                        "nano-banana",
                        "flux-schnell",
                        "seedream",
                    ]),
                    aspect_ratio: z
                        .enum(["1:1", "16:9", "9:16"])
                        .describe(
                            "The aspect ratio of the output image(s). If not specified, defaults to `1:1` (square).",
                        )
                        .optional(),
                    resolution: z.enum(["640px", "1k", "2k", "4k"]),
                    style: z
                        .object({
                            prompt: z
                                .string()
                                .min(1)
                                .describe("The prompt used for the image(s)."),
                            tool: z
                                .enum([
                                    "ai-anime-generator",
                                    "ai-art-generator",
                                    "ai-background-generator",
                                    "ai-character-generator",
                                    "ai-face-generator",
                                    "ai-fashion-generator",
                                    "ai-icon-generator",
                                    "ai-illustration-generator",
                                    "ai-interior-design-generator",
                                    "ai-landscape-generator",
                                    "ai-logo-generator",
                                    "ai-manga-generator",
                                    "ai-outfit-generator",
                                    "ai-pattern-generator",
                                    "ai-photo-generator",
                                    "ai-sketch-generator",
                                    "ai-tattoo-generator",
                                    "album-cover-generator",
                                    "animated-characters-generator",
                                    "architecture-generator",
                                    "book-cover-generator",
                                    "comic-book-generator",
                                    "dark-fantasy-ai",
                                    "disney-ai-generator",
                                    "dnd-ai-art-generator",
                                    "emoji-generator",
                                    "fantasy-map-generator",
                                    "graffiti-generator",
                                    "movie-poster-generator",
                                    "optical-illusion-generator",
                                    "pokemon-generator",
                                    "south-park-character-generator",
                                    "superhero-generator",
                                    "thumbnail-maker",
                                    "general",
                                ])
                                .describe(
                                    "The art style to use for image generation. Defaults to 'general' if not provided.",
                                )
                                .optional(),
                        })
                        .strict()
                        .describe("The art style to use for image generation."),
                })
                .strict(),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => {
            const {
                model,
                resolution,
                image_count: count,
                aspect_ratio: aspectRatio,
            } = data.input.body;
            const grid = model === "nano-banana-2" ||
                model === "nano-banana-2.1" || model === "nano-banana-pro";
            const single = model === "flux-2-klein" || model === "krea-2";
            if (
                (grid && ![1, 4, 9, 16].includes(count)) ||
                (!grid && (count > 4 || (single && count !== 1))) ||
                (grid && count > 1 && aspectRatio !== undefined &&
                    aspectRatio !== "1:1") ||
                (grid && count > 1 && resolution === "4k") ||
                (grid && count >= 9 && resolution === "2k")
            ) {
                throw new Error(
                    "Unsupported image count, aspect ratio, or resolution for the selected model.",
                );
            }
            let credits = 0;
            if (model === "nano-banana-pro") {
                if (resolution === "640px") {
                    throw new Error("Nano Banana Pro does not support 640px.");
                }
                credits = resolution === "1k"
                    ? (count === 1 ? 150 : 250)
                    : resolution === "2k"
                    ? (count === 1 ? 200 : 350)
                    : (count === 1 ? 300 : 450);
            } else if (
                model === "nano-banana-2" || model === "nano-banana-2.1"
            ) {
                credits = model === "nano-banana-2"
                    ? (count === 1
                        ? (resolution === "2k"
                            ? 150
                            : resolution === "4k"
                            ? 200
                            : 100)
                        : 200)
                    : (count === 1
                        ? (resolution === "2k"
                            ? 75
                            : resolution === "4k"
                            ? 150
                            : 50)
                        : 150);
            } else if (
                model === "gpt-image-2" || model === "gpt-image-2.5-flare"
            ) {
                credits = count * (model === "gpt-image-2" ? 50 : 100) *
                    (resolution === "640px"
                        ? 1
                        : resolution === "1k"
                        ? 2
                        : resolution === "2k"
                        ? 4
                        : 8);
            } else if (model === "seedream-v4" || model === "seedream") {
                credits = count *
                    (resolution === "2k" ? 50 : resolution === "4k" ? 60 : 40);
            } else if (model === "seedream-v5-pro") {
                if (resolution === "4k") {
                    throw new Error("Seedream 5 Pro does not support 4k.");
                }
                credits = count * (resolution === "2k" ? 150 : 75);
            } else if (
                model === "nano-banana" || model === "nano-banana-2-lite" ||
                model === "krea-2"
            ) {
                if (resolution === "2k" || resolution === "4k") {
                    throw new Error("The selected model supports up to 1k.");
                }
                credits = count * (model === "krea-2" ? 10 : 50);
            } else {
                if (resolution === "4k") {
                    throw new Error("The selected model supports up to 2k.");
                }
                credits = count * (model === "qwen-image-2.1" ? 10 : 5) *
                    (resolution === "2k" ? 2 : 1);
            }
            return { counts: { CREDIT: credits } };
        },
        evidence: ({ data, utils }) => ({
            counts: {
                CREDIT: utils.json.optionalGet(data.output, "$.status") ===
                        "complete"
                    ? (utils.json.optionalNum(
                        data.output,
                        "$.credits_charged",
                    ) ?? 0)
                    : 0,
            },
        }),
    },
});
