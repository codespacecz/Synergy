import { reactive } from "petite-vue";

var style = document.createElement("style");

addEventListener("load", () => {
	
	document.querySelector("head")!.appendChild(style);

});

export namespace Exporter {

	export let parts = reactive([
		{name: "Buttons", file: "button", enabled: true},
		{name: "Fields", file: "input", enabled: true},
		{name: "Toggles", file: "toggle", enabled: true},
		{name: "Checkboxes and radios", file: "checkbox", enabled: true},
		{name: "Tabs", file: "tabs", enabled: true},
	]);

	interface Result {
		name: string,
		css: string,
		size: number,
		size_gzip: number
	}

	export async function get(theme: Theme) {

		let cssParts = [theme.generate()];
		for(let p of parts) {
			if(p.enabled) {
				let value = await (await fetch(`./${p.file}.css`)).text();
				value = `/* ${p.name} */\n\n${value}`;
				cssParts.push(value);
			}
		}
		let css = cssParts.join("\n\n/* ------------------- */\n\n");

		let results: Result[] = [];
		await addResult(results, "synergy.min.css", minify(css));
		await addResult(results, "synergy.css", css);

		return results;

	}

	async function addResult(results: Result[], name: string, css: string) {
		results.push({
			name,
			css,
			size: getSize(css),
			size_gzip: await getCompressedSize(css)
		});
	}

	async function getCompressedSize(content: string) {
		let ds = new CompressionStream("gzip");
		let blob = new Blob([content]);
		let compressedStream = blob.stream().pipeThrough(ds);
		return (await new Response(compressedStream).blob()).size;
	}  

	function getSize(content: string) {
		return (new TextEncoder().encode(content)).length
	}

	function minify(value: string) {
		return value
		  .replace(/([^0-9a-zA-Z\.#])\s+/g, "$1")
		  .replace(/\s([^0-9a-zA-Z\.#]+)/g, "$1")
		  .replace(/;}/g, "}")
		  .replace(/\/\*.*?\*\//g, "");
	}

}

export interface Preset {
	main: string,
	text: string,
	bg: string,
	siteBg?: string
}

export class Color {

	r: number;
	g: number;
	b: number;
	a: number;

	constructor(r: number, g: number, b: number, a: number = 1) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	clone() {
		return new Color(this.r, this.g, this.b, this.a);
	}

	static fromHex(hex: string) {
		let [r, g, b] = this.hexToRgb(hex);
		return new Color(r, g, b);
	}

	static hexToRgb(hex: string) {
		hex = hex.replace(/^#/, '');
		const r = parseInt(hex.slice(0, 2), 16) / 255;
		const g = parseInt(hex.slice(2, 4), 16) / 255;
		const b = parseInt(hex.slice(4, 6), 16) / 255;
		return [r, g, b];
	}

	rgbFormat() {
		let rgb = `${this.r*255}, ${this.g*255}, ${this.b*255}`;
		return this.a == 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${this.a})`;
	}

	hexFormat() {
		let hex = `#${(1 << 24 | (this.r*255) << 16 | (this.g*255) << 8 | (this.b*255)).toString(16).slice(1)}`;
		return this.a != 1 ? `${hex}${(Math.floor(this.a * 255).toString(16).padStart(2, '0'))}` : hex;
	}

	contrast(otherColor: Color) {
		const getRelativeLuminance = (rgb: number) => {
		  const sRGB = rgb / 255;
		  return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
		};
		const luminance1 = getRelativeLuminance(this.r) * 0.2126 +
						   getRelativeLuminance(this.g) * 0.7152 +
						   getRelativeLuminance(this.b) * 0.0722;
		const luminance2 = getRelativeLuminance(otherColor.r) * 0.2126 +
						   getRelativeLuminance(otherColor.g) * 0.7152 +
						   getRelativeLuminance(otherColor.b) * 0.0722;
		const contrastRatio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05);
		return (contrastRatio*100)-100;
	}

	equals(otherColor: Color) {
		return this.r == otherColor.r && this.g == otherColor.g && this.b == otherColor.b;
	}

	mix(color: Color, ratio: number): Color {
		const r = Math.round(this.r*255 * (1 - ratio) + color.r*255 * ratio);
		const g = Math.round(this.g*255 * (1 - ratio) + color.g*255 * ratio);
		const b = Math.round(this.b*255 * (1 - ratio) + color.b*255 * ratio);
		return new Color(r/255, g/255, b/255);
	}

}

export class Theme {

	main: Color;
	text: Color;
	bg: Color;

	constructor(opt: Preset) {

		this.main = Color.fromHex(opt.main);
		this.text = Color.fromHex(opt.text);
		this.bg = Color.fromHex(opt.bg);

	}

	apply() {
		style.innerHTML = this.generate();
	}

	generate() {

		let variables = [];
	
		variables.push(this.var("border", this.cAlpha(this.main, .4)));
		variables.push(this.var("border-active", this.cAlpha(this.main)));
		
		variables.push(this.var("border-width", "2px"));
		variables.push(this.var("border-radius", ".375rem"))

		variables.push(this.var("focus-highlight", this.cAlpha(this.main, .25)));
		variables.push(this.var("tab-highlight", this.cAlpha(this.main, .1)));
	
		variables.push(this.var("label", this.cMix(this.main, this.bg, .8)));
		variables.push(this.var("label-active", this.cMix(this.main, this.bg)));
	
		variables.push(this.var("btn-primary-bg", this.cMix(this.main, this.bg, .8)));
		variables.push(this.var("btn-primary-bg-active", this.cMix(this.main, this.bg, .5)));
		variables.push(this.var("btn-primary-bg-hover", this.cMix(this.main, this.bg)));
	
		let btnBg = this.bg.mix(new Color(.6, .6, .6), .8).mix(this.main, .1);
		variables.push(this.var("btn-bg", this.cMix(btnBg, this.bg, .3)));
		variables.push(this.var("btn-bg-active", this.cMix(btnBg, this.bg, .6)));
		variables.push(this.var("btn-bg-hover", this.cMix(btnBg, this.bg, .4)));
	
		variables.push(this.var("text-color", this.text.hexFormat()));
		variables.push(this.var("bg", this.bg.hexFormat()));
	
		if(this.main.contrast(this.bg) < .3) alert("Contrast between main color and the background is low!");
		if(this.bg.contrast(this.text) < .3) alert("Contrast between text color and the background is low!");
	
		let styles = [`:root {\n${variables.join("\n")}\n}`];
	
		let btnColor = this.getBtnColor(this.main, this.text);
		if(btnColor != this.text) styles.push(`.btn.btn-primary {\n${this.var("text-color", btnColor.hexFormat())}\n}`);

		return styles.join("\n\n");

	}

	getBtnColor(main: Color, text: Color) {
		let white = new Color(1, 1, 1);
		let black = new Color(0, 0, 0);
		let cText = main.contrast(text);
		let cWhite = main.contrast(white);
		return cWhite > .3 ? white : cText > .3 ? text : black;
	}

	cMix(color: Color, color2: Color, ratio: number = 1) {
		let c = color2.mix(color, ratio);
		return c.hexFormat();
	}

	cAlpha(color: Color, alpha: number = 1) {
		let c = color.clone();
		c.a = alpha;
		return c.hexFormat();
	}

	var(name: string, value: string) {
		return `\t--synergy-${name}: ${value};`;
	}

}