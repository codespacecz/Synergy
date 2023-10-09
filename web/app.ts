import { Exporter, Preset, Theme } from "./lib";
import { createApp, reactive } from "petite-vue";

export function applyPreset(p: Preset) {
	let theme = new Theme(p);
	theme.apply();
	let html = document.querySelector<HTMLElement>("html");
	if(html) html.style.background = p.siteBg ?? "";
	return theme;
}

export let presets: Preset[] = [
	// {main: "#2ebdf5", text: "#ffffff", bg: "#040813"},
	// {main: "#f5b62e", text: "#ffffff", bg: "#040813"},
	// {main: "#FF6565", text: "#ffffff", bg: "#0f0413"},
	{main: "#9b8fe4", text: "#cfcef4", bg: "#090818", siteBg: "#100E22"},
	{main: "#337e2c", text: "#031601", bg: "#f3f7f2"},
	{main: "#1c71d8", text: "#030e1c", bg: "#ffffff"},
	{main: "#9141ac", text: "#613583", bg: "#f6edf7"},
	{main: "#a51d2d", text: "#3d3846", bg: "#f1e9e8"},
	{main: "#865e3c", text: "#63452c", bg: "#f9f7f4", siteBg: "#ffffff"}
];

let pr = presets[Math.floor(Math.random() * presets.length)];

let data = reactive({
	theme: applyPreset(pr),
	preset: pr,
	parts: Exporter.parts,
	presets,
	results: []
});

applyPreset(pr);

createApp({
	applyPreset(p: Preset) {
		data.results = [];
		applyPreset(p);
	},
	async generateCSS() {
		data.results = await Exporter.get(data.theme);
	},
	kbSize(value: number) {
		return `${Math.round(value/1024*100)/100} kB`;
	},
	data,
	settings: false
}).mount("#app");