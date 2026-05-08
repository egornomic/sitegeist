export const GITHUB_REPOSITORY = "egornomic/sitegeist";
export const GITHUB_SOURCE_URL = `https://github.com/${GITHUB_REPOSITORY}`;
export const GITHUB_RELEASES_URL = `${GITHUB_SOURCE_URL}/releases/latest`;
export const GITHUB_LICENSE_URL = `${GITHUB_SOURCE_URL}/blob/main/LICENSE`;

const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`;

interface GitHubReleaseResponse {
	tag_name?: string;
}

function parseReleaseResponse(data: unknown): GitHubReleaseResponse {
	if (!data || typeof data !== "object") return {};
	return data as GitHubReleaseResponse;
}

export function isNewerVersion(latest: string, current: string): boolean {
	const latestParts = latest.split(".").map(Number);
	const currentParts = current.split(".").map(Number);

	for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
		const latestPart = latestParts[i] || 0;
		const currentPart = currentParts[i] || 0;
		if (latestPart > currentPart) return true;
		if (latestPart < currentPart) return false;
	}
	return false;
}

export async function fetchLatestReleaseVersion(): Promise<string> {
	const response = await fetch(LATEST_RELEASE_API_URL, {
		cache: "no-cache",
		headers: {
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub release check failed with status ${response.status}`);
	}

	const data = parseReleaseResponse(await response.json());
	if (typeof data.tag_name !== "string") {
		throw new Error("GitHub release response did not include a tag name");
	}

	return data.tag_name.replace(/^v/, "");
}
