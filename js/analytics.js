/**
 * DR.BOHL — ANALYTICS
 * Thin wrapper around the Plausible queue stub defined inline in <head>
 * (script.manual.js — automatic pageview/route tracking disabled since
 * slide navigation is client-side history.replaceState, not real page
 * loads). window.plausible always exists by the time this module runs.
 */

export function trackPageview(path) {
	window.plausible('pageview', { u: `${window.location.origin}${path}` });
}

export function trackEvent(name, props) {
	window.plausible(name, props ? { props } : undefined);
}
