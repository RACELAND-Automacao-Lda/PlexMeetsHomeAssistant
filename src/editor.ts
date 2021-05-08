/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-env browser */
class PlexMeetsHomeAssistantEditor extends HTMLElement {
	config = {};

	setConfig = (config: Record<string, any>): void => {
		this.config = config;
	};

	configChanged = (newConfig: Record<string, any>): void => {
		const event: any = new Event('config-changed', {
			bubbles: true,
			composed: true
		});
		event.detail = { config: newConfig };
		this.dispatchEvent(event);
	};
}

export default PlexMeetsHomeAssistantEditor;
