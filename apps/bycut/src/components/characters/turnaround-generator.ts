import { getImageProvider } from "@/lib/ai/providers";
import { useAISettingsStore } from "@/stores/ai-settings-store";

const CHARACTER_PORTRAIT_PROMPT_PREFIX =
	"character portrait, front facing view, full body from head to feet, nothing cropped, arms relaxed at sides, hands naturally hanging down, white background, clean design, high quality";

export function buildCharacterPortraitPrompt({
	description,
}: {
	description: string;
}): string {
	return `${CHARACTER_PORTRAIT_PROMPT_PREFIX}, ${description}`;
}

export async function generateCharacterPortrait({
	description,
}: {
	description: string;
}): Promise<{ url: string }> {
	const { imageProviderId, imageApiKey } = useAISettingsStore.getState();

	if (!imageProviderId || !imageApiKey) {
		throw new Error(
			"No image AI provider configured. Please set up an image provider and API key in Settings.",
		);
	}

	const provider = getImageProvider({ id: imageProviderId });
	if (!provider) {
		throw new Error(`Image provider '${imageProviderId}' not found`);
	}

	const prompt = buildCharacterPortraitPrompt({ description });

	const results = await provider.generateImage({
		request: { prompt, aspectRatio: "9:16" },
		apiKey: imageApiKey,
	});

	if (results.length === 0) {
		throw new Error("No images were generated");
	}

	return { url: results[0].url };
}
